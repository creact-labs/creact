/**
 * Dev Command - hot reload development mode with auto/manual approval
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { Spinner, colors, formatDiff } from '../output';
import { watch } from 'fs';
import { resolve, dirname } from 'path';
import { createInterface } from 'readline';
import { Reconciler, getTotalChanges } from '../../core/Reconciler';
import { getReactiveUpdateQueue } from '../../core/ReactiveUpdateQueue';
import { LoggerFactory } from '../../utils/Logger';

const logger = LoggerFactory.getLogger('cli');

interface DevState {
  lastCloudDOM: any[] | null;
  lastStackName: string | null;
  instance: any | null;
  lastFiberTree: any | null;
  reactiveState: Map<string, any> | null;
}

export class DevCommand extends BaseCommand {
  private isWatching = false;
  private watchTimeout: NodeJS.Timeout | null = null;
  private autoApprove: boolean = false;
  private currentReadline: any = null; // Track active readline interface
  private state: DevState = {
    lastCloudDOM: null,
    lastStackName: null,
    instance: null,
    lastFiberTree: null,
    reactiveState: null
  };

  getName(): string {
    return 'dev';
  }

  getDescription(): string {
    return 'Hot reload development mode with auto/manual approval';
  }

  async execute(): Promise<CommandResult> {
    const spinner = new Spinner(this.json);

    try {
      // Check for auto-approve flag
      this.autoApprove = !!this.context.flags['auto-approve'] || !!this.context.flags.auto;

      // Find entry file
      let entryPath: string;
      try {
        entryPath = CLIContextManager.findEntryFile(this.context.flags.entry);
        this.logVerbose(`Using entry file: ${entryPath}`);
      } catch (error) {
        return this.handleError(error as Error, 'Entry file resolution failed');
      }

      // Show mode information
      logger.info('🚀 Starting CReact development mode...');
      logger.info(`📋 Mode: ${this.autoApprove ? colors.warning('Auto-approve') : colors.info('Manual approval')}`);

      if (!this.autoApprove) {
        logger.info('� tTip: Use --auto-approve to automatically deploy changes');
      }

      // Start file watching BEFORE initial deploy
      // This ensures we can detect changes even while waiting for approval
      this.startWatching(entryPath, spinner);

      // Initial build and deploy
      await this.performInitialDeploy(entryPath, spinner);

      // Keep process alive
      logger.info('👀 Watching for changes... (Press Ctrl+C to stop)');

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('\n👋 Stopping development mode...');
        this.stopWatching();
        process.exit(0);
      });

      // Keep the process alive indefinitely
      await this.keepAlive();

      // This line will never be reached, but TypeScript needs it
      return { exitCode: 0, message: 'Development mode started' };

    } catch (error) {
      return this.handleError(error as Error, 'Dev mode failed to start');
    }
  }

  private async performInitialDeploy(entryPath: string, spinner: Spinner): Promise<void> {
    try {
      spinner.start('Building initial state...');

      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);

      // Load backend state for comparison
      const backendState = await result.instance.getBackendState(result.stackName);
      const previousCloudDOM = backendState?.cloudDOM || [];

      // Compute diff using Reconciler
      const reconciler = new Reconciler();

      const changeSet = reconciler.reconcile(previousCloudDOM, result.cloudDOM);

      // Use single source of truth for change counting
      const totalChanges = getTotalChanges(changeSet);
 
      // Debug: Log the changeset structure with node IDs
      if (this.verbose) {
        logger.info('\n🔍 Debug: ChangeSet structure:');
        logger.info(`  creates: ${changeSet.creates.length}`, changeSet.creates.map((n: any) => n.id));
        logger.info(`  updates: ${changeSet.updates.length}`, changeSet.updates.map((n: any) => n.id));
        logger.info(`  deletes: ${changeSet.deletes.length}`, changeSet.deletes.map((n: any) => n.id));
        logger.info(`  replacements: ${changeSet.replacements.length}`, changeSet.replacements.map((n: any) => n.id));
        logger.info(`  moves: ${changeSet.moves.length}`);
        
        if (changeSet.moves.length > 0) {
          logger.info('\n  Move details:');
          changeSet.moves.forEach((move: any) => {
            logger.info(`    ${move.nodeId}: "${move.from}" → "${move.to}"`);
          });
        }
        
        logger.info(`  Total changes: ${totalChanges}`);
      }

      // Store state for future comparisons
      this.state.lastCloudDOM = result.cloudDOM;
      this.state.lastStackName = result.stackName;
      this.state.instance = result.instance;

      // Check if there are any changes
      if (totalChanges === 0) {
        spinner.succeed('✅ No changes detected - infrastructure is up to date');
        return;
      }

      spinner.succeed(`📋 Changes detected: ${totalChanges} changes`);

      // Show diff
      logger.info(formatDiff(changeSet));

      if (this.autoApprove) {
        // Auto-approve mode: deploy immediately
        logger.info(colors.warning('🚀 Auto-approving changes...'));
        await this.deployChanges(result, spinner);
      } else {
        // Manual approval mode: ask user
        const shouldDeploy = await this.promptForApproval();

        if (shouldDeploy) {
          await this.deployChanges(result, spinner);
        } else {
          logger.info(colors.info('⏭️  Deployment skipped'));
        }
      }

    } catch (error) {
      spinner.fail('❌ Initial deployment failed');
      logger.error(`Error: ${(error as Error).message}`);

      if (this.verbose && (error as Error).stack) {
        logger.error((error as Error).stack);
      }
    }
  }

  private async performHotReload(entryPath: string, spinner: Spinner): Promise<void> {
    try {
      spinner.start('Building changes with state preservation...');

      if (!this.state.lastCloudDOM || !this.state.instance) {
        spinner.fail('❌ No previous state found');
        return;
      }

      // Create new instance (this will build and become the global instance)
      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);

      // NOTE: The hydration is already prepared inside build() when it loads previous state
      // No need to call loadStateForHydration() here - it's automatic!

      // Compute diff using Reconciler
      const reconciler = new Reconciler();

      const changeSet = reconciler.reconcile(this.state.lastCloudDOM, result.cloudDOM);

      // Use single source of truth for change counting
      const totalChanges = getTotalChanges(changeSet);

      // Debug: Show outputs comparison and changeset structure
      if (this.verbose && this.state.lastCloudDOM) {
        logger.info("\n🔍 Debug: Comparing outputs...");
        this.debugOutputs(this.state.lastCloudDOM, result.cloudDOM);
        
        logger.info('\n🔍 Debug: ChangeSet structure:');
        logger.info(`  creates: ${changeSet.creates.length}`, changeSet.creates.map((n: any) => n.id));
        logger.info(`  updates: ${changeSet.updates.length}`, changeSet.updates.map((n: any) => n.id));
        logger.info(`  deletes: ${changeSet.deletes.length}`, changeSet.deletes.map((n: any) => n.id));
        logger.info(`  replacements: ${changeSet.replacements.length}`, changeSet.replacements.map((n: any) => n.id));
        logger.info(`  moves: ${changeSet.moves.length}`);
        
        if (changeSet.moves.length > 0) {
          logger.info('\n  Move details:');
          changeSet.moves.forEach((move: any) => {
            logger.info(`    ${move.nodeId}: "${move.from}" → "${move.to}"`);
          });
        }
        
        logger.info(`\n🔍 Total changes: ${totalChanges}`);
      }

      // Always update state to preserve reactive changes
      this.updateStateAfterHotReload(result);

      // Check if there are any changes
      if (totalChanges === 0) {
        spinner.succeed('✅ No changes detected');
        return;
      }

      spinner.succeed(`📋 Changes detected: ${totalChanges} changes`);

      // Show diff
      logger.info(formatDiff(changeSet));

      if (this.autoApprove) {
        // Auto-approve mode: deploy immediately
        logger.info(colors.warning('🚀 Auto-approving changes...'));
        await this.deployChanges(result, spinner);
      } else {
        // Manual approval mode: ask user
        const shouldDeploy = await this.promptForApproval();

        if (shouldDeploy) {
          await this.deployChanges(result, spinner);
        } else {
          logger.info(colors.info('⏭️  Changes skipped'));
        }
      }

    } catch (error) {
      spinner.fail('❌ Hot reload failed');
      logger.error(`Error: ${(error as Error).message}`);

      if (this.verbose && (error as Error).stack) {
        logger.error((error as Error).stack);
      }
    }
  }

  private async deployChanges(result: any, spinner: Spinner): Promise<void> {
    try {
      // Reactive deployment loop - continue until no more changes
      let deploymentCycle = 1;
      let hasMoreChanges = true;
      
      while (hasMoreChanges) {
        if (deploymentCycle > 1) {
          logger.info(`\n🔄 Reactive deployment cycle #${deploymentCycle}`);
        }
        
        spinner.start('Deploying changes...');

        await result.instance.deploy(result.cloudDOM, result.stackName, 'dev-user');

        // Update state with reactive preservation
        this.updateStateAfterDeployment(result);

        spinner.succeed(`✅ Deployment complete: ${result.cloudDOM.length} resources`);

        // Check if reactive changes were detected
        const reactiveInfo = await result.instance.getReactiveDeploymentInfo(result.stackName);
        
        if (reactiveInfo) {
          logger.info(`\n📋 Reactive changes detected: ${getTotalChanges(reactiveInfo.changeSet)} changes`);
          logger.info(formatDiff(reactiveInfo.changeSet));
          
          // Ask for approval (unless auto-approve is enabled)
          let shouldContinue = this.autoApprove;
          
          if (!this.autoApprove) {
            shouldContinue = await this.promptForApproval();
          } else {
            logger.info(colors.warning('🚀 Auto-approving reactive changes...'));
          }
          
          if (shouldContinue) {
            // Update result.cloudDOM for next cycle
            result.cloudDOM = reactiveInfo.cloudDOM;
            deploymentCycle++;
          } else {
            logger.info(colors.info('⏭️  Reactive changes skipped'));
            hasMoreChanges = false;
          }
        } else {
          hasMoreChanges = false;
        }
      }

    } catch (error) {
      spinner.fail('❌ Deployment failed');
      logger.error(`Error: ${(error as Error).message}`);

      if (this.verbose && (error as Error).stack) {
        logger.error((error as Error).stack);
      }
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
      output: process.stdout
    });

    this.currentReadline = rl;

    return new Promise((resolve) => {
      rl.question(colors.highlight('Deploy these changes? (y/N/a=auto-approve): '), (answer) => {
        this.currentReadline = null;
        rl.close();

        const response = answer.toLowerCase().trim();

        if (response === 'a' || response === 'auto') {
          logger.info(colors.warning('🔄 Switching to auto-approve mode'));
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

  private startWatching(entryPath: string, spinner: Spinner): void {
    if (this.isWatching) return;

    this.isWatching = true;
    const absoluteEntryPath = resolve(process.cwd(), entryPath);

    // Watch only the directory containing the entry file
    const entryDir = dirname(absoluteEntryPath);

    const watchPaths = [
      entryDir,    // Watch the directory containing the entry file (e.g., examples/basic-app/)
    ];

    logger.info('\n📂 File Watcher Configuration:');
    logger.info(`  CWD: ${process.cwd()}`);
    logger.info(`  Entry file: ${entryPath}`);
    logger.info(`  Absolute entry: ${absoluteEntryPath}`);
    logger.info(`  Watching: ${entryDir}`);
    logger.info('');

    watchPaths.forEach(watchPath => {
      try {
        logger.info(`👁️  Watching (recursive): ${watchPath}`);

        watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (!filename) {
            return;
          }

          // Skip certain file types (do this first, before any logging)
          if (this.shouldIgnoreFile(filename)) {
            return;
          }

          const fullPath = resolve(watchPath, filename);

          if (this.verbose) {
            logger.info(`\n🔔 File event detected:`);
            logger.info(`  Event: ${eventType}`);
            logger.info(`  Filename: ${filename}`);
            logger.info(`  Watch path: ${watchPath}`);
            logger.info(`  Full path: ${fullPath}`);
          }

          // Debounce file changes
          if (this.watchTimeout) {
            clearTimeout(this.watchTimeout);
            if (this.verbose) {
              logger.info(`  ⏱️  Debouncing (clearing previous timeout)`);
            }
          }

          this.watchTimeout = setTimeout(() => {
            // Skip hot reload if we don't have initial state yet
            if (!this.state.lastCloudDOM) {
              logger.info(`\n⏭️  Skipping hot reload - waiting for initial deployment to complete`);
              return;
            }

            // Cancel any pending prompts
            if (this.currentReadline) {
              logger.info('\n🔄 New changes detected, canceling previous prompt...');
              this.currentReadline.close();
              this.currentReadline = null;
            }

            logger.info(`\n📝 File changed: ${colors.dim(filename)} (${eventType})`);
            this.performHotReload(entryPath, spinner);
          }, 300); // Slightly longer debounce for hot reload
        });

        logger.info(`  ✓ Started watching successfully\n`);
      } catch (error) {
        logger.warn(`  ✗ Warning: Could not watch ${watchPath}: ${(error as Error).message}\n`);
      }
    });
  }

  private shouldIgnoreFile(filename: string): boolean {
    // Only watch TypeScript and JavaScript files
    const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const hasAllowedExtension = allowedExtensions.some(ext => filename.endsWith(ext));

    if (!hasAllowedExtension) {
      return true;
    }

    // Ignore certain patterns even for TS/JS files
    const ignoredPatterns = ['node_modules', '.git', 'dist', '.next', '.cache', 'test', 'spec'];

    if (ignoredPatterns.some(pattern => filename.includes(pattern))) {
      return true;
    }

    return false;
  }

  /**
   * Debug outputs comparison between previous and current CloudDOM
   */
  private debugOutputs(previous: any[], current: any[]): void {
    const findNodeById = (nodes: any[], id: string): any => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    // Get all node IDs from current
    const getAllNodeIds = (nodes: any[]): string[] => {
      const ids: string[] = [];
      const walk = (nodeList: any[]) => {
        for (const node of nodeList) {
          ids.push(node.id);
          if (node.children) walk(node.children);
        }
      };
      walk(nodes);
      return ids;
    };

    const currentIds = getAllNodeIds(current);

    for (const id of currentIds) {
      const prevNode = findNodeById(previous, id);
      const currNode = findNodeById(current, id);

      if (prevNode && currNode) {
        const prevOutputs = prevNode.outputs || {};
        const currOutputs = currNode.outputs || {};

        if (JSON.stringify(prevOutputs) !== JSON.stringify(currOutputs)) {
          logger.info(`📊 ${colors.highlight(id)} outputs changed:`);
          logger.info(`  Previous: ${JSON.stringify(prevOutputs)}`);
          logger.info(`  Current:  ${JSON.stringify(currOutputs)}`);
        }
      }
    }
  }

  /**
   * Keep the process alive indefinitely until SIGINT
   */
  private async keepAlive(): Promise<never> {
    return new Promise(() => {
      // This promise never resolves, keeping the process alive
      // The process will only exit via SIGINT handler
    });
  }

  private stopWatching(): void {
    this.isWatching = false;
    if (this.watchTimeout) {
      clearTimeout(this.watchTimeout);
      this.watchTimeout = null;
    }
  }



  /**
   * Process pending reactive updates from the ReactiveUpdateQueue
   * This ensures setState calls during render are reflected before diffing
   * 
   * CRITICAL: This is what makes state changes from effects visible during hot reload!
   */
  private async processReactiveUpdates(instance: any, spinner: Spinner): Promise<void> {
    try {
      const queue = getReactiveUpdateQueue();
      const queueSize = queue.size();

      if (queueSize === 0) {
        if (this.verbose) {
          logger.info('🔄 No pending reactive updates to process');
        }
        return;
      }

      if (this.verbose) {
        logger.info(`🔄 Processing ${queueSize} pending reactive updates...`);
      }

      // Process all pending updates by re-rendering affected fibers
      const affectedFibers = queue.flush();

      if (affectedFibers.length === 0) {
        return;
      }

      logger.info(`🔄 Processing ${affectedFibers.length} reactive state updates`);

      // Re-render each affected fiber to update CloudDOM
      for (const fiber of affectedFibers) {
        try {
          // Re-execute the component function to update its outputs
          if (fiber.type && typeof fiber.type === 'function') {
            if (this.verbose) {
              logger.info(`  ↻ Re-rendering: ${fiber.path?.join('.') || 'unknown'}`);
            }

            // The component will re-execute and useState will return updated values
            // This updates the fiber's hooks array and CloudDOM outputs
            const result = fiber.type(fiber.props || {});

            // If the component returned JSX, we need to update the fiber tree
            // But for now, the important part is that useState reads from fiber.hooks
            // which has been updated by setState calls
          }
        } catch (error) {
          logger.warn(`Warning: Failed to re-render fiber ${fiber.path?.join('.')}: ${(error as Error).message}`);
        }
      }

      // After re-rendering, sync the updated state back to CloudDOM
      if (instance.cloudDOMBuilder && instance.lastFiberTree) {
        try {
          const cloudDOM = instance.lastCloudDOM || [];
          instance.cloudDOMBuilder.syncFiberStateToCloudDOM(instance.lastFiberTree, cloudDOM);

          if (this.verbose) {
            logger.info('✅ Synced reactive state updates to CloudDOM');
          }
        } catch (error) {
          logger.warn(`Warning: Failed to sync state to CloudDOM: ${(error as Error).message}`);
        }
      }

    } catch (error) {
      logger.warn(`Warning: Failed to process reactive updates: ${(error as Error).message}`);
      if (this.verbose && (error as Error).stack) {
        logger.error((error as Error).stack);
      }
    }
  }

  /**
   * Update state after successful deployment
   */
  private updateStateAfterDeployment(result: any): void {
    // Update basic state
    this.state.lastCloudDOM = result.cloudDOM;
    this.state.lastStackName = result.stackName;
    this.state.instance = result.instance;
  }

  /**
   * Update state after hot reload (even if deployment is skipped)
   */
  private updateStateAfterHotReload(result: any): void {
    // Update the instance and CloudDOM even if deployment was skipped
    // This preserves reactive changes
    this.state.lastCloudDOM = result.cloudDOM;
    this.state.instance = result.instance;
  }


}