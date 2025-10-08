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
}

export class DevCommand extends BaseCommand {
  private isWatching = false;
  private watchTimeout: NodeJS.Timeout | null = null;
  private autoApprove: boolean = false;
  private state: DevState = {
    lastCloudDOM: null,
    lastStackName: null,
    instance: null
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
      spinner.start('Building changes...');
      
      const result = await CLIContextManager.createCLIInstance(entryPath, this.verbose);
      
      if (!this.state.lastCloudDOM || !this.state.instance) {
        spinner.fail('❌ No previous state found');
        return;
      }

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
      }
      
      // Check if there are any changes
      const hasChanges = 
        changeSet.creates.length > 0 ||
        changeSet.updates.length > 0 ||
        changeSet.deletes.length > 0 ||
        changeSet.replacements.length > 0 ||
        changeSet.moves.length > 0;

      if (!hasChanges) {
        spinner.succeed('✅ No changes detected');
        return;
      }

      const totalChanges = changeSet.creates.length + changeSet.updates.length + 
                          changeSet.deletes.length + changeSet.replacements.length + 
                          changeSet.moves.length;

      spinner.succeed(`📋 Changes detected: ${totalChanges} changes`);

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
        }
      }
      
    } catch (error) {
      spinner.fail('❌ Hot reload failed');
      console.error(`Error: ${(error as Error).message}`);
      
      if (this.verbose && (error as Error).stack) {
        console.error((error as Error).stack);
      }
    }
  }

  private async deployChanges(result: any, spinner: Spinner): Promise<void> {
    try {
      spinner.start('Deploying changes...');
      
      await result.instance.deploy(result.cloudDOM, result.stackName, 'dev-user');
      
      // Update state
      this.state.lastCloudDOM = result.cloudDOM;
      this.state.lastStackName = result.stackName;
      this.state.instance = result.instance;
      
      spinner.succeed(`✅ Deployment complete: ${result.cloudDOM.length} resources`);
      
    } catch (error) {
      spinner.fail('❌ Deployment failed');
      console.error(`Error: ${(error as Error).message}`);
      
      if (this.verbose && (error as Error).stack) {
        console.error((error as Error).stack);
      }
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
}