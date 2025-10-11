
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
 * Dev Command - hot reload development mode with auto/manual approval
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { createOutputManager, OutputManager, DeployResult } from '../../utils/Output';
import { watch } from 'fs';
import { resolve, dirname } from 'path';
import { createInterface } from 'readline';
import { Reconciler, getTotalChanges } from '../../core/Reconciler';
import { LoggerFactory } from '../../utils/Logger';
import chalk from 'chalk';

const logger = LoggerFactory.getLogger('cli');

interface DevState {
  lastCloudDOM: any[] | null;
  lastStackName: string | null;
  instance: any | null;
}

export class DevCommand extends BaseCommand {
  private isWatching = false;
  private watchTimeout: NodeJS.Timeout | null = null;
  private autoApprove: boolean = false;
  private currentReadline: any = null;
  private output!: OutputManager;
  private state: DevState = {
    lastCloudDOM: null,
    lastStackName: null,
    instance: null,
  };

  getName(): string {
    return 'dev';
  }

  getDescription(): string {
    return 'Hot reload development mode with auto/manual approval';
  }

  async execute(): Promise<CommandResult> {
    this.output = createOutputManager({
      json: this.json,
      quiet: !!this.context.flags.quiet,
      verbose: this.verbose,
    });

    try {
      // Check for auto-approve flag
      this.autoApprove = !!this.context.flags['auto-approve'] || !!this.context.flags.auto;

      // Find entry file
      logger.debug('DevCommand: Starting execution');
      let entryPath: string;
      try {
        entryPath = CLIContextManager.findEntryFile(this.context.flags.entry);
        logger.debug(`DevCommand: Entry file resolved to ${entryPath}`);
      } catch (error) {
        this.output.showError('Entry file resolution failed', {
          cause: (error as Error).message,
          stackTrace: this.verbose ? (error as Error).stack : undefined,
        });
        return { exitCode: 1 };
      }

      // Show mode information
      this.output.showInfo('Starting CReact development mode...');
      const mode = this.autoApprove ? chalk.yellow('Auto-approve') : chalk.blue('Manual approval');
      this.output.showInfo(`Mode: ${mode}`);

      if (!this.autoApprove) {
        this.output.showInfo('Tip: Use --auto-approve to automatically deploy changes');
      }

      // Start file watching BEFORE initial deploy
      this.startWatching(entryPath);

      // Initial build and deploy
      await this.performInitialDeploy(entryPath);

      // Keep process alive
      this.output.showInfo('Watching for changes... (Press Ctrl+C to stop)');

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        this.output.showInfo('\nStopping development mode...');
        this.stopWatching();
        process.exit(0);
      });

      // Keep the process alive indefinitely
      await this.keepAlive();

