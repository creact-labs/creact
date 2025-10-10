
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
 * CLI utility functions
 *
 * Shared utilities for CLI commands including config loading,
 * logging, and error handling.
 */

import type { CLIContext } from './core/CLIContext';
import { colors } from './output';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

/**
 * Log message if verbose mode is enabled
 *
 * @param message - Message to log
 * @param verbose - Whether verbose mode is enabled
 */
export function logVerbose(message: string, verbose: boolean = false): void {
  if (verbose || process.env.CREACT_VERBOSE === 'true') {
    logger.debug(colors.dim(`[verbose] ${message}`));
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
    logger.info(JSON.stringify(data, null, 2));
    return true;
  }
  return false;
}
