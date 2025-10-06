/**
 * CLI utility functions
 * 
 * Shared utilities for CLI commands including config loading,
 * logging, and error handling.
 */

import { loadConfig, ConfigLoadError, type ResolvedCReactConfig } from './config';
import type { CommandContext } from './index';

/**
 * Load configuration from file with CLI-friendly error handling
 * 
 * @param ctx - Command context with flags
 * @param throwOnError - If true, throw errors instead of calling process.exit (useful for testing)
 * @returns Resolved configuration
 */
export async function loadConfigFromContext(
  ctx: CommandContext,
  throwOnError: boolean = false
): Promise<ResolvedCReactConfig> {
  const configPath = ctx.flags.config as string | undefined;
  const cwd = process.cwd();

  try {
    const config = await loadConfig(configPath, cwd);

    // Apply CLI flags to override config
    if (ctx.flags.verbose) {
      config.verbose = true;
    }

    if (ctx.flags.debug) {
      config.debug = true;
    }

    // Set environment variables for runtime
    if (config.verbose) {
      process.env.CREACT_VERBOSE = 'true';
    }

    if (config.debug) {
      process.env.CREACT_DEBUG = 'true';
    }

    return config;
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      console.error('Configuration Error:', error.message);
      if (error.cause) {
        console.error('Caused by:', error.cause.message);
      }
      console.error('\nCreate a creact.config.ts file in your project root.');
      console.error('See examples/creact.config.example.ts for reference.');
    } else {
      console.error('Unexpected error loading configuration:', error);
    }
    
    if (throwOnError) {
      throw error;
    }
    
    process.exit(1);
  }
}

/**
 * Log message if verbose mode is enabled
 * 
 * @param message - Message to log
 * @param config - Configuration (optional, checks flags if not provided)
 */
export function logVerbose(message: string, config?: ResolvedCReactConfig): void {
  if (config?.verbose || process.env.CREACT_VERBOSE === 'true') {
    console.log(`[verbose] ${message}`);
  }
}

/**
 * Log debug message if debug mode is enabled
 * 
 * @param message - Message to log
 * @param config - Configuration (optional, checks flags if not provided)
 */
export function logDebug(message: string, config?: ResolvedCReactConfig): void {
  if (config?.debug || process.env.CREACT_DEBUG === 'true') {
    console.debug(`[debug] ${message}`);
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
  let message = `Error: ${error.message}`;

  if (verbose && error.stack) {
    message += `\n\nStack trace:\n${error.stack}`;
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
export function outputJson(data: any, ctx: CommandContext): boolean {
  if (ctx.flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return true;
  }
  return false;
}

/**
 * Confirm action with user (unless --auto-approve is set)
 * 
 * @param message - Confirmation message
 * @param ctx - Command context
 * @returns Promise resolving to true if confirmed, false otherwise
 */
export async function confirm(message: string, ctx: CommandContext): Promise<boolean> {
  // Auto-approve if flag is set
  if (ctx.flags['auto-approve']) {
    return true;
  }

  // For now, return true (interactive prompts require additional dependencies)
  // TODO: Implement interactive prompt with readline or prompts library
  console.log(`${message} (use --auto-approve to skip)`);
  return true;
}
