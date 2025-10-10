#!/usr/bin/env node

/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */


/**
 * CReact CLI Entry Point - Clean modular architecture
 *
 * This is the main entry point for the CReact CLI.
 * It uses a clean, modular architecture with:
 * - Separate command classes
 * - Dependency injection through CLIContext
 * - Proper error handling
 * - Consistent output formatting
 */

import { ArgumentParser, CommandRegistry } from './core';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

const VERSION = '0.1.0';

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const context = ArgumentParser.parse(process.argv);
    const commandName = context.args[0];

    // Handle help and version flags
    if (context.flags.help || context.flags.h) {
      ArgumentParser.showHelp();
      process.exit(0);
    }

    if (context.flags.version || context.flags.V) {
      logger.info(`CReact CLI v${VERSION}`);
      process.exit(0);
    }

    // Validate command exists
    if (!CommandRegistry.hasCommand(commandName)) {
      logger.error(`Error: Unknown command '${commandName}'`);
      logger.error('');
      ArgumentParser.showHelp();
      process.exit(1);
    }

    // Create and execute command
    const command = CommandRegistry.createCommand(commandName, context);
    const result = await command.execute();

    // Exit with appropriate code
    process.exit(result.exitCode);
  } catch (error) {
    // Handle unexpected errors
    logger.error(`Fatal error: ${(error as Error).message}`);

    if (process.env.CREACT_DEBUG === 'true') {
      logger.error((error as Error).stack || '');
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Run CLI
if (require.main === module) {
  main();
}

export { main };
