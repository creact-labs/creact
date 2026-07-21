import { mkdtemp, rm, writeFile} from "node:fs/promises";
import { tmpdir} from "node:os";
import { join} from "node:path";
import { afterAll, beforeAll, describe, expect, it} from "vitest";
import { loadTypeScript, typeCheck} from "../cli-typecheck";

// Real TypeScript compiler runs against tiny fixture projects in tmp dirs
// (tmp so findConfigFile can't accidentally pick up this repo's tsconfig).
let cleanDir: string;
let brokenDir: string;
let noConfigDir: string;
let badConfigDir: string;

const TSCONFIG = JSON.stringify({
  compilerOptions: { strict: true, skipLibCheck: true, noEmit: true },
});

beforeAll(async () => {
  cleanDir = await mkdtemp(join(tmpdir(), "creact-tc-clean-"));
  await writeFile(join(cleanDir, "tsconfig.json"), TSCONFIG);
  await writeFile(
    join(cleanDir, "app.ts"),
    `export const add = (a: number, b: number): number => a + b;\n`,
  );

  brokenDir = await mkdtemp(join(tmpdir(), "creact-tc-broken-"));
  await writeFile(join(brokenDir, "tsconfig.json"), TSCONFIG);
  await writeFile(
    join(brokenDir, "app.ts"),
    `const n: number = "not a number";\nexport default n;\n`,
  );

  noConfigDir = await mkdtemp(join(tmpdir(), "creact-tc-noconfig-"));
  await writeFile(
    join(noConfigDir, "app.ts"),
    `export const ok: string = "fine";\n`,
  );

  badConfigDir = await mkdtemp(join(tmpdir(), "creact-tc-badconfig-"));
  await writeFile(join(badConfigDir, "tsconfig.json"), "{ not valid json !!");
  await writeFile(
    join(badConfigDir, "app.ts"),
    `export const ok: string = "fine";\n`,
  );
}, 30000);

afterAll(async () => {
  for (const dir of [cleanDir, brokenDir, noConfigDir, badConfigDir]) {
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("loadTypeScript", () => {
  it("finds the project's typescript installation", () => {
    const ts = loadTypeScript(process.cwd());

    expect(ts).not.toBeNull();
    expect(typeof ts!.version).toBe("string");
  });

  it("returns null when typescript is not installed at the cwd", () => {
    expect(loadTypeScript(tmpdir())).toBeNull();
  });
});

describe("typeCheck", () => {
  const ts = () => loadTypeScript(process.cwd())!;

  it("passes a clean project and reports how much it checked", () => {
    const result = typeCheck(ts(), join(cleanDir, "app.ts"), cleanDir);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.fileCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 30000);

  it("reports each type error with file, position, code, and message", () => {
    const result = typeCheck(ts(), join(brokenDir, "app.ts"), brokenDir);

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    const err = result.errors[0]!;
    expect(err.file).toBe("app.ts");
    expect(err.line).toBe(1);
    expect(err.column).toBeGreaterThan(0);
    expect(err.code).toBe(2322); // Type 'string' is not assignable to 'number'
    expect(err.message).toContain("not assignable");
  }, 30000);

  it("checks with default options when no tsconfig exists", () => {
    const result = typeCheck(ts(), join(noConfigDir, "app.ts"), noConfigDir);

    expect(result.ok).toBe(true);
  }, 30000);

  it("falls back to default options when the tsconfig cannot be parsed", () => {
    const result = typeCheck(ts(), join(badConfigDir, "app.ts"), badConfigDir);

    expect(result.ok).toBe(true);
  }, 30000);
});
