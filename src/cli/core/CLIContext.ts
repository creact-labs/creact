
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
 * CLI Context - shared context for all CLI commands
 * Handles entry file loading and CReact instance creation
 */

import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import { CReact } from '../../core/CReact';
import { CloudDOMNode } from '../../core/types';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

export interface CLIFlags {
  entry?: string;
  verbose?: boolean;
  json?: boolean;
  'dry-run'?: boolean;
  'auto-approve'?: boolean;
  auto?: boolean;
  help?: boolean;
  h?: boolean;
  version?: boolean;
  V?: boolean;
  [key: string]: string | boolean | undefined;
}

export interface CLIContext {
  args: string[];
  flags: CLIFlags;
}

export interface CLIResult {
  instance: CReact;
  stackName: string;
  cloudDOM: CloudDOMNode[];
  entryPath: string;
}

/**
 * CLI Context Manager - handles entry file loading and instance creation
 */
export class CLIContextManager {
  /**
   * Find entry file with fallback logic
   */
  static findEntryFile(specifiedPath?: string): string {
    let entryPath = specifiedPath || 'index.ts';

    // If default index.ts doesn't exist, try other common entry files
    if (entryPath === 'index.ts' && !existsSync(resolve(process.cwd(), entryPath))) {
      const alternatives = ['index.tsx', 'index.js', 'index.jsx', 'app.ts', 'app.tsx'];

      for (const alt of alternatives) {
        if (existsSync(resolve(process.cwd(), alt))) {
          return alt;
        }
      }

      throw new Error(`Entry file not found: ${entryPath}. Tried: ${alternatives.join(', ')}`);
    }

    // Final check if entry file exists
    if (!existsSync(resolve(process.cwd(), entryPath))) {
      throw new Error(`Entry file not found: ${entryPath}`);
    }

    return entryPath;
  }

  /**
   * Load entry file and create CReact instance using configured providers
   * This is the React way - load configuration, then create instances as needed
   */
  static async createCLIInstance(entryPath: string, verbose: boolean = false): Promise<CLIResult> {
    const absoluteEntryPath = resolve(process.cwd(), entryPath);

    // Handle TypeScript files
    const fileExtension = extname(entryPath);
    const isTypeScript = ['.ts', '.tsx'].includes(fileExtension);

    if (isTypeScript) {
      try {
        const { dirname } = require('path');
        const entryDir = dirname(absoluteEntryPath);
        const localTsConfig = resolve(entryDir, 'tsconfig.json');

        // Use ts-node with explicit JSX configuration for CReact
        require('ts-node').register({
          project: existsSync(localTsConfig) ? localTsConfig : undefined,
          transpileOnly: true, // Faster compilation, skip type checking (IDE handles that)
          compilerOptions: {
            module: 'commonjs',
            target: 'es2020',
            jsx: 'react',
            jsxFactory: 'CReact.createElement',
            jsxFragmentFactory: 'CReact.Fragment',
          },
        });
        if (verbose) {
          logger.debug(`TypeScript loader registered (ts-node)`);
          if (existsSync(localTsConfig)) {
            logger.debug(`Using tsconfig: ${localTsConfig}`);
          }
        }
      } catch (tsNodeError) {
        throw new Error(
          'TypeScript entry files require ts-node. Install with: npm install --save-dev ts-node'
        );
      }
    }

    // Clear require cache to allow reloading
    delete require.cache[absoluteEntryPath];
    if (verbose) logger.debug('Cleared module cache');

    // Load the entry module - this configures the providers
    let entryModule;
    try {
      entryModule = require(absoluteEntryPath);
      if (verbose) logger.debug('Entry module loaded successfully');
    } catch (loadError) {
      throw new Error(
        `Could not load entry file: ${entryPath}\nError: ${(loadError as Error).message}`
      );
    }

    // IMPORTANT: Get the CReact class from the entry module's require cache
    // This ensures we use the same instance that the entry file configured
    // The entry file imports CReact, which gets cached in require.cache
    // We need to find that cached module and use its CReact instance

    let CReactClass: typeof CReact | null = null;

    // Look through require.cache to find the CReact module that was loaded
    for (const [modulePath, cachedModule] of Object.entries(require.cache)) {
      if (modulePath.includes('CReact') && cachedModule?.exports?.CReact) {
        CReactClass = cachedModule.exports.CReact;
        if (verbose) logger.debug('Found CReact in require cache:', modulePath);
        break;
      }
    }

    if (!CReactClass) {
      throw new Error(
        'Could not find CReact class in require cache. Entry file must import CReact.'
      );
    }

    // Debug: Check provider status
    if (verbose) {
      logger.debug('Checking providers after module load:');
      logger.debug('  cloudProvider:', !!CReactClass.cloudProvider);
      logger.debug('  backendProvider:', !!CReactClass.backendProvider);
    }

    // Validate that providers are configured (they should be after loading entry file)
    if (!CReactClass.cloudProvider || !CReactClass.backendProvider) {
      throw new Error(
        'CReact providers must be configured in entry file before calling renderCloudDOM'
      );
    }

    // Create a CLI instance using the same providers (React way)
    const instance = new CReactClass({
      cloudProvider: CReactClass.cloudProvider,
      backendProvider: CReactClass.backendProvider,
      migrationMap: CReactClass.migrationMap,
      asyncTimeout: CReactClass.asyncTimeout,
    });

    // Get the JSX element from the entry module
    // We need to extract the JSX element that was passed to renderCloudDOM
    // For now, we'll get it from the default export promise, but we need the JSX
    let cloudDOMPromise = entryModule.default;

    // If default export is a function, call it to get the promise
    if (typeof cloudDOMPromise === 'function') {
      cloudDOMPromise = cloudDOMPromise();
    }

    if (!cloudDOMPromise || typeof cloudDOMPromise.then !== 'function') {
      throw new Error(
        'Entry file must export a default Promise from CReact.renderCloudDOM() or a function that returns one'
      );
    }

    // Await the CloudDOM promise to ensure providers are configured
    const cloudDOM = await cloudDOMPromise;

    if (!Array.isArray(cloudDOM)) {
      throw new Error('CloudDOM must be an array of nodes');
    }

    // Get the instance that was used to build the CloudDOM (has the Fiber tree)
    const lastInstanceData = CReactClass.getLastInstance();
    if (lastInstanceData) {
      // Use the same instance that built the CloudDOM
      return {
        instance: lastInstanceData.instance,
        stackName: lastInstanceData.stackName,
        cloudDOM,
        entryPath,
      };
    }

    // Fallback: Extract stack name from environment or use default
    const stackName = process.env.STACK_NAME || 'default';

    return { instance, stackName, cloudDOM, entryPath };
  }
}
