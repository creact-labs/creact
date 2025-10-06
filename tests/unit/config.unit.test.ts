/**
 * Unit tests for configuration loader
 * 
 * Tests loading, validation, and resolution of creact.config.ts files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  loadConfig,
  ConfigLoadError,
  getProviderRetryPolicy,
  type CReactUserConfig,
  type ResolvedCReactConfig,
} from '../../src/cli/config';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

describe('Configuration Loader', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `creact-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load valid configuration file', async () => {
      // Create config file with absolute imports
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          stackName: 'test-stack',
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
          entry: './app.ts',
          verbose: true,
        };
      `;
      writeFileSync(configPath, configContent);

      // Load config
      const config = await loadConfig(configPath, testDir);

      // Verify
      expect(config.stackName).toBe('test-stack');
      expect(config.cloudProvider).toBeInstanceOf(DummyCloudProvider);
      expect(config.backendProvider).toBeInstanceOf(DummyBackendProvider);
      expect(config.entry).toBe(join(testDir, 'app.ts'));
      expect(config.verbose).toBe(true);
      expect(config.configPath).toBe(configPath);
      expect(config.configDir).toBe(testDir);
    });

    it('should apply default values', async () => {
      // Create minimal config file
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
        };
      `;
      writeFileSync(configPath, configContent);

      // Load config
      const config = await loadConfig(configPath, testDir);

      // Verify defaults
      expect(config.stackName).toBe('default');
      expect(config.entry).toBe(join(testDir, 'index.ts'));
      expect(config.asyncTimeout).toBe(300000);
      expect(config.verbose).toBe(false);
      expect(config.debug).toBe(false);
      expect(config.retryPolicy).toEqual({
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        timeout: 300000,
      });
    });

    it('should merge custom retry policy with defaults', async () => {
      // Create config with partial retry policy
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
          retryPolicy: {
            maxRetries: 5,
            initialDelay: 2000,
          },
        };
      `;
      writeFileSync(configPath, configContent);

      // Load config
      const config = await loadConfig(configPath, testDir);

      // Verify merged policy
      expect(config.retryPolicy).toEqual({
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 30000, // default
        backoffMultiplier: 2, // default
        timeout: 300000, // default
      });
    });

    it('should find default config file (creact.config.ts)', async () => {
      // Create default config file
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
        };
      `;
      writeFileSync(configPath, configContent);

      // Load config without explicit path
      const config = await loadConfig(undefined, testDir);

      // Verify
      expect(config.configPath).toBe(configPath);
    });

    it('should throw error if config file not found', async () => {
      // Try to load non-existent config
      await expect(loadConfig(undefined, testDir)).rejects.toThrow(ConfigLoadError);
      await expect(loadConfig(undefined, testDir)).rejects.toThrow(
        'Configuration file not found'
      );
    });

    it('should throw error if cloudProvider is missing', async () => {
      // Create invalid config file
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          backendProvider: new DummyBackendProvider(),
        };
      `;
      writeFileSync(configPath, configContent);

      // Try to load config
      await expect(loadConfig(configPath, testDir)).rejects.toThrow(ConfigLoadError);
      await expect(loadConfig(configPath, testDir)).rejects.toThrow('cloudProvider is required');
    });

    it('should throw error if backendProvider is missing', async () => {
      // Create invalid config file
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
        };
      `;
      writeFileSync(configPath, configContent);

      // Try to load config
      await expect(loadConfig(configPath, testDir)).rejects.toThrow(ConfigLoadError);
      await expect(loadConfig(configPath, testDir)).rejects.toThrow('backendProvider is required');
    });

    it('should throw error if retry policy is invalid', async () => {
      // Create config with invalid retry policy
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
          retryPolicy: {
            maxRetries: -1,
          },
        };
      `;
      writeFileSync(configPath, configContent);

      // Try to load config
      await expect(loadConfig(configPath, testDir)).rejects.toThrow(ConfigLoadError);
      await expect(loadConfig(configPath, testDir)).rejects.toThrow('maxRetries must be >= 0');
    });

    it('should support provider-specific retry policies', async () => {
      // Create config with provider-specific policies
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
          retryPolicy: {
            maxRetries: 3,
            initialDelay: 1000,
          },
          providerRetryPolicies: {
            terraform: {
              maxRetries: 5,
              initialDelay: 2000,
            },
            aws: {
              maxRetries: 10,
            },
          },
        };
      `;
      writeFileSync(configPath, configContent);

      // Load config
      const config = await loadConfig(configPath, testDir);

      // Verify provider policies
      expect(config.providerRetryPolicies).toEqual({
        terraform: {
          maxRetries: 5,
          initialDelay: 2000,
        },
        aws: {
          maxRetries: 10,
        },
      });
    });
  });

  describe('getProviderRetryPolicy', () => {
    it('should return global policy if no provider-specific policy', async () => {
      // Create config
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
          retryPolicy: {
            maxRetries: 3,
            initialDelay: 1000,
          },
        };
      `;
      writeFileSync(configPath, configContent);

      const config = await loadConfig(configPath, testDir);

      // Get policy for provider without specific policy
      const policy = getProviderRetryPolicy(config, 'aws');

      // Should return global policy
      expect(policy).toEqual(config.retryPolicy);
    });

    it('should merge provider-specific policy with global policy', async () => {
      // Create config
      const configPath = join(testDir, 'creact.config.js');
      const configContent = `
        import { DummyCloudProvider } from '${projectRoot}/src/providers/DummyCloudProvider.js';
        import { DummyBackendProvider } from '${projectRoot}/src/providers/DummyBackendProvider.js';

        export default {
          cloudProvider: new DummyCloudProvider(),
          backendProvider: new DummyBackendProvider(),
          retryPolicy: {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            timeout: 300000,
          },
          providerRetryPolicies: {
            terraform: {
              maxRetries: 5,
              initialDelay: 2000,
            },
          },
        };
      `;
      writeFileSync(configPath, configContent);

      const config = await loadConfig(configPath, testDir);

      // Get policy for terraform provider
      const policy = getProviderRetryPolicy(config, 'terraform');

      // Should merge with global policy
      expect(policy).toEqual({
        maxRetries: 5, // from provider policy
        initialDelay: 2000, // from provider policy
        maxDelay: 30000, // from global policy
        backoffMultiplier: 2, // from global policy
        timeout: 300000, // from global policy
      });
    });
  });
});
