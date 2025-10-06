/**
 * Integration tests for CLI configuration loading
 * 
 * Tests the full flow of loading configuration from CLI commands.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfigFromContext } from '../../src/cli/utils';
import type { CommandContext } from '../../src/cli/index';

describe('CLI Configuration Integration', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd();

    // Create temporary test directory
    testDir = join(tmpdir(), `creact-cli-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up environment variables
    delete process.env.CREACT_VERBOSE;
    delete process.env.CREACT_DEBUG;
  });

  it('should load config from default location', async () => {
    // Create default config file with inline providers
    const configContent = `
      const cloudProvider = {
        materialize: () => {},
      };
      
      const backendProvider = {
        getState: async () => null,
        saveState: async () => {},
        deleteState: async () => {},
        listStacks: async () => [],
      };

      export default {
        stackName: 'test-stack',
        cloudProvider,
        backendProvider,
      };
    `;
    writeFileSync(join(testDir, 'creact.config.js'), configContent);

    // Create command context
    const ctx: CommandContext = {
      args: [],
      flags: {},
    };

    // Load config (with throwOnError for testing)
    const config = await loadConfigFromContext(ctx, true);

    // Verify
    expect(config.stackName).toBe('test-stack');
  });

  it('should load config from explicit path', async () => {
    // Create config in subdirectory
    const configDir = join(testDir, 'config');
    mkdirSync(configDir, { recursive: true });

    const configContent = `
      const cloudProvider = {
        materialize: () => {},
      };
      
      const backendProvider = {
        getState: async () => null,
        saveState: async () => {},
        deleteState: async () => {},
        listStacks: async () => [],
      };

      export default {
        stackName: 'custom-stack',
        cloudProvider,
        backendProvider,
      };
    `;
    writeFileSync(join(configDir, 'custom.config.js'), configContent);

    // Create command context with explicit config path
    const ctx: CommandContext = {
      args: [],
      flags: {
        config: './config/custom.config.js',
      },
    };

    // Load config (with throwOnError for testing)
    const config = await loadConfigFromContext(ctx, true);

    // Verify
    expect(config.stackName).toBe('custom-stack');
  });

  it('should apply verbose flag from CLI', async () => {
    // Create config
    const configContent = `
      const cloudProvider = {
        materialize: () => {},
      };
      
      const backendProvider = {
        getState: async () => null,
        saveState: async () => {},
        deleteState: async () => {},
        listStacks: async () => [],
      };

      export default {
        cloudProvider,
        backendProvider,
        verbose: false,
      };
    `;
    writeFileSync(join(testDir, 'creact.config.js'), configContent);

    // Create command context with verbose flag
    const ctx: CommandContext = {
      args: [],
      flags: {
        verbose: true,
      },
    };

    // Load config (with throwOnError for testing)
    const config = await loadConfigFromContext(ctx, true);

    // Verify verbose is overridden
    expect(config.verbose).toBe(true);
    expect(process.env.CREACT_VERBOSE).toBe('true');
  });

  it('should apply debug flag from CLI', async () => {
    // Create config
    const configContent = `
      const cloudProvider = {
        materialize: () => {},
      };
      
      const backendProvider = {
        getState: async () => null,
        saveState: async () => {},
        deleteState: async () => {},
        listStacks: async () => [],
      };

      export default {
        cloudProvider,
        backendProvider,
        debug: false,
      };
    `;
    writeFileSync(join(testDir, 'creact.config.js'), configContent);

    // Create command context with debug flag
    const ctx: CommandContext = {
      args: [],
      flags: {
        debug: true,
      },
    };

    // Load config (with throwOnError for testing)
    const config = await loadConfigFromContext(ctx, true);

    // Verify debug is overridden
    expect(config.debug).toBe(true);
    expect(process.env.CREACT_DEBUG).toBe('true');
  });

  it('should resolve entry path relative to config directory', async () => {
    // Create config in subdirectory
    const configDir = join(testDir, 'infra');
    mkdirSync(configDir, { recursive: true });

    const configContent = `
      const cloudProvider = {
        materialize: () => {},
      };
      
      const backendProvider = {
        getState: async () => null,
        saveState: async () => {},
        deleteState: async () => {},
        listStacks: async () => [],
      };

      export default {
        cloudProvider,
        backendProvider,
        entry: './app.ts',
      };
    `;
    writeFileSync(join(configDir, 'creact.config.js'), configContent);

    // Create command context
    const ctx: CommandContext = {
      args: [],
      flags: {
        config: './infra/creact.config.js',
      },
    };

    // Load config (with throwOnError for testing)
    const config = await loadConfigFromContext(ctx, true);

    // Verify entry is resolved relative to config directory
    expect(config.entry).toBe(join(configDir, 'app.ts'));
  });
});
