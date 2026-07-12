import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TypeCheckResult } from "../src/cli-typecheck";

// ora renders to a TTY — replace it with an inspectable fake
const spinnerMock = {
  start: vi.fn(),
  stop: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  info: vi.fn(),
};
vi.mock("ora", () => ({
  default: vi.fn(() => {
    spinnerMock.start.mockReturnValue(spinnerMock);
    return { ...spinnerMock, start: () => spinnerMock };
  }),
}));

import * as logger from "../src/cli-logger";

function failedResult(errors: TypeCheckResult["errors"]): TypeCheckResult {
  return { ok: false, fileCount: 3, errors, durationMs: 120 };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let clearSpy: ReturnType<typeof vi.spyOn>;

const logged = () =>
  logSpy.mock.calls
    .map((c) => c.join(" "))
    .join("\n")
    // strip ANSI color codes for stable assertions
    .replace(/\x1b\[[0-9;]*m/g, "");

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  clearSpy = vi.spyOn(console, "clear").mockImplementation(() => {});
  vi.clearAllMocks();
  logger.stopSpinner(); // reset module spinner state between tests
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startup output", () => {
  it("banner shows the CLI name and version", () => {
    logger.banner("1.2.3");

    expect(logged()).toContain("creact");
    expect(logged()).toContain("v1.2.3");
  });

  it("help explains usage, watch mode, and the entrypoint contract", () => {
    logger.help();

    expect(logged()).toContain("creact <entrypoint>");
    expect(logged()).toContain("--watch");
    expect(logged()).toContain("render()");
  });

  it("error stops any spinner and prints the message", () => {
    logger.typeCheckStart();
    logger.error("--watch requires an entrypoint");

    expect(spinnerMock.stop).toHaveBeenCalled();
    expect(logged()).toContain("--watch requires an entrypoint");
  });
});

describe("type check reporting", () => {
  it("a pass resolves the active spinner with the file count", () => {
    logger.typeCheckStart();
    logger.typeCheckPassed(12, 1500);

    expect(spinnerMock.succeed).toHaveBeenCalledWith(
      expect.stringContaining("12 files"),
    );
  });

  it("a pass without a spinner logs directly, singular for one file", () => {
    logger.typeCheckPassed(1, 500);

    expect(logged()).toContain("Type check passed");
    expect(logged()).toContain("1 file,");
  });

  it("failures list every error location, code, and message lines", () => {
    logger.typeCheckStart();
    logger.typeCheckFailed(
      failedResult([
        {
          file: "src/app.ts",
          line: 3,
          column: 7,
          code: 2322,
          message: "Type 'string' is not assignable\nto type 'number'",
        },
        { file: "src/b.ts", line: 1, column: 1, code: 2304, message: "oops" },
      ]),
    );

    expect(spinnerMock.fail).toHaveBeenCalledWith("2 type errors");
    expect(logged()).toContain("src/app.ts:3:7");
    expect(logged()).toContain("TS2322");
    expect(logged()).toContain("to type 'number'");
    expect(logged()).toContain("src/b.ts:1:1");
  });

  it("a single failure without a spinner uses the singular label", () => {
    logger.typeCheckFailed(
      failedResult([
        { file: "a.ts", line: 1, column: 1, code: 2304, message: "nope" },
      ]),
    );

    expect(logged()).toContain("1 type error");
  });

  it.each([
    { label: "with an active spinner", spin: true },
    { label: "without a spinner", spin: false },
  ])("skips announce the reason $label", ({ spin }) => {
    if (spin) logger.typeCheckStart();

    logger.typeCheckSkipped("typescript not found in project");

    if (spin) {
      expect(spinnerMock.info).toHaveBeenCalledWith(
        expect.stringContaining("typescript not found"),
      );
    } else {
      expect(logged()).toContain("typescript not found");
    }
  });
});

describe("app lifecycle reporting", () => {
  it.each([
    { label: "with an active spinner", spin: true },
    { label: "without a spinner", spin: false },
  ])("started $label", ({ spin }) => {
    if (spin) logger.appStarting();

    logger.appStarted();

    if (spin) {
      expect(spinnerMock.succeed).toHaveBeenCalledWith("App started");
    } else {
      expect(logged()).toContain("App started");
    }
  });

  it("a crash prints the message and an indented stack", () => {
    logger.appStarting();
    const err = new Error("connection refused");

    logger.appFailed(err);

    expect(spinnerMock.fail).toHaveBeenCalledWith("App failed to start");
    expect(logged()).toContain("connection refused");
    expect(logged()).toContain("at "); // stack frames present
  });

  it("non-Error crashes are stringified without a stack", () => {
    logger.appFailed("string failure");

    expect(logged()).toContain("App failed to start");
    expect(logged()).toContain("string failure");
  });

  it("restarting shows a spinner and watching prints the hint", () => {
    logger.restarting();
    logger.watching();

    expect(logged()).toContain("Watching for changes");
  });

  it("a file change clears the screen and names the file", () => {
    logger.fileChanged("app.tsx");

    expect(clearSpy).toHaveBeenCalled();
    expect(logged()).toContain("app.tsx changed");
  });
});
