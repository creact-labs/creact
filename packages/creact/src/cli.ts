#!/usr/bin/env node

/**
 * CReact CLI
 *
 * Usage: creact ./app.tsx
 *        creact --watch ./app.tsx
 *
 * Runs a CReact application with the configured provider.
 * Uses tsx under the hood to execute TypeScript/TSX files.
 */

import { watch } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tsImport } from "tsx/esm/api";
import * as logger from "./cli-logger.js";
import { loadTypeScript, typeCheck } from "./cli-typecheck.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

let currentResult: { dispose?: () => void } | null = null;

async function runEntrypoint(entrypoint: string) {
  // Dispose previous render before restarting
  if (currentResult?.dispose) {
    currentResult.dispose();
    currentResult = null;
  }

  const url = pathToFileURL(entrypoint).href;
  // FIXME: Cache-busting causes memory leak as old modules stay in V8 cache.
  // Acceptable for dev watch mode, but consider worker threads for long sessions.
  const cacheBustUrl = `${url}?t=${Date.now()}`;
  const module = await tsImport(cacheBustUrl, {
    parentURL: import.meta.url,
    tsconfig: resolve(dirname(entrypoint), "tsconfig.json"),
  });
  if (typeof module.default === "function") {
    const result = await module.default();
    currentResult = result;
    // Wait for initial deployment to complete if render() was called
    if (
      result &&
      typeof result.ready === "object" &&
      typeof result.ready.then === "function"
    ) {
      await result.ready;
    }
  }
}

/** Returns true if types are clean (or check was skipped), false on errors. */
function runTypeCheck(entrypoint: string, cwd: string): boolean {
  const ts = loadTypeScript(cwd);
  if (!ts) {
    logger.typeCheckSkipped("typescript not found in project");
    return true;
  }

  try {
    const result = typeCheck(ts, entrypoint, cwd);
    if (result.ok) {
      logger.typeCheckPassed(result.fileCount, result.durationMs);
      return true;
    } else {
      logger.typeCheckFailed(result);
      return false;
    }
  } catch {
    logger.typeCheckSkipped("type checker threw an error");
    return true;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    logger.help();
    process.exit(0);
  }

  // Parse --watch / -w flag and get entrypoint
  let watchMode = false;
  let entrypointArg: string;

  const firstArg = args[0];
  if (firstArg === "--watch" || firstArg === "-w") {
    watchMode = true;
    const arg = args[1];
    if (!arg) {
      logger.error("--watch requires an entrypoint");
      process.exit(1);
    }
    entrypointArg = arg;
  } else if (firstArg) {
    entrypointArg = firstArg;
  } else {
    logger.help();
    process.exit(0);
  }

  const cwd = process.cwd();
  const entrypoint = resolve(cwd, entrypointArg);

  logger.banner(version);

  // Type-check — blocks execution on failure
  const typesOk = runTypeCheck(entrypoint, cwd);

  if (typesOk) {
    try {
      await runEntrypoint(entrypoint);
      logger.appStarted();
    } catch (err) {
      logger.appFailed(err);
    }
  }

  // Watch mode: async iterator keeps process alive
  if (watchMode) {
    logger.watching();
    const watcher = watch(dirname(entrypoint), { recursive: true });
    for await (const event of watcher) {
      if (event.filename?.match(/\.(tsx?|jsx?)$/)) {
        logger.fileChanged(event.filename);
        const ok = runTypeCheck(entrypoint, cwd);
        if (ok) {
          logger.restarting();
          try {
            await runEntrypoint(entrypoint);
            logger.appStarted();
          } catch (err) {
            logger.appFailed(err);
          }
        }
        logger.watching();
      }
    }
  } else {
    logger.closeFrame();
  }
}

main();
