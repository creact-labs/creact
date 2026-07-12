/**
 * CReact CLI — testable core.
 *
 * Everything here is pure logic or in-process work; the thin bin entry
 * (cli.ts) owns process-level concerns: argv, exit codes, signal handlers,
 * and the infinite watch loop.
 */

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
      // fallow-ignore-next-line unresolved-imports
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
