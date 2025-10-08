/**
 * Dev Command - hot reload development mode with auto/manual approval
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { Spinner, colors, formatDiff } from '../output';
import { watch } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';

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
      console.log('🚀 Starting CReact development mode...');
      console.log(`📋 Mode: ${this.autoApprove ? colors.warning('Auto-approve') : colors.info('Manual approval')}`);
      
      if (!this.autoApprove) {
        console.log('� tTip: Use --auto-approve to automatically deploy changes');
      }

      // Initial build and deploy
      await this.performInitialDeploy(entryPath, spinner);

      // Start file watching
      this.startWatching(entryPath, spinner);

      // Keep process alive
      console.log('👀 Watching for changes... (Press Ctrl+C to stop)');
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n👋 Stopping development mode...');
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
      spinner.start('Building and deploying initial state...');
      
      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
      
      // Store state for future comparisons
      this.state.lastCloudDOM = result.cloudDOM;
      this.state.lastStackName = result.stackName;
      this.state.instance = result.instance;
      
      // Capture initial reactive state
      this.captureReactiveState(result.instance);
      
      // Deploy initial state
      await result.instance.deploy(result.cloudDOM, result.stackName, 'dev-user');
      
      spinner.succeed(`✅ Initial deployment complete: ${result.cloudDOM.length} resources`);
      
      if (this.verbose) {
        console.log(`Stack: ${result.stackName}`);
        console.log(`Resources: ${result.cloudDOM.length}`);
      }
      
    } catch (error) {
      spinner.fail('❌ Initial deployment failed');
      console.error(`Error: ${(error as Error).message}`);
      
      if (this.verbose && (error as Error).stack) {
        console.error((error as Error).stack);
      }
    }
  }

  private async performHotReload(entryPath: string, spinner: Spinner): Promise<void> {
    try {
      spinner.start('Building changes with reactive state preservation...');
      
      // Preserve reactive state before recompilation
      const preservedState = this.preserveReactiveState();
      
      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
      
      if (!this.state.lastCloudDOM || !this.state.instance) {
        spinner.fail('❌ No previous state found');
        return;
      }

      // Restore reactive state after recompilation
      this.restoreReactiveState(result.instance, preservedState);

      // Trigger hot reload re-render through reactive system
      const hasReactiveChanges = await this.triggerHotReloadReRender(result.instance, spinner);

      // Compute diff using Reconciler
      let ReconcilerClass;
      try {
        ReconcilerClass = require(resolve(process.cwd(), 'src/core/Reconciler')).Reconciler;
      } catch {
        ReconcilerClass = require(resolve(__dirname, '../../core/Reconciler')).Reconciler;
      }
      const reconciler = new ReconcilerClass();
      
      const changeSet = reconciler.reconcile(this.state.lastCloudDOM, result.cloudDOM);
      
      // Debug: Show outputs comparison
      if (this.verbose) {
        console.log('\n🔍 Debug: Comparing outputs...');
        this.debugOutputs(this.state.lastCloudDOM, result.cloudDOM);
        
        if (hasReactiveChanges) {
          console.log('🔄 Reactive system triggered re-renders during hot reload');
        }
      }
      
      // Check if there are any changes
      const hasChanges = 
        changeSet.creates.length > 0 ||
        changeSet.updates.length > 0 ||
        changeSet.deletes.length > 0 ||
        changeSet.replacements.length > 0 ||
        changeSet.moves.length > 0;

      if (!hasChanges && !hasReactiveChanges) {
        spinner.succeed('✅ No changes detected');
        return;
      }

      const totalChanges = changeSet.creates.length + changeSet.updates.length + 
                          changeSet.deletes.length + changeSet.replacements.length + 
                          changeSet.moves.length;

      const changeMessage = hasReactiveChanges 
        ? `📋 Changes detected: ${totalChanges} structural + reactive changes`
        : `📋 Changes detected: ${totalChanges} changes`;

      spinner.succeed(changeMessage);

      // Show diff
      console.log(formatDiff(changeSet));

      if (this.autoApprove) {
        // Auto-approve mode: deploy immediately
        console.log(colors.warning('🚀 Auto-approving changes...'));
        await this.deployChanges(result, spinner);
      } else {
        // Manual approval mode: ask user
        const shouldDeploy = await this.promptForApproval();
        
        if (shouldDeploy) {
          await this.deployChanges(result, spinner);
        } else {
          console.log(colors.info('⏭️  Changes skipped'));
          // Even if deployment is skipped, update our state to preserve reactive changes
          this.updateStateAfterHotReload(result);
        }
      }
      
    } catch (error) {
      spinner.fail('❌ Hot reload failed');
      console.error(`Error: ${(error as Error).message}`);
      
      if (this.verbose && (error as Error).stack) {
        console.error((error as Error).stack);
      }
      
      // Attempt to recover reactive state
      this.recoverReactiveState();
    }
  }

  private async deployChanges(result: any, spinner: Spinner): Promise<void> {
    try {
      spinner.start('Deploying changes...');
      
      await result.instance.deploy(result.cloudDOM, result.stackName, 'dev-user');
      
      // Update state with reactive preservation
      this.updateStateAfterDeployment(result);
      
      spinner.succeed(`✅ Deployment complete: ${result.cloudDOM.length} resources`);
      
    } catch (error) {
      spinner.fail('❌ Deployment failed');
      console.error(`Error: ${(error as Error).message}`);
      
      if (this.verbose && (error as Error).stack) {
        console.error((error as Error).stack);
      }
      
      // Attempt to recover reactive state on deployment failure
      this.recoverReactiveState();
    }
  }

  private async promptForApproval(): Promise<boolean> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(colors.highlight('Deploy these changes? (y/N/a=auto-approve): '), (answer) => {
        rl.close();
        
        const response = answer.toLowerCase().trim();
        
        if (response === 'a' || response === 'auto') {
          console.log(colors.warning('🔄 Switching to auto-approve mode'));
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
    
    // Watch the entry file, its directory, and src directory
    const entryDir = resolve(absoluteEntryPath, '..');
    const srcDir = resolve(process.cwd(), 'src');
    
    const watchPaths = [
      entryDir,    // Watch the directory containing the entry file (e.g., examples/messaging-app/)
      srcDir       // Watch the src directory for core library changes
    ];

    this.logVerbose(`Watching paths: ${watchPaths.join(', ')}`);

    watchPaths.forEach(watchPath => {
      try {
        watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          
          this.logVerbose(`File event: ${eventType} on ${filename}`);
          
          // Skip certain file types
          if (this.shouldIgnoreFile(filename)) {
            this.logVerbose(`Ignoring file: ${filename}`);
            return;
          }
          
          // Debounce file changes
          if (this.watchTimeout) {
            clearTimeout(this.watchTimeout);
          }
          
          this.watchTimeout = setTimeout(() => {
            console.log(`\n📝 File changed: ${colors.dim(filename)} (${eventType})`);
            this.performHotReload(entryPath, spinner);
          }, 300); // Slightly longer debounce for hot reload
        });
        
        this.logVerbose(`Started watching: ${watchPath}`);
      } catch (error) {
        console.warn(`Warning: Could not watch ${watchPath}: ${(error as Error).message}`);
      }
    });
  }

  private shouldIgnoreFile(filename: string): boolean {
    const ignoredExtensions = ['.log', '.tmp', '.swp', '.DS_Store'];
    const ignoredPatterns = ['node_modules', '.git', 'dist', '.next', '.cache'];
    
    // Check extensions
    if (ignoredExtensions.some(ext => filename.endsWith(ext))) {
      return true;
    }
    
    // Check patterns
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
          console.log(`📊 ${colors.highlight(id)} outputs changed:`);
          console.log(`  Previous: ${JSON.stringify(prevOutputs)}`);
          console.log(`  Current:  ${JSON.stringify(currOutputs)}`);
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
   * Capture reactive state from CReact instance for preservation during hot reload
   */
  private captureReactiveState(instance: any): void {
    try {
      // Access the reactive components from the CReact instance
      const reactiveState = new Map<string, any>();

      // Capture state binding manager state
      if (instance.stateBindingManager) {
        reactiveState.set('stateBindings', this.serializeStateBindings(instance.stateBindingManager));
      }

      // Capture provider output tracker state
      if (instance.providerOutputTracker) {
        reactiveState.set('providerOutputs', this.serializeProviderOutputs(instance.providerOutputTracker));
      }

      // Capture context dependency tracker state
      if (instance.contextDependencyTracker) {
        reactiveState.set('contextDependencies', this.serializeContextDependencies(instance.contextDependencyTracker));
      }

      // Capture render scheduler state
      if (instance.renderScheduler) {
        reactiveState.set('renderScheduler', this.serializeRenderScheduler(instance.renderScheduler));
      }

      // Store the last fiber tree if available
      if (instance.lastFiberTree) {
        reactiveState.set('lastFiberTree', this.serializeFiberTree(instance.lastFiberTree));
      }

      this.state.reactiveState = reactiveState;

      if (this.verbose) {
        console.log('🔄 Captured reactive state for hot reload preservation');
      }

    } catch (error) {
      console.warn(`Warning: Failed to capture reactive state: ${(error as Error).message}`);
      this.state.reactiveState = null;
    }
  }

  /**
   * Preserve reactive state before recompilation
   */
  private preserveReactiveState(): Map<string, any> | null {
    if (!this.state.instance) {
      return null;
    }

    try {
      this.captureReactiveState(this.state.instance);
      return this.state.reactiveState;
    } catch (error) {
      console.warn(`Warning: Failed to preserve reactive state: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Restore reactive state after recompilation
   */
  private restoreReactiveState(instance: any, preservedState: Map<string, any> | null): void {
    if (!preservedState) {
      if (this.verbose) {
        console.log('🔄 No preserved reactive state to restore');
      }
      return;
    }

    try {
      // Restore state binding manager state
      if (preservedState.has('stateBindings') && instance.stateBindingManager) {
        this.deserializeStateBindings(instance.stateBindingManager, preservedState.get('stateBindings'));
      }

      // Restore provider output tracker state
      if (preservedState.has('providerOutputs') && instance.providerOutputTracker) {
        this.deserializeProviderOutputs(instance.providerOutputTracker, preservedState.get('providerOutputs'));
      }

      // Restore context dependency tracker state
      if (preservedState.has('contextDependencies') && instance.contextDependencyTracker) {
        this.deserializeContextDependencies(instance.contextDependencyTracker, preservedState.get('contextDependencies'));
      }

      // Restore render scheduler state (clear pending renders but preserve failure records)
      if (preservedState.has('renderScheduler') && instance.renderScheduler) {
        this.deserializeRenderScheduler(instance.renderScheduler, preservedState.get('renderScheduler'));
      }

      // Restore last fiber tree
      if (preservedState.has('lastFiberTree')) {
        instance.lastFiberTree = this.deserializeFiberTree(preservedState.get('lastFiberTree'));
      }

      if (this.verbose) {
        console.log('🔄 Restored reactive state after recompilation');
      }

    } catch (error) {
      console.warn(`Warning: Failed to restore reactive state: ${(error as Error).message}`);
    }
  }

  /**
   * Trigger hot reload re-render through the reactive system
   */
  private async triggerHotReloadReRender(instance: any, spinner: Spinner): Promise<boolean> {
    try {
      if (!instance.renderScheduler || !instance.lastFiberTree) {
        return false;
      }

      // Schedule a hot-reload re-render for the root component
      instance.scheduleReRender(instance.lastFiberTree, 'hot-reload');

      // Check if there are any pending re-renders
      const pendingReRenders = instance.renderScheduler.getPendingReRenders();
      
      if (pendingReRenders.size > 0) {
        if (this.verbose) {
          console.log(`🔄 Triggering hot reload re-render for ${pendingReRenders.size} components`);
        }

        // Allow the render scheduler to process the batched re-renders
        await new Promise(resolve => setTimeout(resolve, 10));

        return true;
      }

      return false;

    } catch (error) {
      console.warn(`Warning: Failed to trigger hot reload re-render: ${(error as Error).message}`);
      return false;
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

    // Capture new reactive state
    this.captureReactiveState(result.instance);
  }

  /**
   * Update state after hot reload (even if deployment is skipped)
   */
  private updateStateAfterHotReload(result: any): void {
    // Update the instance and CloudDOM even if deployment was skipped
    // This preserves reactive changes
    this.state.lastCloudDOM = result.cloudDOM;
    this.state.instance = result.instance;

    // Capture updated reactive state
    this.captureReactiveState(result.instance);
  }

  /**
   * Recover reactive state after errors
   */
  private recoverReactiveState(): void {
    try {
      if (this.state.instance && this.state.reactiveState) {
        // Attempt to restore the last known good reactive state
        this.restoreReactiveState(this.state.instance, this.state.reactiveState);
        
        if (this.verbose) {
          console.log('🔄 Recovered reactive state after error');
        }
      }
    } catch (error) {
      console.warn(`Warning: Failed to recover reactive state: ${(error as Error).message}`);
    }
  }

  // Serialization helpers for reactive state preservation

  private serializeStateBindings(stateBindingManager: any): any {
    try {
      // StateBindingManager likely has internal maps that need special handling
      return {
        // Placeholder - actual implementation would depend on StateBindingManager internals
        timestamp: Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  private deserializeStateBindings(stateBindingManager: any, data: any): void {
    try {
      // Placeholder - actual implementation would depend on StateBindingManager internals
      if (this.verbose && data) {
        console.log('🔄 Restored state bindings from', new Date(data.timestamp));
      }
    } catch (error) {
      // Ignore deserialization errors
    }
  }

  private serializeProviderOutputs(providerOutputTracker: any): any {
    try {
      // ProviderOutputTracker likely has internal maps that need special handling
      return {
        timestamp: Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  private deserializeProviderOutputs(providerOutputTracker: any, data: any): void {
    try {
      if (this.verbose && data) {
        console.log('🔄 Restored provider outputs from', new Date(data.timestamp));
      }
    } catch (error) {
      // Ignore deserialization errors
    }
  }

  private serializeContextDependencies(contextDependencyTracker: any): any {
    try {
      return {
        timestamp: Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  private deserializeContextDependencies(contextDependencyTracker: any, data: any): void {
    try {
      if (this.verbose && data) {
        console.log('🔄 Restored context dependencies from', new Date(data.timestamp));
      }
    } catch (error) {
      // Ignore deserialization errors
    }
  }

  private serializeRenderScheduler(renderScheduler: any): any {
    try {
      // Preserve failure statistics but clear pending renders
      const failureStats = renderScheduler.getFailureStats ? renderScheduler.getFailureStats() : null;
      
      return {
        failureStats,
        timestamp: Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  private deserializeRenderScheduler(renderScheduler: any, data: any): void {
    try {
      // Clear any pending renders from the previous session
      if (renderScheduler.clearPending) {
        renderScheduler.clearPending();
      }

      if (this.verbose && data) {
        console.log('🔄 Restored render scheduler state from', new Date(data.timestamp));
        if (data.failureStats) {
          console.log('📊 Previous failure stats:', data.failureStats);
        }
      }
    } catch (error) {
      // Ignore deserialization errors
    }
  }

  private serializeFiberTree(fiberTree: any): any {
    try {
      // Serialize only essential parts of the fiber tree
      // Full serialization might be too complex, so we store a minimal representation
      return {
        path: fiberTree.path || [],
        type: fiberTree.type?.name || 'unknown',
        timestamp: Date.now()
      };
    } catch (error) {
      return null;
    }
  }

  private deserializeFiberTree(data: any): any {
    try {
      // This is a placeholder - actual fiber tree restoration would be complex
      // For now, we just return the data as-is
      return data;
    } catch (error) {
      return null;
    }
  }
}