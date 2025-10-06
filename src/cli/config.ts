/**
 * Configuration Loader for CReact
 * 
 * Loads and validates creact.config.ts configuration files.
 * Supports TypeScript configuration with type safety.
 * 
 * REQ-O08: CLI configuration support
 */

import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { ICloudProvider } from '../providers/ICloudProvider';
import { IBackendProvider } from '../providers/IBackendProvider';

/**
 * Retry policy configuration for error handling
 * REQ-O03: Error handling and retry logic
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial backoff delay in milliseconds */
  initialDelay?: number;
  /** Maximum backoff delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier (exponential backoff) */
  backoffMultiplier?: number;
  /** Timeout for each operation in milliseconds */
  timeout?: number;
}

/**
 * Provider-specific retry policy overrides
 */
export interface ProviderRetryPolicies {
  [providerName: string]: RetryPolicy;
}

/**
 * CReact configuration file schema
 * 
 * This is the shape of the creact.config.ts file that users create.
 */
export interface CReactUserConfig {
  /** Stack name (default: 'default') */
  stackName?: string;

  /** Cloud provider for resource materialization */
  cloudProvider: ICloudProvider;

  /** Backend provider for state management */
  backendProvider: IBackendProvider;

  /** Entry point for JSX infrastructure code */
  entry?: string;

  /** Global retry policy (REQ-O03) */
  retryPolicy?: RetryPolicy;

  /** Per-provider retry policy overrides (REQ-O03) */
  providerRetryPolicies?: ProviderRetryPolicies;

  /** Async timeout in milliseconds (default: 5 minutes) */
  asyncTimeout?: number;

  /** Migration map for refactoring (resource ID remapping) */
  migrationMap?: Record<string, string>;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedCReactConfig extends Required<Omit<CReactUserConfig, 'entry' | 'migrationMap' | 'providerRetryPolicies' | 'retryPolicy'>> {
  /** Absolute path to entry file */
  entry: string;

  /** Global retry policy with all defaults applied */
  retryPolicy: Required<RetryPolicy>;

  /** Migration map (optional) */
  migrationMap?: Record<string, string>;

  /** Provider retry policies (optional) */
  providerRetryPolicies?: ProviderRetryPolicies;

  /** Absolute path to config file */
  configPath: string;

  /** Directory containing config file */
  configDir: string;
}

/**
 * Default retry policy values
 */
const DEFAULT_RETRY_POLICY: Required<RetryPolicy> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2, // Exponential backoff: 1s, 2s, 4s, 8s, ...
  timeout: 300000, // 5 minutes
};

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<CReactUserConfig> = {
  stackName: 'default',
  entry: './index.ts',
  asyncTimeout: 300000, // 5 minutes
  verbose: false,
  debug: false,
  retryPolicy: DEFAULT_RETRY_POLICY,
};

/**
 * Configuration loader error
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
 * Load and resolve CReact configuration
 * 
 * Searches for creact.config.ts in the following order:
 * 1. Explicit path provided via --config flag
 * 2. ./creact.config.ts in current directory
 * 3. ./creact.config.js in current directory
 * 
 * @param configPath - Optional explicit path to config file
 * @param cwd - Current working directory (default: process.cwd())
 * @returns Resolved configuration with defaults applied
 * @throws ConfigLoadError if config file not found or invalid
 */
