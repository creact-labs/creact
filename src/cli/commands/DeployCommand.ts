/**
 * Deploy Command - deploys CloudDOM to cloud provider
 */

import { BaseCommand, CommandResult } from '../core/BaseCommand';
import { CLIContextManager } from '../core/CLIContext';
import { Spinner } from '../output';

export class DeployCommand extends BaseCommand {
  getName(): string {
    return 'deploy';
  }

  getDescription(): string {
    return 'Deploy CloudDOM to cloud provider';
  }

  async execute(): Promise<CommandResult> {
    const spinner = new Spinner(this.json);
    const dryRun = !!this.context.flags['dry-run'];

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

      // Validate providers
      spinner.start('Validating providers...');
      
      if (!result.instance.getCloudProvider()) {
        spinner.fail('Cloud provider not configured');
        return this.handleError(new Error('CReact.cloudProvider must be set in entry file'), 'Provider validation failed');
      }

      if (!result.instance.getBackendProvider()) {
        spinner.fail('Backend provider not configured');
        return this.handleError(new Error('CReact.backendProvider must be set in entry file'), 'Provider validation failed');
      }

      spinner.succeed('Providers validated');

      if (dryRun) {
        this.logVerbose('Dry run mode - deployment will be simulated');
        return this.handleSuccess(`Dry run complete: ${result.cloudDOM.length} resources would be deployed`, {
          dryRun: true,
          resourceCount: result.cloudDOM.length,
          stackName: result.stackName
        });
      }

      // Deploy using CReact instance
      spinner.start('Deploying CloudDOM...');
      
      try {
        await result.instance.deploy(result.cloudDOM, result.stackName, 'cli-user');
        spinner.succeed('Deployment complete');
        
        return this.handleSuccess(`Deployment complete: ${result.cloudDOM.length} resources deployed`, {
          resourceCount: result.cloudDOM.length,
          stackName: result.stackName,
          entryFile: entryPath
        });
        
      } catch (deployError) {
        spinner.fail('Deployment failed');
        return this.handleError(deployError as Error, 'Deployment failed');
      }

    } catch (error) {
      return this.handleError(error as Error, 'Deploy command failed');
    }
  }
}