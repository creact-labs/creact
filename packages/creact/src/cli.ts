#!/usr/bin/env node

/**
 * CReact CLI — process entry.
 *
 * Usage: creact ./app.tsx
 *        creact --watch ./app.tsx
 *
 * Owns process-level concerns only (argv, exit codes, signal handlers, the
 * infinite watch loop); all logic lives in cli-main.ts where it is tested.
 */

import { watch } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as logger from "./cli-logger.js";
import {
  AppRunner,
  loadVersion,
  parseCliArgs,
  runTypeCheck,
  startApp,
} from "./cli-main.js";

const runner = new AppRunner();

// Handle Ctrl+C at any point — including during startup/await.
// Must stop ora spinner first since it hooks stdin and swallows SIGINT.
function shutdown() {
  logger.stopSpinner();
  runner.dispose();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  const command = parseCliArgs(process.argv.slice(2));

  if (command.kind === "help") {
    logger.help();
    process.exit(0);
  }
  if (command.kind === "error") {
    logger.error(command.message);
    process.exit(1);
  }

  const cwd = process.cwd();
  const entrypoint = resolve(cwd, command.entrypoint);

  logger.banner(loadVersion());

  // Type-check — blocks execution on failure
  if (runTypeCheck(entrypoint, cwd)) {
    logger.appStarting();
    await startApp(runner, entrypoint);
  }

  // Watch mode: async iterator keeps process alive
  if (command.watchMode) {
    logger.watching();
    const watcher = watch(dirname(entrypoint), { recursive: true });
    for await (const event of watcher) {
      if (event.filename?.match(/\.(tsx?|jsx?)$/)) {
        logger.fileChanged(event.filename);
        if (runTypeCheck(entrypoint, cwd)) {
          logger.restarting();
          await startApp(runner, entrypoint);
        }
        logger.watching();
      }
    }
  }
}

main();
