/**
 * CLI utility functions
 * 
 * Shared utilities for CLI commands including config loading,
 * logging, and error handling.
 */

import type { CLIContext } from './core/CLIContext';
import { colors } from './output';



/**
 * Log message if verbose mode is enabled
 * 
 * @param message - Message to log
 * @param verbose - Whether verbose mode is enabled
 */
export function logVerbose(message: string, verbose: boolean = false): void {
  if (verbose || process.env.CREACT_VERBOSE === 'true') {
    console.log(colors.dim(`[verbose] ${message}`));
  }
}

/**
 * Format error for CLI output
 * 
 * @param error - Error to format
 * @param verbose - Whether to include stack trace
 * @returns Formatted error message
 */
export function formatError(error: Error, verbose: boolean = false): string {
  let message = colors.error(`Error: ${error.message}`);

  if (verbose && error.stack) {
    message += `\n\n${colors.dim('Stack trace:')}\n${colors.dim(error.stack)}`;
  }

  return message;
}

/**
 * Output data in JSON format if --json flag is set
 * 
 * @param data - Data to output
 * @param ctx - Command context
 * @returns true if JSON output was used, false otherwise
 */
export function outputJson(data: any, ctx: CLIContext): boolean {
  if (ctx.flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return true;
  }
  return false;
}


