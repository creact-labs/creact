
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
 * Argument Parser - parses CLI arguments and flags
 */

import { CLIContext, CLIFlags } from './CLIContext';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

/**
 * Simple argument parser for CLI commands
 */
export class ArgumentParser {
  /**
   * Parse command line arguments into context
   */
  static parse(argv: string[]): CLIContext {
    // Remove node and script path
    const args = argv.slice(2);

    if (args.length === 0) {
      throw new Error('No command specified');
    }

    const command = args[0];
    const remainingArgs = args.slice(1);

    const flags: CLIFlags = {};
    const positionalArgs: string[] = [];

    for (let i = 0; i < remainingArgs.length; i++) {
      const arg = remainingArgs[i];

      if (arg.startsWith('--')) {
        // Long flag
        const flagName = arg.slice(2);

        if (flagName.includes('=')) {
          // --flag=value
          const [name, value] = flagName.split('=', 2);
          flags[name] = value;
        } else {
          // --flag or --flag value
          const nextArg = remainingArgs[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            // --flag value
            flags[flagName] = nextArg;
            i++; // Skip next arg
          } else {
            // --flag (boolean)
            flags[flagName] = true;
          }
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        // Short flag(s)
        const shortFlags = arg.slice(1);

        for (const flag of shortFlags) {
          flags[flag] = true;
        }
      } else {
        // Positional argument
        positionalArgs.push(arg);
      }
    }

    return {
      args: [command, ...positionalArgs],
      flags,
    };
  }

  /**
   * Show help message
   */
  static showHelp(): void {
    logger.info(`
CReact CLI - Infrastructure as Code with JSX

Usage:
  creact <command> [options]

Commands:
  build     Build CloudDOM from entry file
  plan      Show diff between current and previous CloudDOM  
  deploy    Deploy CloudDOM to cloud provider
  dev       Hot reload development mode

Options:
  --entry <file>    Entry file path (default: index.ts)
  --verbose, -v     Verbose output
  --json            JSON output format
  --dry-run         Simulate deployment without applying changes
  --auto-approve    Auto-approve changes in dev mode (alias: --auto)
  --help, -h        Show help

Examples:
  creact build
  creact build --entry app.ts --verbose
  creact plan --json
  creact deploy --dry-run
  creact dev
  creact dev --auto-approve
`);
  }
}
