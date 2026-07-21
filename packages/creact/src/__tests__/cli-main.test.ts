import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { spinnerMock } from "../__mocks__/mock-ora";
import * as logger from "../cli-logger";
import {
  AppRunner,
  isSourceFile,
  loadVersion,
  parseCliArgs,
  runCli,
  runTypeCheck,
  shutdown,
  startApp,
  watchLoop,
} from "../cli-main";
import { loadTypeScript } from "../cli-typecheck";

// ora renders to a TTY — CLI output goes through the shared inspectable fake
vi.mock("ora", async () =>
  (await import("../__mocks__/mock-ora")).mockOraModule(),
);

// Passthrough fs mock with one switch: lets a test make fs.watch throw a
// non-Error value (unreachable through real fs) while everything else —
// including this file's own fixture setup — stays real
const watchControl = { throwValue: undefined as unknown };
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    watch: (...args: Parameters<typeof actual.watch>) => {
      if (watchControl.throwValue !== undefined) throw watchControl.throwValue;
      return actual.watch(...args);
    },
  };
});

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

describe("isSourceFile", () => {
  it.each([
    { label: "ts files restart", filename: "app.ts", expected: true },
    { label: "tsx files restart", filename: "app.tsx", expected: true },
    { label: "js files restart", filename: "app.js", expected: true },
    { label: "jsx files restart", filename: "app.jsx", expected: true },
    { label: "other files are ignored", filename: "notes.txt", expected: false },
    { label: "null events (platform quirk) are ignored", filename: null, expected: false },
    { label: "missing filenames are ignored", filename: undefined, expected: false },
  ])("$label", ({ filename, expected }) => {
    expect(isSourceFile(filename)).toBe(expected);
  });
});

describe("shutdown", () => {
  it("stops the spinner before disposing the app (spinner swallows SIGINT)", async () => {
    const runner = new AppRunner();
    await runner.runEntrypoint(join(appDir, "app.ts"));
    (globalThis as any).__cliDisposeCount = 0;
    // simulate Ctrl+C arriving while a spinner is active
    logger.appStarting();

    shutdown(runner);

    expect(spinnerMock.stop).toHaveBeenCalled();
    expect((globalThis as any).__cliDisposeCount).toBe(1);
  }, 30000);
});

describe("runCli", () => {
  it("formats a watcher failure through the CLI logger and exits 1", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    // Injected through the fs mock: real fs.watch ENOENT rejection timing
    // varies by platform and load, so the failure is simulated instead
    watchControl.throwValue = new Error("watch target vanished");
    try {
      const code = await runCli(
        ["--watch", "app.ts"],
        appDir,
        new AppRunner(),
      );

      expect(code).toBe(1);
      const output = logSpy.mock.calls.flat().join("\n");
      expect(output).toContain("Error:");
      expect(output).toContain("watch target vanished");
    } finally {
      watchControl.throwValue = undefined;
      logSpy.mockRestore();
    }
  });

  it("stringifies non-Error watcher failures instead of crashing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    watchControl.throwValue = "watch exploded";
    try {
      const code = await runCli(
        ["--watch", "app.ts"],
        appDir,
        new AppRunner(),
      );

      expect(code).toBe(1);
      expect(logSpy.mock.calls.flat().join("\n")).toContain("watch exploded");
    } finally {
      watchControl.throwValue = undefined;
      logSpy.mockRestore();
    }
  });

  it("prints help and exits 0 with no arguments", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = await runCli([], appDir, new AppRunner());

      expect(code).toBe(0);
      expect(logSpy.mock.calls.flat().join("\n")).toContain("creact <entrypoint>");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("reports usage errors and exits 1", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const code = await runCli(["--watch"], appDir, new AppRunner());

      expect(code).toBe(1);
      expect(logSpy.mock.calls.flat().join("\n")).toContain(
        "--watch requires an entrypoint",
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it("runs the app once and exits 0", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const runner = new AppRunner();
      (globalThis as any).__cliAppReady = false;

      const code = await runCli(["app.ts"], appDir, runner);

      expect(code).toBe(0);
      expect((globalThis as any).__cliAppReady).toBe(true);
      runner.dispose();
    } finally {
      logSpy.mockRestore();
    }
  }, 30000);

  it("watch mode restarts on source changes and stops on abort", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const clearSpy = vi.spyOn(console, "clear").mockImplementation(() => {});
    try {
      const runner = new AppRunner();
      const abort = new AbortController();
      (globalThis as any).__cliDisposeCount = 0;

      const running = runCli(
        ["--watch", "app.ts"],
        appDir,
        runner,
        abort.signal,
      );
      // let the first run finish and the watcher attach
      await vi.waitFor(() => {
        expect((globalThis as any).__cliAppReady).toBe(true);
      });
      await new Promise((r) => setTimeout(r, 200));

      // a non-source file must NOT trigger a restart. Negative assertions
      // over fs.watch have no completion signal to await — a fixed window
      // is the only observation available; the positive assertion below
      // (vi.waitFor) keeps the test's overall verdict deterministic.
      await writeFile(join(appDir, "notes.txt"), "irrelevant");
      await new Promise((r) => setTimeout(r, 300));
      expect((globalThis as any).__cliDisposeCount).toBe(0);

      // a source change restarts the app (disposing the previous run) —
      // rewriting identical content still fires a change event
      const appSource = await readFile(join(appDir, "app.ts"), "utf8");
      await writeFile(join(appDir, "app.ts"), appSource);
      await vi.waitFor(
        () => {
          expect(
            (globalThis as any).__cliDisposeCount,
          ).toBeGreaterThanOrEqual(1);
        },
        { timeout: 5000 },
      );

      abort.abort();
      await expect(running).resolves.toBe(0);
      runner.dispose();
    } finally {
      logSpy.mockRestore();
      clearSpy.mockRestore();
    }
  }, 30000);
});

