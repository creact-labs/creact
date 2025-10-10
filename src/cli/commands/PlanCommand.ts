
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
 * Plan Command - shows diff between current and previous CloudDOM
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { createOutputManager } from '../../utils/Output';
import { Reconciler } from '../../core/Reconciler';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

export class PlanCommand extends BaseCommand {
  getName(): string {
    return 'plan';
  }

  getDescription(): string {
    return 'Show diff between current and previous CloudDOM';
  }

  async execute(): Promise<CommandResult> {
    const output = createOutputManager({
      json: this.json,
      quiet: !!this.context.flags.quiet,
      verbose: this.verbose,
    });

    try {
      // Find entry file
      logger.debug('PlanCommand: Starting execution');
      let entryPath: string;
      try {
        entryPath = CLIContextManager.findEntryFile(this.context.flags.entry);
        logger.debug(`PlanCommand: Entry file resolved to ${entryPath}`);
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
        logger.debug(
          `PlanCommand: Current CloudDOM built with ${result.cloudDOM.length} resources`
        );
      } catch (error) {
        output.showError('Failed to load entry file and configure providers', {
          cause: (error as Error).message,
          stackTrace: this.verbose ? (error as Error).stack : undefined,
        });
        return { exitCode: 1 };
      }

      output.showSuccess('Entry file loaded and providers configured');

      // Load previous CloudDOM from backend
      output.showInfo('Loading previous state...');

      let previousCloudDOM: any[] = [];

      try {
        const previousState = await result.instance.getBackendProvider().getState(result.stackName);
        if (previousState && previousState.cloudDOM) {
          previousCloudDOM = previousState.cloudDOM;
          logger.debug(
            `PlanCommand: Previous CloudDOM loaded with ${previousCloudDOM.length} resources`
          );
        } else {
          logger.debug('PlanCommand: No previous state found (first deployment)');
        }
      } catch (stateError) {
        logger.debug(
          `PlanCommand: Could not load previous state: ${(stateError as Error).message}`
        );
        // Continue with empty previous state
      }

      output.showSuccess('Previous state loaded');

      // Compute diff using Reconciler
      output.showInfo('Computing changes...');

      const reconciler = new Reconciler();

      const changeSet = reconciler.reconcile(previousCloudDOM, result.cloudDOM);

      logger.debug(
        `PlanCommand: Changes computed: ${changeSet.creates.length} creates, ${changeSet.updates.length} updates, ${changeSet.deletes.length} deletes, ${changeSet.replacements.length} replacements`
      );

      output.showSuccess('Changes computed');

      // Check if there are any changes
      const hasChanges =
        changeSet.creates.length > 0 ||
        changeSet.updates.length > 0 ||
        changeSet.deletes.length > 0 ||
        changeSet.replacements.length > 0 ||
        changeSet.moves.length > 0;

      // Display plan
      output.showPlanHeader(result.stackName);
      output.showPlanChanges(changeSet);
      output.showPlanSummary(changeSet);

      if (this.verbose && !this.json) {
        this.printVerboseOutput(changeSet);
      }

      if (!hasChanges) {
        return { exitCode: 0 };
      }

      // Output results
      const totalChanges =
        changeSet.creates.length +
        changeSet.updates.length +
        changeSet.deletes.length +
        changeSet.replacements.length +
        changeSet.moves.length;

      if (this.json) {
        const diffVisualization = reconciler.generateDiffVisualization(changeSet);

        console.log(
          JSON.stringify(
            {
              status: 'success',
              message: `Plan complete: ${totalChanges} changes`,
              summary: diffVisualization.summary,
              changes: diffVisualization.changes,
              deployment: diffVisualization.deployment,
            },
            null,
            2
          )
        );
      }

      return { exitCode: 0 };
    } catch (error) {
      output.showError('Plan failed', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
      return { exitCode: 1 };
    }
  }

  private printVerboseOutput(changeSet: any): void {
    console.log('\nDeployment Order:');
    changeSet.deploymentOrder.forEach((nodeId: string, index: number) => {
      console.log(`  ${String(index + 1).padStart(2)}. ${nodeId}`);
    });

    if (changeSet.parallelBatches.length > 1) {
      console.log('\nParallel Batches:');
      changeSet.parallelBatches.forEach((batch: string[], index: number) => {
        console.log(`  Batch ${index + 1}: ${batch.join(', ')}`);
      });
    }
  }
}
