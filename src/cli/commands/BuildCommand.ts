
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
 * Build Command - builds CloudDOM from entry file
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { createOutputManager } from '../../utils/Output';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

export class BuildCommand extends BaseCommand {
  getName(): string {
    return 'build';
  }

  getDescription(): string {
    return 'Build CloudDOM from entry file';
  }

  async execute(): Promise<CommandResult> {
    const output = createOutputManager({
      json: this.json,
      quiet: !!this.context.flags.quiet,
      verbose: this.verbose,
    });

    try {
      // Find entry file
      logger.debug('BuildCommand: Starting execution');
      let entryPath: string;
      try {
        entryPath = CLIContextManager.findEntryFile(this.context.flags.entry);
        logger.debug(`BuildCommand: Entry file resolved to ${entryPath}`);
      } catch (error) {
        output.showError('Entry file resolution failed', {
          cause: (error as Error).message,
          stackTrace: this.verbose ? (error as Error).stack : undefined,
        });
        return { exitCode: 1 };
      }

      // Load entry file and create CLI instance
      output.showInfo('Loading entry file and configuring providers...');

      let result;
      try {
        result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
        logger.debug(`BuildCommand: CloudDOM built with ${result.cloudDOM.length} resources`);
      } catch (error) {
        output.showError('Failed to load entry file and configure providers', {
          cause: (error as Error).message,
          stackTrace: this.verbose ? (error as Error).stack : undefined,
        });
        return { exitCode: 1 };
      }

      output.showSuccess('Entry file loaded and providers configured');

      // Success output
      const message = `Build complete: ${result.cloudDOM.length} resources`;

      if (this.verbose && !this.json) {
        this.printVerboseOutput(result, output);
      }

      output.showSuccess(message);

      if (this.json) {
        console.log(
          JSON.stringify(
            {
              status: 'success',
              resourceCount: result.cloudDOM.length,
              entryFile: entryPath,
              stackName: result.stackName,
              resources: result.cloudDOM.map((node: any) => ({
                id: node.id,
                type: node.construct?.name || 'Unknown',
                path: node.path,
              })),
            },
            null,
            2
          )
        );
      }

      return { exitCode: 0 };
    } catch (error) {
      output.showError('Build failed', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
      return { exitCode: 1 };
    }
  }

  private printVerboseOutput(result: any, output: any): void {
    console.log('\nCloudDOM Summary:');
    const resourceCounts = this.countResources(result.cloudDOM);

    if (Object.keys(resourceCounts).length === 0) {
      console.log('  No resources found');
    } else {
      for (const [type, count] of Object.entries(resourceCounts)) {
        console.log(`  ${type}: ${count}`);
      }
    }

    // Show first few resource IDs for debugging
    if (result.cloudDOM.length > 0) {
      console.log('\nResource IDs:');
      const sampleIds = result.cloudDOM.slice(0, 5).map((node: any) => node.id);
      sampleIds.forEach((id: string) => {
        console.log(`  • ${id}`);
      });

      if (result.cloudDOM.length > 5) {
        console.log(`  ... and ${result.cloudDOM.length - 5} more`);
      }
    }
  }

  private countResources(cloudDOM: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        const type = node.construct?.name || 'Unknown';
        counts[type] = (counts[type] || 0) + 1;

        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };

    walk(cloudDOM);
    return counts;
  }
}
