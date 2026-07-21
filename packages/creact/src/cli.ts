#!/usr/bin/env node

/**
 * CReact CLI — process entry shim.
 *
 * Usage: creact ./app.tsx
 *        creact --watch ./app.tsx
 *
 * Logic-free by design: wires argv, the exit code, and OS signals to the
 * tested implementation in cli-main.ts.
 */

import { AppRunner, runCli, shutdown } from "./cli-main";

const runner = new AppRunner();

// Handle Ctrl+C at any point — including during startup awaits
process.on("SIGINT", () => {
  shutdown(runner);
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown(runner);
  process.exit(0);
});

process.exit(await runCli(process.argv.slice(2), process.cwd(), runner));
