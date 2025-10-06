/**
 * CLI utility functions
 * 
 * Shared utilities for CLI commands including config loading,
 * logging, and error handling.
 */

import type { CommandContext } from './index';
import { colors, printError } from './output';
import type { ICloudProvider } from '../providers/ICloudProvider';
import type { IBackendProvider } from '../providers/IBackendProvider';

/**
 * Configuration error
 */
export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeout: number;
}

/**
 * Resolved configuration from entry file
 */
export interface ResolvedCReactConfig {
  stackName: string;
  cloudProvider: ICloudProvider;
  backendProvider: IBackendProvider;
  entry: string;
  retryPolicy: RetryPolicy;
  asyncTimeout: number;
  migrationMap?: Record<string, string>;
  verbose: boolean;
  debug: boolean;
  configPath: string;
  configDir: string;
}

/**
 * Load configuration from entry file using CReact singleton
 * 
 * @param ctx - Command context with flags
 * @param throwOnError - If true, throw errors instead of calling process.exit (useful for testing)
 * @returns Resolved configuration
 */
export async function loadConfigFromContext(
  ctx: CommandContext,
  throwOnError: boolean = false
): Promise<ResolvedCReactConfig> {
  const entryPath = ctx.flags.entry as string | undefined;
  const cwd = process.cwd();

  if (!entryPath) {
    const error = new Error(
      '--entry flag is required.\n\n' +
      'Usage:\n' +
      '  creact build --entry index.tsx\n' +
      '  creact deploy --entry index.tsx\n\n' +
      'See examples/messaging-app/index.tsx for reference.'
    );
    
    if (throwOnError) {
      throw error;
    }
    
    printError(error.message);
    process.exit(1);
  }

  try {
    return await loadConfigFromEntry(entryPath, cwd, ctx);
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      printError(`Configuration Error: ${error.message}`);
      if (error.cause) {
        console.error(colors.dim(`Caused by: ${error.cause.message}`));
      }
      console.error(colors.dim('\nCreate an entry file with CReact configuration.'));
      console.error(colors.dim('See examples/messaging-app/index.tsx for reference.'));
    } else {
      printError(`Unexpected error loading configuration: ${error}`);
    }
    
    if (throwOnError) {
      throw error;
    }
    
    process.exit(1);
  }
}

/**
 * Load configuration from entry file using CReact singleton
 * 
 * @param entryPath - Path to entry file
 * @param cwd - Current working directory
 * @param ctx - Command context
 * @returns Resolved configuration
 */
async function loadConfigFromEntry(
  entryPath: string,
  cwd: string,
  ctx: CommandContext
): Promise<ResolvedCReactConfig> {
  const { resolve } = require('node:path');
  const { existsSync } = require('node:fs');

  // Resolve entry path
  const absoluteEntryPath = resolve(cwd, entryPath);

  if (!existsSync(absoluteEntryPath)) {
    throw new ConfigLoadError(
      `Entry file not found: ${entryPath}`,
      absoluteEntryPath
    );
  }

  // Handle TypeScript files
  const isTSX = absoluteEntryPath.endsWith('.tsx');
  const isTS = absoluteEntryPath.endsWith('.ts');

  if (isTSX || isTS) {
    // Register ts-node for TypeScript/JSX support
    // ts-node respects tsconfig.json JSX settings properly
    try {
      require('ts-node/register');
    } catch (error) {
      throw new ConfigLoadError(
        'TypeScript entry files require "ts-node" to be installed.\n\n' +
        'Install ts-node:\n' +
        '  npm install ts-node\n\n' +
        'Or compile to JavaScript first:\n' +
        '  npm run build\n' +
        '  creact build --entry dist/index.js',
        absoluteEntryPath
      );
    }
  }

  // Clear require cache
  try {
    delete require.cache[require.resolve(absoluteEntryPath)];
  } catch {
    // Ignore if not in cache
  }

  // Load entry file (this will set CReact singleton properties)
  try {
    // Clear cache to ensure fresh load
    delete require.cache[absoluteEntryPath];
    require(absoluteEntryPath);
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load entry file: ${(error as Error).message}`,
      absoluteEntryPath,
      error as Error
    );
  }

  // Import CReact AFTER loading entry file to get the same instance
  // that the entry file modified
  const { CReact } = require(resolve(__dirname, '../core/CReact'));

  // Extract config from CReact singleton
  if (!CReact.cloudProvider) {
    throw new ConfigLoadError(
      'CReact.cloudProvider must be set in entry file.\n\n' +
      'Example:\n' +
      '  import { CReact } from \'@escambo/creact\';\n' +
      '  import { AwsCloudProvider } from \'@escambo/creact/providers\';\n\n' +
      '  CReact.cloudProvider = new AwsCloudProvider();\n' +
      '  CReact.backendProvider = new S3BackendProvider();',
      absoluteEntryPath
    );
  }

  if (!CReact.backendProvider) {
    throw new ConfigLoadError(
      'CReact.backendProvider must be set in entry file.\n\n' +
      'Example:\n' +
      '  import { CReact } from \'@escambo/creact\';\n' +
      '  import { S3BackendProvider } from \'@escambo/creact/providers\';\n\n' +
      '  CReact.cloudProvider = new AwsCloudProvider();\n' +
      '  CReact.backendProvider = new S3BackendProvider();',
      absoluteEntryPath
    );
  }

  // Build resolved config from singleton
  const config: ResolvedCReactConfig = {
    stackName: ctx.flags.stack as string || 'default',
    cloudProvider: CReact.cloudProvider,
    backendProvider: CReact.backendProvider,
    entry: absoluteEntryPath,
    retryPolicy: {
      maxRetries: CReact.retryPolicy?.maxRetries ?? 3,
      initialDelay: CReact.retryPolicy?.initialDelay ?? 1000,
      maxDelay: CReact.retryPolicy?.maxDelay ?? 30000,
      backoffMultiplier: CReact.retryPolicy?.backoffMultiplier ?? 2,
      timeout: CReact.retryPolicy?.timeout ?? 300000,
    },
    asyncTimeout: CReact.asyncTimeout ?? 300000,
    migrationMap: CReact.migrationMap,
    verbose: (ctx.flags.verbose as boolean) || false,
    debug: (ctx.flags.debug as boolean) || false,
    configPath: absoluteEntryPath,
    configDir: resolve(absoluteEntryPath, '..'),
  };

  // Set environment variables for runtime
  if (config.verbose) {
    process.env.CREACT_VERBOSE = 'true';
  }

  if (config.debug) {
    process.env.CREACT_DEBUG = 'true';
  }

  return config;
}

/**
 * Log message if verbose mode is enabled
 * 
 * @param message - Message to log
 * @param config - Configuration (optional, checks flags if not provided)
 */
export function logVerbose(message: string, config?: ResolvedCReactConfig): void {
  if (config?.verbose || process.env.CREACT_VERBOSE === 'true') {
    console.log(colors.dim(`[verbose] ${message}`));
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
    console.debug(colors.dim(`[debug] ${message}`));
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
