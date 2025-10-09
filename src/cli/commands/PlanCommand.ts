/**
 * Plan Command - shows diff between current and previous CloudDOM
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { Spinner, formatDiff } from '../output';
import { resolve } from 'path';
import { Reconciler } from '../../core/Reconciler';

export class PlanCommand extends BaseCommand {
  getName(): string {
    return 'plan';
  }

  getDescription(): string {
    return 'Show diff between current and previous CloudDOM';
  }

  async execute(): Promise<CommandResult> {
    const spinner = new Spinner(this.json);

    try {
      // Find entry file
      let entryPath: string;
      try {
        entryPath = CLIContextManager.findEntryFile(this.context.flags.entry);
        this.logVerbose(`Using entry file: ${entryPath}`);
      } catch (error) {
        return this.handleError(error as Error, 'Entry file resolution failed');
      }

      // Load entry file and create CLI instance
      spinner.start('Loading entry file and configuring providers...');
      
      let result;
      try {
        result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
        this.logVerbose(`Current CloudDOM built with ${result.cloudDOM.length} resources`);
      } catch (error) {
        spinner.fail('Failed to load entry file and configure providers');
        return this.handleError(error as Error, 'Entry file loading failed');
      }

      spinner.succeed('Entry file loaded and providers configured');

      // Load previous CloudDOM from backend
      spinner.start('Loading previous state...');
      
      let previousCloudDOM: any[] = [];
      
      try {
        const previousState = await result.instance.getBackendProvider().getState(result.stackName);
        if (previousState && previousState.cloudDOM) {
          previousCloudDOM = previousState.cloudDOM;
          this.logVerbose(`Previous CloudDOM loaded with ${previousCloudDOM.length} resources`);
        } else {
          this.logVerbose('No previous state found (first deployment)');
        }
      } catch (stateError) {
        this.logVerbose(`Could not load previous state: ${(stateError as Error).message}`);
        // Continue with empty previous state
      }

      spinner.succeed('Previous state loaded');

      // Compute diff using Reconciler
      spinner.start('Computing changes...');
      
      const reconciler = new Reconciler();
      
      const changeSet = reconciler.reconcile(previousCloudDOM, result.cloudDOM);
      
      this.logVerbose(`Changes computed: ${changeSet.creates.length} creates, ${changeSet.updates.length} updates, ${changeSet.deletes.length} deletes, ${changeSet.replacements.length} replacements`);

      spinner.succeed('Changes computed');

      // Check if there are any changes
      const hasChanges = 
        changeSet.creates.length > 0 ||
        changeSet.updates.length > 0 ||
        changeSet.deletes.length > 0 ||
        changeSet.replacements.length > 0 ||
        changeSet.moves.length > 0;

      if (!hasChanges) {
        return this.handleSuccess('No changes detected', {
          changes: {
            creates: 0,
            updates: 0,
            deletes: 0,
            replacements: 0,
            moves: 0,
            total: 0
          }
        });
      }

      // Output results
      const totalChanges = changeSet.creates.length + changeSet.updates.length + 
                          changeSet.deletes.length + changeSet.replacements.length + 
                          changeSet.moves.length;

      const message = `Plan complete: ${totalChanges} changes`;

      if (this.json) {
        const diffVisualization = reconciler.generateDiffVisualization(changeSet);
        
        return this.handleSuccess(message, {
          summary: diffVisualization.summary,
          changes: diffVisualization.changes,
          deployment: diffVisualization.deployment
        });
      } else {
        // Human-readable colored output
        this.printDiff(changeSet);
        
        if (this.verbose) {
          this.printVerboseOutput(changeSet);
        }
        
        return this.handleSuccess(message);
      }

    } catch (error) {
      return this.handleError(error as Error, 'Plan failed');
    }
  }

  private printDiff(changeSet: any): void {
    console.log(formatDiff(changeSet));
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