describe("watchLoop", () => {
  it("resolves immediately when the signal is already aborted", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const abort = new AbortController();
      abort.abort();

      await expect(
        watchLoop(new AppRunner(), join(appDir, "app.ts"), appDir, abort.signal),
      ).resolves.toBeUndefined();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("does not restart when the changed code fails the type check", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const clearSpy = vi.spyOn(console, "clear").mockImplementation(() => {});
    try {
      const dir = await mkdtemp(join(tmpdir(), "creact-cli-watchbroken-"));
      await writeFile(join(dir, "package.json"), '{ "type": "module" }');
      await writeFile(join(dir, "tsconfig.json"), TSCONFIG);
      await writeFile(
        join(dir, "app.ts"),
        `const n: number = "broken";\nexport default n;\n`,
      );
      const runner = new AppRunner();
      const abort = new AbortController();
      (globalThis as any).__cliDisposeCount = 0;

      const running = watchLoop(runner, join(dir, "app.ts"), dir, abort.signal, () =>
        loadTypeScript(process.cwd()),
      );
      await new Promise((r) => setTimeout(r, 300));

      // touching the (type-broken) app triggers the check, which fails →
      // the app must NOT be restarted
      const source = await readFile(join(dir, "app.ts"), "utf8");
      await writeFile(join(dir, "app.ts"), source);
      await vi.waitFor(
        () => {
          const output = logSpy.mock.calls.flat().join("\n");
          expect(output).toContain("app.ts");
        },
        { timeout: 5000 },
      );
      // give a would-be restart time to happen, then assert it didn't
      await new Promise((r) => setTimeout(r, 500));
      expect((globalThis as any).__cliDisposeCount).toBe(0);

      abort.abort();
      await expect(running).resolves.toBeUndefined();
      await rm(dir, { recursive: true, force: true });
    } finally {
      logSpy.mockRestore();
      clearSpy.mockRestore();
    }
  }, 30000);

  it("rethrows watcher failures (only aborts end the loop quietly)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    watchControl.throwValue = new Error("watch target vanished");
    try {
      await expect(
        watchLoop(new AppRunner(), join(appDir, "app.ts"), appDir),
      ).rejects.toThrow("watch target vanished");
    } finally {
      watchControl.throwValue = undefined;
      logSpy.mockRestore();
    }
  });
});
