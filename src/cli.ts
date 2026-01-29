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

import { spawn } from 'child_process';
import { resolve } from 'path';

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

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  // Parse --watch / -w flag
  let watch = false;
  let entrypointArg = args[0];

  if (args[0] === '--watch' || args[0] === '-w') {
    watch = true;
    entrypointArg = args[1];
    if (!entrypointArg) {
      console.error('Error: --watch requires an entrypoint');
      process.exit(1);
    }
  }

  const entrypoint = resolve(process.cwd(), entrypointArg);

  // Build tsx command
  const tsxArgs = watch ? ['tsx', 'watch', entrypoint] : ['tsx', entrypoint];

  // Spawn tsx to run the entrypoint
  const child = spawn('npx', tsxArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  });

  child.on('error', (error) => {
    console.error('Error running CReact application:');
    console.error(error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main();
