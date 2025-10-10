/**
 * Build Command - builds CloudDOM from entry file
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { Spinner } from '../output';
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
        this.logVerbose(`CloudDOM built with ${result.cloudDOM.length} resources`);
      } catch (error) {
        spinner.fail('Failed to load entry file and configure providers');
        return this.handleError(error as Error, 'Entry file loading failed');
      }

      spinner.succeed('Entry file loaded and providers configured');

      // Success output
      const message = `Build complete: ${result.cloudDOM.length} resources`;
      
      if (this.verbose && !this.json) {
        this.printVerboseOutput(result);
      }

      return this.handleSuccess(message, {
        resourceCount: result.cloudDOM.length,
        entryFile: entryPath,
        stackName: result.stackName,
        resources: result.cloudDOM.map((node: any) => ({
          id: node.id,
          type: node.construct?.name || 'Unknown',
          path: node.path,
        })),
      });

    } catch (error) {
      return this.handleError(error as Error, 'Build failed');
    }
  }

  private printVerboseOutput(result: any): void {
    logger.info('\nCloudDOM Summary:');
    const resourceCounts = this.countResources(result.cloudDOM);
    
    if (Object.keys(resourceCounts).length === 0) {
      logger.info('  No resources found');
    } else {
      for (const [type, count] of Object.entries(resourceCounts)) {
        logger.info(`  ${type}: ${count}`);
      }
    }
    
    // Show first few resource IDs for debugging
    if (result.cloudDOM.length > 0) {
      logger.info('\nResource IDs:');
      const sampleIds = result.cloudDOM.slice(0, 5).map((node: any) => node.id);
      sampleIds.forEach((id: string) => {
        logger.info(`  • ${id}`);
      });
      
      if (result.cloudDOM.length > 5) {
        logger.info(`  ... and ${result.cloudDOM.length - 5} more`);
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