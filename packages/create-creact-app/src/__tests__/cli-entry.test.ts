import { afterEach, expect, test, vi } from "vitest";

// cli.ts is the bin entry: a shebang followed by an unconditional `await main()`
// (no self-execution guard — that is the whole point of the fix). The symlink
// regression test runs the built bin in a subprocess, which yields no in-process
// coverage, so exercise the entry here with `main` stubbed to keep it a pure
// "does it call main?" check with no scaffolding side effects.
afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../index.js");
});

test("bin entry invokes the scaffolder exactly once", async () => {
  const main = vi.fn().mockResolvedValue(undefined);
  vi.doMock("../index.js", () => ({ main }));

  await import("../cli.js");

  expect(main).toHaveBeenCalledTimes(1);
});
