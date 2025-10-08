#!/usr/bin/env node

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
      console.log(`CReact CLI v${VERSION}`);
      process.exit(0);
    }

    // Validate command exists
    if (!CommandRegistry.hasCommand(commandName)) {
      console.error(`Error: Unknown command '${commandName}'`);
      console.error('');
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
    console.error(`Fatal error: ${(error as Error).message}`);
    
    if (process.env.CREACT_DEBUG === 'true') {
      console.error((error as Error).stack);
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run CLI
if (require.main === module) {
  main();
}

export { main };