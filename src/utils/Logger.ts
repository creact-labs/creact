
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
 * Logger - Internal debugging and diagnostics only
 *
 * IMPORTANT: This logger is for INTERNAL debugging only, not user-facing output.
 * - All output goes to stderr (not stdout)
 * - Controlled by --verbose flag or CREACT_DEBUG environment variable
 * - For user-facing messages, use OutputManager (src/utils/Output.ts)
 *
 * Usage:
 * - logger.debug() - Internal state tracking, algorithm steps
 * - logger.info() - Internal lifecycle events (not user messages)
 * - logger.warn() - Internal warnings
 * - logger.error() - Internal errors with stack traces
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Standard log scopes for CReact subsystems
 */
export type LogScope =
  | 'renderer'
  | 'reconciler'
  | 'validator'
  | 'clouddom'
  | 'state-machine'
  | 'provider'
  | 'hooks'
  | 'cli'
  | 'runtime'
  | 'parallel';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Enabled scopes (or ['*'] for all) */
  scopes: string[];

  /** Minimum log level */
  level: LogLevel;
}

/**
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Scoped logger with level filtering
 */
export class Logger {
  private readonly scope: LogScope;
  private readonly config: LoggerConfig;
  private readonly context: Record<string, any>;
  private readonly enabled: boolean;

  constructor(scope: LogScope, config: LoggerConfig, context: Record<string, any> = {}) {
    this.scope = scope;
    this.config = config;
    this.context = context;

    // Check if this scope is enabled
    this.enabled = config.scopes.includes('*') || config.scopes.includes(scope);
  }

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, any>): Logger {
    return new Logger(this.scope, this.config, {
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Internal log method with filtering
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Zero overhead when scope is disabled
    if (!this.enabled) {
      return;
    }

    // Filter by log level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
      return;
    }

    // Format: [timestamp] [scope] [level] message
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.context).length ? ` ${JSON.stringify(this.context)}` : '';

    const formattedMessage = `[${timestamp}] [${this.scope}] [${level.toUpperCase()}]${contextStr} ${message}`;

    // Output to stderr (not stdout) for all log levels
    // This ensures user-facing output (stdout) is separate from debug logs (stderr)
    switch (level) {
      case 'debug':
      case 'info':
        console.error(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }
}

/**
 * Logger factory for creating scoped loggers
 */
export class LoggerFactory {
  private static config: LoggerConfig = {
    scopes: [],
    level: 'info',
  };

  /**
   * Configure the logger factory
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = {
      scopes: config.scopes ?? this.config.scopes,
      level: config.level ?? this.config.level,
    };
  }

  /**
   * Get a logger for a specific scope
   */
  static getLogger(scope: LogScope): Logger {
    return new Logger(scope, this.config);
  }

  /**
   * Parse configuration from environment variables
   * Supports CREACT_LOG=scope1,scope2 or CREACT_LOG=*
   * Supports CREACT_LOG_LEVEL=debug|info|warn|error
   */
  static configureFromEnv(): void {
    const scopesEnv = process.env.CREACT_LOG;
    const levelEnv = process.env.CREACT_LOG_LEVEL;

    const config: Partial<LoggerConfig> = {};

    if (scopesEnv) {
      config.scopes = scopesEnv.split(',').map((s) => s.trim());
    }

    if (levelEnv && this.isValidLogLevel(levelEnv)) {
      config.level = levelEnv as LogLevel;
    }

    if (Object.keys(config).length > 0) {
      this.configure(config);
    }
  }

  /**
   * Parse configuration from CLI flags
   * Supports --log=scope1,scope2 or --log=*
   * Supports --log-level=debug|info|warn|error
   */
  static configureFromCLI(args: { log?: string; logLevel?: string }): void {
    const config: Partial<LoggerConfig> = {};

    if (args.log) {
      config.scopes = args.log.split(',').map((s) => s.trim());
    }

    if (args.logLevel && this.isValidLogLevel(args.logLevel)) {
      config.level = args.logLevel as LogLevel;
    }

    if (Object.keys(config).length > 0) {
      this.configure(config);
    }
  }

  /**
   * Parse configuration from config file
   */
  static configureFromFile(fileConfig: {
    log?: {
      scopes?: string[];
      level?: string;
    };
  }): void {
    if (!fileConfig.log) {
      return;
    }

    const config: Partial<LoggerConfig> = {};

    if (fileConfig.log.scopes) {
      config.scopes = fileConfig.log.scopes;
    }

    if (fileConfig.log.level && this.isValidLogLevel(fileConfig.log.level)) {
      config.level = fileConfig.log.level as LogLevel;
    }

    if (Object.keys(config).length > 0) {
      this.configure(config);
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  static reset(): void {
    this.config = {
      scopes: [],
      level: 'info',
    };
  }

  /**
   * Check if a string is a valid log level
   */
  private static isValidLogLevel(level: string): boolean {
    return ['debug', 'info', 'warn', 'error'].includes(level);
  }
}

// Auto-configure from environment variables on module load
LoggerFactory.configureFromEnv();
