/**
 * CReact CLI — the complete, testable implementation.
 *
 * The bin entry (cli.ts) is a logic-free shim: it wires process signals,
 * argv, and the exit code to runCli(). Everything that can branch lives
 * here, under tests.
 */

import { watch } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import * as logger from "./cli-logger.js";
import { loadTypeScript, typeCheck } from "./cli-typecheck.js";

const require = createRequire(import.meta.url);

export function loadVersion(
  // dist layout: dist/src/cli-main.js → ../../package.json
  // source layout (tsx): src/cli-main.ts → ../package.json
  candidates: string[] = ["../../package.json", "../package.json"],
): string {
  for (const candidate of candidates) {
    try {
      return require(candidate).version;
    } catch {
      // try next layout
    }
  }
  return "unknown";
}

export type CliCommand =
  | { kind: "help" }
  | { kind: "error"; message: string }
  | { kind: "run"; watchMode: boolean; entrypoint: string };

/** Parse argv (minus node + script) into a command — no process side effects */
export function parseCliArgs(args: string[]): CliCommand {
  const [first, second] = args;

  if (!first || first === "--help" || first === "-h") {
    return { kind: "help" };
  }

  if (first === "--watch" || first === "-w") {
    if (!second) {
      return { kind: "error", message: "--watch requires an entrypoint" };
    }
    return { kind: "run", watchMode: true, entrypoint: second };
  }

  return { kind: "run", watchMode: false, entrypoint: first };
}

interface RenderHandle {
  dispose?: () => void;
  ready?: unknown;
}

/**
 * Loads and runs entrypoint modules, disposing the previous app between
 * runs (watch-mode restarts)
 */
export class AppRunner {
  private current: RenderHandle | null = null;

  async runEntrypoint(entrypoint: string): Promise<void> {
    this.dispose();

    const url = pathToFileURL(entrypoint).href;
    // FIXME: Cache-busting causes memory leak as old modules stay in V8 cache.
    // Acceptable for dev watch mode, but consider worker threads for long sessions.
    const cacheBustUrl = `${url}?t=${Date.now()}`;
    const module = await tsImport(cacheBustUrl, {
      parentURL: import.meta.url,
      tsconfig: resolve(dirname(entrypoint), "tsconfig.json"),
    });
    if (typeof module.default === "function") {
      const result: RenderHandle = await module.default();
      this.current = result;
      // Wait for initial deployment to complete if render() was called
      if (
        result &&
        typeof result.ready === "object" &&
        typeof (result.ready as PromiseLike<void>).then === "function"
      ) {
        await result.ready;
      }
    }
  }

  /** Dispose the currently running app, if any */
  dispose(): void {
    if (this.current?.dispose) {
      this.current.dispose();
    }
    this.current = null;
  }
}

/** Returns true if types are clean (or check was skipped), false on errors. */
export function runTypeCheck(
  entrypoint: string,
  cwd: string,
  tsLoader: typeof loadTypeScript = loadTypeScript,
): boolean {
  const ts = tsLoader(cwd);
  if (!ts) {
    logger.typeCheckSkipped("typescript not found in project");
    return true;
  }

  logger.typeCheckStart();

  try {
    const result = typeCheck(ts, entrypoint, cwd);
    if (result.ok) {
      logger.typeCheckPassed(result.fileCount, result.durationMs);
      return true;
    }
    logger.typeCheckFailed(result);
    return false;
  } catch {
    logger.typeCheckSkipped("type checker threw an error");
    return true;
  }
}

/** Run the app once, reporting the outcome — never throws */
export async function startApp(
  runner: AppRunner,
  entrypoint: string,
): Promise<void> {
  try {
    await runner.runEntrypoint(entrypoint);
    logger.appStarted();
  } catch (err) {
    logger.appFailed(err);
  }
}

/** Does this watch event refer to a source file we should restart for? */
export function isSourceFile(filename: string | null | undefined): boolean {
  return filename != null && /\.(tsx?|jsx?)$/.test(filename);
}

/**
 * Yield file-watch events until the signal aborts.
 *
 * Termination is owned here instead of being delegated to fs.watch's signal
 * option (which ends iteration by rejecting with AbortError): each next() is
 * raced against the abort, and on abort the watcher is closed via return().
 * Real watcher errors reject the race and propagate to the caller untouched.
 */
async function* watchEvents(
  dir: string,
  signal?: AbortSignal,
): AsyncGenerator<{ filename: string | null }> {
  // The watcher gets its own controller so it can be closed deterministically;
  // the caller's signal only decides when iteration stops.
  const watcherControl = new AbortController();
  const iterator = watch(dir, {
    recursive: true,
    signal: watcherControl.signal,
  })[Symbol.asyncIterator]();

  const aborted = new Promise<"aborted">((resolveAborted) => {
    if (signal?.aborted) {
      resolveAborted("aborted");
    }
    signal?.addEventListener("abort", () => resolveAborted("aborted"), {
      once: true,
    });
  });

  while (true) {
    const nextEvent = iterator.next();
    const winner = await Promise.race([nextEvent, aborted]);
    if (winner === "aborted") {
      // Closing the watcher rejects the in-flight next(); absorb that
      // rejection so it cannot surface as an unhandled rejection.
      nextEvent.catch(() => undefined);
      watcherControl.abort();
      return;
    }
    // Nothing ends the iterator before the abort path above returns, so
    // next() can only resolve with a yielded event here.
    yield (winner as IteratorYieldResult<{ filename: string | null }>).value;
  }
}

/**
 * Watch mode: type-check and restart the app whenever a source file in the
 * entrypoint's directory changes. Resolves when the AbortSignal fires.
 */
export async function watchLoop(
  runner: AppRunner,
  entrypoint: string,
  cwd: string,
  signal?: AbortSignal,
  tsLoader: typeof loadTypeScript = loadTypeScript,
): Promise<void> {
  logger.watching();
  for await (const event of watchEvents(dirname(entrypoint), signal)) {
    if (!isSourceFile(event.filename)) continue;
    logger.fileChanged(event.filename as string);
    if (runTypeCheck(entrypoint, cwd, tsLoader)) {
      logger.restarting();
      await startApp(runner, entrypoint);
    }
    logger.watching();
  }
}

/**
 * Ctrl+C / SIGTERM teardown: the ora spinner hooks stdin and swallows
 * SIGINT, so it must stop before the app is disposed.
 */
export function shutdown(runner: AppRunner): void {
  logger.stopSpinner();
  runner.dispose();
}

/**
 * The complete CLI flow minus process wiring. Returns the exit code.
 * In watch mode this resolves only when `watchSignal` aborts.
 */
export async function runCli(
  args: string[],
  cwd: string,
  runner: AppRunner,
  watchSignal?: AbortSignal,
): Promise<number> {
  const command = parseCliArgs(args);

  if (command.kind === "help") {
    logger.help();
    return 0;
  }
  if (command.kind === "error") {
    logger.error(command.message);
    return 1;
  }

  const entrypoint = resolve(cwd, command.entrypoint);
  logger.banner(loadVersion());

  // runCli never throws past this point: any failure (a watcher error, an
  // unexpected loader crash) is formatted through the CLI logger and
  // becomes exit code 1 — never Node's default rejection dump
  try {
    // Type-check — blocks execution on failure
    if (runTypeCheck(entrypoint, cwd)) {
      logger.appStarting();
      await startApp(runner, entrypoint);
    }

    if (command.watchMode) {
      await watchLoop(runner, entrypoint, cwd, watchSignal);
    }
    return 0;
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}
