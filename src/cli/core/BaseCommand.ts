/**
 * Base Command - abstract base class for all CLI commands
 */

import { CLIContext, CLIFlags } from './CLIContext';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

export interface CommandResult {
  exitCode: number;
  message?: string;
  data?: any;
}

/**
 * Abstract base class for CLI commands
 */
export abstract class BaseCommand {
  protected verbose: boolean;
  protected json: boolean;

  constructor(protected context: CLIContext) {
    this.verbose = !!context.flags.verbose;
    this.json = !!context.flags.json;
  }

  /**
   * Execute the command
   */
  abstract execute(): Promise<CommandResult>;

  /**
   * Get command name for help/error messages
   */
  abstract getName(): string;

  /**
   * Get command description for help
   */
  abstract getDescription(): string;

  /**
   * Log verbose message
   */
  protected logVerbose(message: string): void {
    if (this.verbose) {
      logger.debug(`[${this.getName()}] ${message}`);
    }
  }

  /**
   * Output JSON if json flag is set, otherwise return false
   */
  protected outputJson(data: any): boolean {
    if (this.json) {
      logger.info(JSON.stringify(data, null, 2));
      return true;
    }
    return false;
  }

  /**
   * Handle errors consistently
   */
  protected handleError(error: Error, context?: string): CommandResult {
    const message = context ? `${context}: ${error.message}` : error.message;
    
    if (this.outputJson({
      status: 'error',
      error: error.message,
      stack: this.verbose ? error.stack : undefined,
    })) {
      return { exitCode: 1 };
    }

    logger.error(`Error: ${message}`);
    if (this.verbose && error.stack) {
      logger.error(error.stack);
    }

    return { exitCode: 1, message };
  }

  /**
   * Handle success consistently
   */
  protected handleSuccess(message: string, data?: any): CommandResult {
    if (this.outputJson({
      status: 'success',
      message,
      ...data,
    })) {
      return { exitCode: 0 };
    }

    logger.info(message);
    return { exitCode: 0, message, data };
  }
}