      return { exitCode: 0 };
    } catch (error) {
      this.output.showError('Dev mode failed to start', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
      return { exitCode: 1 };
    }
  }

  private async performInitialDeploy(entryPath: string): Promise<void> {
    try {
      this.output.showInfo('Building initial state...');

      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
      logger.debug(`DevCommand: Initial CloudDOM built with ${result.cloudDOM.length} resources`);

      // Load backend state for comparison
      let previousCloudDOM: any[] = [];
      try {
        const backendState = await result.instance.getBackendProvider().getState(result.stackName);
        previousCloudDOM = backendState?.cloudDOM || [];
      } catch (error) {
        logger.debug(`DevCommand: Could not load previous state: ${(error as Error).message}`);
      }

      // Compute diff using Reconciler
      const reconciler = new Reconciler();
      const changeSet = reconciler.reconcile(previousCloudDOM, result.cloudDOM);
      const totalChanges = getTotalChanges(changeSet);

      logger.debug(`DevCommand: Total changes: ${totalChanges}`);

      // Store state for future comparisons
      this.state.lastCloudDOM = result.cloudDOM;
      this.state.lastStackName = result.stackName;
      this.state.instance = result.instance;

      // Check if there are any changes
      if (totalChanges === 0) {
        this.output.showSuccess('No changes detected - infrastructure is up to date');
        return;
      }

      this.output.showSuccess(`Changes detected: ${totalChanges} changes`);

      // Show plan
      this.output.showPlanHeader(result.stackName);
      this.output.showPlanChanges(changeSet);
      this.output.showPlanSummary(changeSet);

      if (this.autoApprove) {
        this.output.showWarning('Auto-approving changes...');
        await this.deployChanges(result, changeSet);
      } else {
        const shouldDeploy = await this.promptForApproval();
        if (shouldDeploy) {
          await this.deployChanges(result, changeSet);
        } else {
          this.output.showInfo('Deployment skipped');
        }
      }
    } catch (error) {
      this.output.showError('Initial deployment failed', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
    }
  }

  private async performHotReload(entryPath: string): Promise<void> {
    try {
      this.output.showHotReloadStart();

      if (!this.state.lastCloudDOM || !this.state.instance) {
        this.output.showError('No previous state found');
        return;
      }

      // Create new instance
      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
      logger.debug(
        `DevCommand: Hot reload CloudDOM built with ${result.cloudDOM.length} resources`
      );

      // Load drift-corrected state for comparison
      let previousCloudDOM = this.state.lastCloudDOM;
      try {
        const backendState = await result.instance.getBackendProvider().getState(result.stackName);
        previousCloudDOM = backendState?.cloudDOM || this.state.lastCloudDOM;
        logger.debug(
          `DevCommand: Comparing against drift-corrected state with ${previousCloudDOM?.length || 0} resources`
        );
      } catch (error) {
        logger.debug(`DevCommand: Using cached state for comparison: ${(error as Error).message}`);
      }

      // Compute diff using Reconciler
      const reconciler = new Reconciler();
      const changeSet = reconciler.reconcile(previousCloudDOM, result.cloudDOM);
      const totalChanges = getTotalChanges(changeSet);

      logger.debug(`DevCommand: Hot reload total changes: ${totalChanges}`);

      // Always update state to preserve reactive changes
      this.state.lastCloudDOM = result.cloudDOM;
      this.state.instance = result.instance;

      // Check if there are any changes
      if (totalChanges === 0) {
        this.output.showSuccess('No changes detected');
        return;
      }

      this.output.showSuccess(`Changes detected: ${totalChanges} changes`);

      // Show plan
      this.output.showPlanHeader(result.stackName);
      this.output.showPlanChanges(changeSet);
      this.output.showPlanSummary(changeSet);

      if (this.autoApprove) {
        this.output.showWarning('Auto-approving changes...');
        await this.deployChanges(result, changeSet);
      } else {
        const shouldDeploy = await this.promptForApproval();
        if (shouldDeploy) {
          await this.deployChanges(result, changeSet);
        } else {
          this.output.showInfo('Changes skipped');
        }
      }
    } catch (error) {
      this.output.showError('Hot reload failed', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
    }
  }

  private async deployChanges(result: any, changeSet: any): Promise<void> {
    try {
      // Reactive deployment loop - continue until no more changes
      let deploymentCycle = 1;
      let hasMoreChanges = true;
      let currentCloudDOM = result.cloudDOM;

      while (hasMoreChanges) {
        if (deploymentCycle > 1) {
          this.output.showInfo(`\nReactive deployment cycle #${deploymentCycle}`);
        }

        this.output.showDeployHeader();

        const startTime = Date.now();

        // Deploy
        await result.instance.deploy(currentCloudDOM, result.stackName, 'dev-user');

        const duration = (Date.now() - startTime) / 1000;

        // Update state
        this.state.lastCloudDOM = currentCloudDOM;

        const deployResult: DeployResult = {
          resourceCount: currentCloudDOM.length,
          duration,
          creates: changeSet.creates.length,
          updates: changeSet.updates.length,
          deletes: changeSet.deletes.length,
        };

        this.output.showDeploySummary(deployResult);

        // Check if reactive changes were detected
        const reactiveInfo = await result.instance.getReactiveDeploymentInfo(result.stackName);

        if (reactiveInfo && getTotalChanges(reactiveInfo.changeSet) > 0) {
          this.output.showReactiveChangesDetected();
          this.output.showPlanChanges(reactiveInfo.changeSet);
          this.output.showPlanSummary(reactiveInfo.changeSet);

          let shouldContinue = this.autoApprove;

          if (!this.autoApprove) {
            shouldContinue = await this.promptForApproval();
          } else {
            this.output.showWarning('Auto-approving reactive changes...');
          }

          if (shouldContinue) {
            currentCloudDOM = reactiveInfo.cloudDOM;
            changeSet = reactiveInfo.changeSet;
            deploymentCycle++;
          } else {
            this.output.showInfo('Reactive changes skipped');
            hasMoreChanges = false;
          }
        } else {
          hasMoreChanges = false;
        }
      }
    } catch (error) {
      this.output.showError('Deployment failed', {
        cause: (error as Error).message,
        stackTrace: this.verbose ? (error as Error).stack : undefined,
      });
    }
  }

  private async promptForApproval(): Promise<boolean> {
    // Close any existing readline interface
    if (this.currentReadline) {
      this.currentReadline.close();
      this.currentReadline = null;
    }

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.currentReadline = rl;

    return new Promise((resolve) => {
      rl.question(chalk.bold('Deploy these changes? (y/N/a=auto-approve): '), (answer) => {
        this.currentReadline = null;
        rl.close();

        const response = answer.toLowerCase().trim();

        if (response === 'a' || response === 'auto') {
          this.output.showWarning('Switching to auto-approve mode');
          this.autoApprove = true;
          resolve(true);
        } else if (response === 'y' || response === 'yes') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  private startWatching(entryPath: string): void {
    if (this.isWatching) return;

    this.isWatching = true;
    const absoluteEntryPath = resolve(process.cwd(), entryPath);
    const entryDir = dirname(absoluteEntryPath);

    logger.debug(`DevCommand: Watching directory: ${entryDir}`);

    try {
      watch(entryDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Skip certain file types
        if (this.shouldIgnoreFile(filename)) {
          return;
        }

        logger.debug(`DevCommand: File event: ${eventType} - ${filename}`);

        // Debounce file changes
        if (this.watchTimeout) {
          clearTimeout(this.watchTimeout);
        }

        this.watchTimeout = setTimeout(() => {
          // Skip hot reload if we don't have initial state yet
          if (!this.state.lastCloudDOM) {
            logger.debug('DevCommand: Skipping hot reload - waiting for initial deployment');
            return;
          }

          // Cancel any pending prompts
          if (this.currentReadline) {
            this.output.showInfo('\nNew changes detected, canceling previous prompt...');
            this.currentReadline.close();
            this.currentReadline = null;
          }

          this.output.showFileChanged(filename);
          this.performHotReload(entryPath);
        }, 300);
      });

      logger.debug('DevCommand: File watcher started successfully');
    } catch (error) {
      logger.warn(`DevCommand: Could not watch ${entryDir}: ${(error as Error).message}`);
    }
  }

  private shouldIgnoreFile(filename: string): boolean {
    // Only watch TypeScript and JavaScript files
    const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const hasAllowedExtension = allowedExtensions.some((ext) => filename.endsWith(ext));

    if (!hasAllowedExtension) {
      return true;
    }

    // Ignore certain patterns
    const ignoredPatterns = ['node_modules', '.git', 'dist', '.next', '.cache', 'test', 'spec'];

    if (ignoredPatterns.some((pattern) => filename.includes(pattern))) {
      return true;
    }

    return false;
  }

  private async keepAlive(): Promise<never> {
    return new Promise(() => {
      // This promise never resolves, keeping the process alive
    });
  }

  private stopWatching(): void {
    this.isWatching = false;
    if (this.watchTimeout) {
      clearTimeout(this.watchTimeout);
      this.watchTimeout = null;
    }
  }
}
