import { mkdtemp, rm, writeFile} from "node:fs/promises";
import { tmpdir} from "node:os";
import { join} from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import { AppRunner, loadVersion, parseCliArgs, runTypeCheck, startApp} from "../cli-main";
import { loadTypeScript} from "../cli-typecheck";

// Fixture app in a tmp dir so tsImport resolves a real module
let appDir: string;
const TSCONFIG = JSON.stringify({
  compilerOptions: { strict: true, skipLibCheck: true, noEmit: true },
});

beforeAll(async () => {
  appDir = await mkdtemp(join(tmpdir(), "creact-cli-app-"));
  // ESM context — without this, tsx treats .ts fixtures as CommonJS and
  // wraps the default export
  await writeFile(join(appDir, "package.json"), '{ "type": "module" }');
  await writeFile(join(appDir, "tsconfig.json"), TSCONFIG);
  await writeFile(
    join(appDir, "app.ts"),
    `export default async function () {
  return {
    dispose() {
      const g = globalThis as any;
      g.__cliDisposeCount = (g.__cliDisposeCount ?? 0) + 1;
    },
    ready: Promise.resolve().then(() => { (globalThis as any).__cliAppReady = true; }),
  };
}
`,
  );
  await writeFile(
    join(appDir, "no-default.ts"),
    `export const notAnApp = true;\n`,
  );
  await writeFile(
    join(appDir, "no-handle.ts"),
    `export default async function () { (globalThis as any).__cliBareRan = true; }\n`,
  );
  await writeFile(
    join(appDir, "crashes.ts"),
    `export default async function () { throw new Error("app exploded"); }\n`,
  );
}, 30000);

afterAll(async () => {
  await rm(appDir, { recursive: true, force: true });
});

describe("parseCliArgs", () => {
  it.each([
    { label: "no args show help", args: [], expected: { kind: "help" } },
    { label: "--help shows help", args: ["--help"], expected: { kind: "help" } },
    { label: "-h shows help", args: ["-h"], expected: { kind: "help" } },
    {
      label: "--watch without an entrypoint is an error",
      args: ["--watch"],
      expected: { kind: "error", message: "--watch requires an entrypoint" },
    },
    {
      label: "--watch with entrypoint enables watch mode",
      args: ["--watch", "app.tsx"],
      expected: { kind: "run", watchMode: true, entrypoint: "app.tsx" },
    },
    {
      label: "-w is the short form of --watch",
      args: ["-w", "app.tsx"],
      expected: { kind: "run", watchMode: true, entrypoint: "app.tsx" },
    },
    {
      label: "a bare entrypoint runs once",
      args: ["app.tsx"],
      expected: { kind: "run", watchMode: false, entrypoint: "app.tsx" },
    },
  ])("$label", ({ args, expected }) => {
    expect(parseCliArgs(args)).toEqual(expected);
  });
});

describe("loadVersion", () => {
  it("reads the real package version", () => {
    expect(loadVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("reports 'unknown' when no layout matches", () => {
    expect(loadVersion(["./does-not-exist.json"])).toBe("unknown");
  });
});

describe("AppRunner", () => {
  it("runs the entrypoint's default export and awaits its ready promise", async () => {
    const runner = new AppRunner();
    (globalThis as any).__cliAppReady = false;

    await runner.runEntrypoint(join(appDir, "app.ts"));

    expect((globalThis as any).__cliAppReady).toBe(true);
    runner.dispose();
  }, 30000);

  it("disposes the previous app before a restart and on dispose()", async () => {
    const runner = new AppRunner();
    (globalThis as any).__cliDisposeCount = 0;

    await runner.runEntrypoint(join(appDir, "app.ts"));
    await runner.runEntrypoint(join(appDir, "app.ts")); // restart disposes run 1

    expect((globalThis as any).__cliDisposeCount).toBe(1);
    runner.dispose();
    expect((globalThis as any).__cliDisposeCount).toBe(2);
    runner.dispose(); // idempotent
    expect((globalThis as any).__cliDisposeCount).toBe(2);
  }, 30000);

  it.each([
    { label: "a module without a default export", file: "no-default.ts" },
    { label: "a default export returning no handle", file: "no-handle.ts" },
  ])("tolerates $label", async ({ file }) => {
    const runner = new AppRunner();

    await expect(
      runner.runEntrypoint(join(appDir, file)),
    ).resolves.toBeUndefined();
    runner.dispose();
  }, 30000);
});

describe("startApp", () => {
  it("reports success after the app starts", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await startApp(new AppRunner(), join(appDir, "no-handle.ts"));

      const output = logSpy.mock.calls.flat().join("\n");
      expect(output).toContain("App started");
    } finally {
      logSpy.mockRestore();
    }
  }, 30000);

  it("reports a crash without throwing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(
        startApp(new AppRunner(), join(appDir, "crashes.ts")),
      ).resolves.toBeUndefined();

      const output = logSpy.mock.calls.flat().join("\n");
      expect(output).toContain("app exploded");
    } finally {
      logSpy.mockRestore();
    }
  }, 30000);
});

describe("runTypeCheck", () => {
  it("passes a clean project", () => {
    // typescript isn't installed under /tmp — load it from this repo
    const result = runTypeCheck(join(appDir, "no-default.ts"), appDir, () =>
      loadTypeScript(process.cwd()),
    );

    expect(result).toBe(true);
  }, 30000);

  it("fails when the project has type errors", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const brokenDir = await mkdtemp(join(tmpdir(), "creact-cli-broken-"));
      await writeFile(join(brokenDir, "tsconfig.json"), TSCONFIG);
      await writeFile(
        join(brokenDir, "app.ts"),
        `const n: number = "nope";\nexport default n;\n`,
      );

      // typescript isn't installed under /tmp — load it from this repo
      const result = runTypeCheck(join(brokenDir, "app.ts"), brokenDir, () =>
        loadTypeScript(process.cwd()),
      );

      expect(result).toBe(false);
      await rm(brokenDir, { recursive: true, force: true });
    } finally {
      logSpy.mockRestore();
    }
  }, 30000);

  it("skips (and allows the run) when typescript is not installed", () => {
    expect(runTypeCheck(join(appDir, "app.ts"), tmpdir())).toBe(true);
  });

  it("skips (and allows the run) when the type checker itself throws", () => {
    const explodingTs = { findConfigFile: () => {
      throw new Error("ts internal error");
    } } as any;

    const result = runTypeCheck(join(appDir, "app.ts"), appDir, () => explodingTs);

    expect(result).toBe(true);
  });
});
