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

import { tsImport } from 'tsx/esm/api';
import { watch } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function showHelp() {
  console.log(`
CReact CLI

Usage:
  creact <entrypoint>           Run a CReact application
  creact --watch <entrypoint>   Run with hot reload on file changes
  creact -w <entrypoint>        Short form of --watch
  creact --help                 Show this help message

Examples:
  creact ./app.tsx              Run app.tsx
  creact -w ./app.tsx           Run with hot reload
  creact --watch src/index.tsx  Run src/index.tsx with hot reload

The entrypoint file should:
  1. Set CReact.provider to your provider
  2. Export a default async function that calls renderCloudDOM()

Example entrypoint:
  import { CReact, renderCloudDOM } from 'creact';
  import { App } from './components/App.js';
  import { MyProvider } from './providers/MyProvider.js';

  CReact.provider = await MyProvider.create();

  export default async function() {
    return await renderCloudDOM(<App />, 'my-stack');
  }
`);
}

async function runEntrypoint(entrypoint: string) {
  const module = await tsImport(pathToFileURL(entrypoint).href, import.meta.url);
  if (typeof module.default === 'function') {
    await module.default();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  // Parse --watch / -w flag and get entrypoint
  let watchMode = false;
  let entrypointArg: string;

  const firstArg = args[0];
  if (firstArg === '--watch' || firstArg === '-w') {
    watchMode = true;
    const arg = args[1];
    if (!arg) {
      console.error('Error: --watch requires an entrypoint');
      process.exit(1);
    }
    entrypointArg = arg;
  } else if (firstArg) {
    entrypointArg = firstArg;
  } else {
    showHelp();
    process.exit(0);
  }

  const entrypoint = resolve(process.cwd(), entrypointArg);

  // Initial run
  await runEntrypoint(entrypoint);

  // Watch mode: async iterator keeps process alive
  if (watchMode) {
    console.log('Watching for changes...');
    const watcher = watch(dirname(entrypoint), { recursive: true });
    for await (const event of watcher) {
      if (event.filename?.match(/\.(tsx?|jsx?)$/)) {
        console.log(`\nRestarting...`);
        await runEntrypoint(entrypoint);
      }
    }
  }
}

main();