export async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd()
): Promise<ResolvedCReactConfig> {
  // Determine config file path
  const resolvedPath = resolveConfigPath(configPath, cwd);

  if (!resolvedPath) {
    throw new ConfigLoadError(
      'Configuration file not found. Create a creact.config.ts file in your project root.',
      configPath || cwd
    );
  }

  // Load config file
  let userConfig: CReactUserConfig;
  try {
    userConfig = await loadConfigFile(resolvedPath);
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load configuration file: ${(error as Error).message}`,
      resolvedPath,
      error as Error
    );
  }

  // Validate required fields
  validateConfig(userConfig, resolvedPath);

  // Resolve and apply defaults
  const configDir = dirname(resolvedPath);
  const resolvedConfig: ResolvedCReactConfig = {
    stackName: userConfig.stackName || DEFAULT_CONFIG.stackName!,
    cloudProvider: userConfig.cloudProvider,
    backendProvider: userConfig.backendProvider,
    entry: resolveEntryPath(userConfig.entry || DEFAULT_CONFIG.entry!, configDir),
    retryPolicy: {
      ...DEFAULT_RETRY_POLICY,
      ...userConfig.retryPolicy,
    },
    providerRetryPolicies: userConfig.providerRetryPolicies,
    asyncTimeout: userConfig.asyncTimeout || DEFAULT_CONFIG.asyncTimeout!,
    migrationMap: userConfig.migrationMap,
    verbose: userConfig.verbose || DEFAULT_CONFIG.verbose!,
    debug: userConfig.debug || DEFAULT_CONFIG.debug!,
    configPath: resolvedPath,
    configDir,
  };

  return resolvedConfig;
}

/**
 * Resolve configuration file path
 * 
 * @param configPath - Explicit path or undefined
 * @param cwd - Current working directory
 * @returns Resolved absolute path or null if not found
 */
function resolveConfigPath(configPath: string | undefined, cwd: string): string | null {
  // If explicit path provided, use it
  if (configPath) {
    const absolutePath = resolve(cwd, configPath);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
    return null;
  }

  // Search for default config files
  const candidates = [
    resolve(cwd, 'creact.config.ts'),
    resolve(cwd, 'creact.config.js'),
    resolve(cwd, 'creact.config.mjs'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Load configuration file using dynamic import
 * 
 * Supports both ESM and CommonJS modules.
 * 
 * @param configPath - Absolute path to config file
 * @returns User configuration object
 */
async function loadConfigFile(configPath: string): Promise<CReactUserConfig> {
  // Convert file path to file:// URL for ESM import
  const fileUrl = pathToFileURL(configPath).href;

  // Dynamic import (works for both .ts and .js)
  const module = await import(fileUrl);

  // Support both default export and named export
  const config = module.default || module.config;

  if (!config) {
    throw new Error(
      'Configuration file must export a default object or named "config" export'
    );
  }

  return config;
}

/**
 * Validate required configuration fields
 * 
 * @param config - User configuration
 * @param configPath - Path to config file (for error messages)
 * @throws ConfigLoadError if validation fails
 */
function validateConfig(config: CReactUserConfig, configPath: string): void {
  const errors: string[] = [];

  // Validate cloudProvider
  if (!config.cloudProvider) {
    errors.push('cloudProvider is required');
  } else if (typeof config.cloudProvider !== 'object') {
    errors.push('cloudProvider must be an object implementing ICloudProvider');
  } else if (typeof config.cloudProvider.materialize !== 'function') {
    errors.push('cloudProvider must implement materialize() method');
  }

  // Validate backendProvider
  if (!config.backendProvider) {
    errors.push('backendProvider is required');
  } else if (typeof config.backendProvider !== 'object') {
    errors.push('backendProvider must be an object implementing IBackendProvider');
  } else if (typeof config.backendProvider.getState !== 'function') {
    errors.push('backendProvider must implement getState() method');
  } else if (typeof config.backendProvider.saveState !== 'function') {
    errors.push('backendProvider must implement saveState() method');
  }

  // Validate retry policy if provided
  if (config.retryPolicy) {
    if (config.retryPolicy.maxRetries !== undefined && config.retryPolicy.maxRetries < 0) {
      errors.push('retryPolicy.maxRetries must be >= 0');
    }
    if (config.retryPolicy.initialDelay !== undefined && config.retryPolicy.initialDelay < 0) {
      errors.push('retryPolicy.initialDelay must be >= 0');
    }
    if (config.retryPolicy.maxDelay !== undefined && config.retryPolicy.maxDelay < 0) {
      errors.push('retryPolicy.maxDelay must be >= 0');
    }
    if (config.retryPolicy.backoffMultiplier !== undefined && config.retryPolicy.backoffMultiplier <= 1) {
      errors.push('retryPolicy.backoffMultiplier must be > 1');
    }
    if (config.retryPolicy.timeout !== undefined && config.retryPolicy.timeout < 0) {
      errors.push('retryPolicy.timeout must be >= 0');
    }
  }

  // Validate asyncTimeout if provided
  if (config.asyncTimeout !== undefined && config.asyncTimeout < 0) {
    errors.push('asyncTimeout must be >= 0');
  }

  if (errors.length > 0) {
    throw new ConfigLoadError(
      `Invalid configuration:\n  - ${errors.join('\n  - ')}`,
      configPath
    );
  }
}

/**
 * Resolve entry file path relative to config directory
 * 
 * @param entry - Entry path from config (relative or absolute)
 * @param configDir - Directory containing config file
 * @returns Absolute path to entry file
 */
function resolveEntryPath(entry: string, configDir: string): string {
  return resolve(configDir, entry);
}

/**
 * Get retry policy for a specific provider
 * 
 * Returns provider-specific policy if defined, otherwise returns global policy.
 * 
 * @param config - Resolved configuration
 * @param providerName - Name of the provider
 * @returns Retry policy for the provider
 */
export function getProviderRetryPolicy(
  config: ResolvedCReactConfig,
  providerName: string
): Required<RetryPolicy> {
  const providerPolicy = config.providerRetryPolicies?.[providerName];

  if (providerPolicy) {
    // Merge provider-specific policy with global policy
    return {
      maxRetries: providerPolicy.maxRetries ?? config.retryPolicy.maxRetries,
      initialDelay: providerPolicy.initialDelay ?? config.retryPolicy.initialDelay,
      maxDelay: providerPolicy.maxDelay ?? config.retryPolicy.maxDelay,
      backoffMultiplier: providerPolicy.backoffMultiplier ?? config.retryPolicy.backoffMultiplier,
      timeout: providerPolicy.timeout ?? config.retryPolicy.timeout,
    };
  }

  return config.retryPolicy;
}
