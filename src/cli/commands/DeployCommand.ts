
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
 * Deploy Command - deploys CloudDOM to cloud provider
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { createOutputManager, DeployResult } from '../../utils/Output';
import { Reconciler } from '../../core/Reconciler';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

export class DeployCommand extends BaseCommand {
  getName(): string {
    return 'deploy';
  }

  getDescription(): string {
    return 'Deploy CloudDOM to cloud provider';
  }

  async execute(): Promise<CommandResult> {
    const output = createOutputManager({
      json: this.json,
      quiet: !!this.context.flags.quiet,
      verbose: this.verbose,
    });
    const dryRun = !!this.context.flags['dry-run'];

    try {
      // Find entry file
      logger.debug('DeployCommand: Starting execution');
      let entryPath: string;
      try {
        entryPath = CLIContextManager.findEntryFile(this.context.flags.entry);
        logger.debug(`DeployCommand: Entry file resolved to ${entryPath}`);
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
        logger.debug(`DeployCommand: CloudDOM built with ${result.cloudDOM.length} resources`);
      } catch (error) {
        output.showError('Failed to load entry file and configure providers', {
          cause: (error as Error).message,
          stackTrace: this.verbose ? (error as Error).stack : undefined,
        });
        return { exitCode: 1 };
      }

      output.showSuccess('Entry file loaded and providers configured');

      // Validate providers
      output.showInfo('Validating providers...');

      if (!result.instance.getCloudProvider()) {
        output.showError('Cloud provider not configured', {
          cause: 'CReact.cloudProvider must be set in entry file',
        });
        return { exitCode: 1 };
      }

      if (!result.instance.getBackendProvider()) {
        output.showError('Backend provider not configured', {
          cause: 'CReact.backendProvider must be set in entry file',
        });
        return { exitCode: 1 };
      }

      output.showSuccess('Providers validated');

      // Load previous state and show plan
      output.showInfo('Loading previous state...');
      let previousCloudDOM: any[] = [];

      try {
        const previousState = await result.instance.getBackendProvider().getState(result.stackName);
        if (previousState && previousState.cloudDOM) {
          previousCloudDOM = previousState.cloudDOM;
          logger.debug(
            `DeployCommand: Previous CloudDOM loaded with ${previousCloudDOM.length} resources`
          );
        } else {
          logger.debug('DeployCommand: No previous state found (first deployment)');
        }
      } catch (stateError) {
        logger.debug(
          `DeployCommand: Could not load previous state: ${(stateError as Error).message}`
        );
      }

      // Compute and show plan
      const reconciler = new Reconciler();
      const changeSet = reconciler.reconcile(previousCloudDOM, result.cloudDOM);

      output.showPlanHeader(result.stackName);
      output.showPlanChanges(changeSet);
      output.showPlanSummary(changeSet);

      if (dryRun) {
        logger.debug('DeployCommand: Dry run mode - deployment will be simulated');
        output.showInfo('Dry run mode - no changes will be applied');
        return { exitCode: 0 };
      }

      // Deploy using CReact instance
      output.showDeployHeader();

      const startTime = Date.now();
      const deployedResources: string[] = [];

      try {
        // Track deployment progress
        for (const nodeId of changeSet.deploymentOrder) {
          const node = [...changeSet.creates, ...changeSet.updates].find((n) => n.id === nodeId);
          if (node) {
            const action = changeSet.creates.includes(node) ? 'Creating' : 'Updating';
            const resourceStart = Date.now();

            output.showResourceProgress(nodeId, action);

            // Actual deployment happens in CReact.deploy()
            // This is just for progress tracking
            deployedResources.push(nodeId);

            const resourceDuration = (Date.now() - resourceStart) / 1000;
            output.showResourceComplete(nodeId, action.replace('ing', 'ed'), resourceDuration);
          }
        }

        await result.instance.deploy(result.cloudDOM, result.stackName, 'cli-user');

        const duration = (Date.now() - startTime) / 1000;
        const deployResult: DeployResult = {
          resourceCount: result.cloudDOM.length,
          duration,
          creates: changeSet.creates.length,
          updates: changeSet.updates.length,
          deletes: changeSet.deletes.length,
        };

        output.showDeploySummary(deployResult);

        if (this.json) {
          console.log(
            JSON.stringify(
              {
                status: 'success',
                ...deployResult,
                stackName: result.stackName,
                entryFile: entryPath,
              },
              null,
              2
            )
          );
        }

        return { exitCode: 0 };
      } catch (deployError) {
        const duration = (Date.now() - startTime) / 1000;
        const deployResult: DeployResult = {
          resourceCount: result.cloudDOM.length,
          duration,
          creates: changeSet.creates.length,
          updates: changeSet.updates.length,
          deletes: changeSet.deletes.length,
          errors: [{ resourceId: 'unknown', message: (deployError as Error).message }],
        };

        output.showDeploySummary(deployResult);
        output.showError('Deployment failed', {
          cause: (deployError as Error).message,
          stackTrace: this.verbose ? (deployError as Error).stack : undefined,
        });
        return { exitCode: 1 };
      }
    } catch (error) {
      output.showError('Deploy command failed', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
      return { exitCode: 1 };
    }
  }
}
