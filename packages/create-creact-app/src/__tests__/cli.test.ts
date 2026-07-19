import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Regression guard for the "npm create" no-op bug: npm installs the bin as a
// symlink, and Node resolves ESM modules to their real path. A `import.meta.url
// === argv[1]` entry guard therefore never matched through the symlink and the
// CLI created nothing. The bin now runs unconditionally (create-vite style), so
// invoking it through a symlink — exactly how `npm create` does — must scaffold.
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cliJs = join(pkgRoot, "dist/src/cli.js");

describe("bin invoked through a symlink (like `npm create`)", () => {
  let base: string;

  beforeAll(() => {
    execSync("npm run build", { cwd: pkgRoot, stdio: "pipe" });
    base = join(tmpdir(), `cca-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(base, { recursive: true });
  }, 60_000);

  afterAll(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it("scaffolds a project when run through its bin symlink", () => {
    const link = join(base, "create-creact-app"); // mimics node_modules/.bin/…
    symlinkSync(cliJs, link);
    const target = join(base, "app");

    execFileSync("node", [link, target, "--memory=file"], { stdio: "pipe" });

    expect(existsSync(join(target, "index.tsx"))).toBe(true);
    expect(existsSync(join(target, "package.json"))).toBe(true);
  });
});
