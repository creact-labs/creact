/**
 * Example CReact Configuration File
 * 
 * Copy this file to your project root as `creact.config.ts` and customize it.
 * 
 * This file defines:
 * - Cloud provider for resource materialization
 * - Backend provider for state management
 * - Entry point for your infrastructure code
 * - Retry policies and timeouts
 * - Other runtime configuration
 */

import { DummyCloudProvider } from '../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../src/providers/DummyBackendProvider';
import type { CReactUserConfig } from '../src/cli/config';

const config: CReactUserConfig = {
  /**
   * Stack name for state isolation
   * Different stacks maintain separate state (e.g., dev, staging, prod)
   * Default: 'default'
   */
  stackName: 'default',

  /**
   * Cloud provider for materializing resources
   * Must implement ICloudProvider interface
   * 
   * Examples:
   * - DummyCloudProvider (for testing)
   * - TerraformCloudProvider (for Terraform)
   * - AwsCloudProvider (for AWS CDK)
   * - DockerCloudProvider (for Docker)
   */
  cloudProvider: new DummyCloudProvider(),

  /**
   * Backend provider for state management
   * Must implement IBackendProvider interface
   * 
   * Examples:
   * - DummyBackendProvider (in-memory, for testing)
   * - SqliteBackendProvider (local file)
   * - S3BackendProvider (AWS S3)
   * - PostgresBackendProvider (PostgreSQL)
   */
  backendProvider: new DummyBackendProvider(),

  /**
   * Entry point for your infrastructure code
   * Relative to this config file
   * Default: './index.ts'
   */
  entry: './index.ts',

  /**
   * Global retry policy for all providers
   * Individual providers can override these settings
   */
  retryPolicy: {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: 3,

    /** Initial backoff delay in milliseconds (default: 1000) */
    initialDelay: 1000,

    /** Maximum backoff delay in milliseconds (default: 30000) */
    maxDelay: 30000,

    /** Backoff multiplier for exponential backoff (default: 2) */
    backoffMultiplier: 2,

    /** Timeout for each operation in milliseconds (default: 300000 = 5 minutes) */
    timeout: 300000,
  },

  /**
   * Provider-specific retry policy overrides
   * Useful when different providers have different reliability characteristics
   */
  providerRetryPolicies: {
    // Example: Terraform operations might need more retries
    terraform: {
      maxRetries: 5,
      initialDelay: 2000,
      timeout: 600000, // 10 minutes
    },

    // Example: AWS operations might be faster
    aws: {
      maxRetries: 10,
      initialDelay: 500,
      maxDelay: 10000,
    },
  },

  /**
   * Global async timeout in milliseconds
   * Maximum time to wait for async operations
   * Default: 300000 (5 minutes)
   */
  asyncTimeout: 300000,

  /**
   * Migration map for refactoring
   * Maps old resource IDs to new resource IDs
   * Useful when renaming resources without destroying and recreating them
   * 
   * Example:
   * {
   *   'old-database-id': 'new-database-id',
   *   'legacy-bucket': 'modern-bucket',
   * }
   */
  migrationMap: {
    // 'old-resource-id': 'new-resource-id',
  },

  /**
   * Enable verbose logging
   * Shows detailed information about each step
   * Default: false
   */
  verbose: false,

  /**
   * Enable debug mode
   * Shows internal state and debug information
   * Default: false
   */
  debug: false,
};

export default config;
