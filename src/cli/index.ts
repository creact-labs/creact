#!/usr/bin/env node

/**
 * CReact CLI Entry Point
 * 
 * Command-line interface for building, planning, and deploying CloudDOM graphs.
 * Provides developer-friendly commands following IaC conventions (plan/apply).
 */

import { parseArgs } from 'node:util';

const VERSION = '0.1.0';

interface CommandContext {
  args: string[];
  flags: Record<string, string | boolean>;
}

type CommandHandler = (ctx: CommandContext) => Promise<number>;

/**
 * Available CLI commands
 */
const commands: Record<string, CommandHandler> = {
  build: async (ctx) => {
    const { loadConfigFromContext, logVerbose, outputJson, formatError } = await import('./utils.js');
    const { Spinner, printSuccess, printWarning, colors } = await import('./output.js');
    
    try {
      const spinner = new Spinner(!!ctx.flags.json);
      
      // Load configuration
      spinner.start('Loading configuration...');
      const config = await loadConfigFromContext(ctx);
      spinner.succeed('Configuration loaded');
      
      logVerbose('Configuration loaded successfully', config);
      logVerbose(`Stack: ${config.stackName}`, config);
      logVerbose(`Entry: ${config.entry}`, config);
      
      // TODO: Implement build logic
      // 1. Load entry file
      // 2. Render JSX to CloudDOM
      // 3. Validate CloudDOM
      // 4. Save to backend
      
      spinner.start('Building CloudDOM...');
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 500));
      spinner.warn('Build not yet implemented');
      
      printWarning('This command will compile JSX → CloudDOM');
      console.log(colors.dim('Implementation coming soon...'));
      
      if (outputJson({ status: 'not_implemented' }, ctx)) {
        return 1;
      }
      
      return 1;
    } catch (error) {
      console.error(formatError(error as Error, ctx.flags.verbose as boolean));
      return 1;
    }
  },

  plan: async (ctx) => {
    const { Spinner, formatDiff, printWarning, colors } = await import('./output.js');
    
    const spinner = new Spinner(!!ctx.flags.json);
    
    spinner.start('Computing diff...');
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
    spinner.succeed('Diff computed');
    
    // Example diff output (will be replaced with actual reconciler output)
    const exampleDiff = {
      creates: [
        { id: 'api', construct: { name: 'AwsLambda' } },
        { id: 'db', construct: { name: 'DockerContainer' } },
      ],
      updates: [
        { id: 'vpc', construct: { name: 'TerraformModule' } },
      ],
      deletes: [
        { id: 'old-service', construct: { name: 'AwsLambda' } },
      ],
      moves: [
        { from: 'frontend.old', to: 'frontend.new' },
      ],
    };
    
    console.log(formatDiff(exampleDiff));
    printWarning('Plan command not fully implemented yet');
    console.log(colors.dim('This is example output. Real diff will come from Reconciler.'));
    
    return 1;
  },

  deploy: async (ctx) => {
    const { Spinner, ProgressBar, printSuccess, printWarning, colors } = await import('./output.js');
    
    const spinner = new Spinner(!!ctx.flags.json);
    
    spinner.start('Preparing deployment...');
    await new Promise(resolve => setTimeout(resolve, 500));
    spinner.succeed('Deployment prepared');
    
    // Example progress bar
    const progress = new ProgressBar(!!ctx.flags.json);
    progress.start(5, 0, 'Deploying resources');
    
    // Simulate deployment
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      progress.update(i, `Resource ${i}/5`);
    }
    
    progress.stop();
    
    printSuccess('Deployment completed (example)');
    printWarning('Deploy command not fully implemented yet');
    console.log(colors.dim('This is example output. Real deployment will use StateMachine.'));
    
    return 1;
  },

  resume: async (ctx) => {
    console.log('creact resume - Not yet implemented');
    console.log('This command will resume interrupted deployment');
    return 1;
  },

  dev: async (ctx) => {
    console.log('creact dev - Not yet implemented');
    console.log('This command will enable hot reload for infrastructure');
    return 1;
  },

  logs: async (ctx) => {
    console.log('creact logs - Not yet implemented');
    console.log('This command will stream CloudDOM event logs');
    return 1;
  },

  secrets: async (ctx) => {
    console.log('creact secrets - Not yet implemented');
    console.log('This command will manage encrypted configuration');
    return 1;
  },

  audit: async (ctx) => {
    console.log('creact audit - Not yet implemented');
    console.log('This command will view audit log entries');
    return 1;
  },

  info: async (ctx) => {
    const { printHeader, printTable, printWarning, colors } = await import('./output.js');
    
    printHeader('CReact System Information');
    
    console.log('\n' + colors.highlight('Registered Providers:'));
    printTable(
      ['Name', 'Type', 'Version', 'Status'],
      [
        ['DummyCloudProvider', 'Cloud', '0.1.0', colors.success('Active')],
        ['DummyBackendProvider', 'Backend', '0.1.0', colors.success('Active')],
      ]
    );
    
    console.log('\n' + colors.highlight('Registered Adapters:'));
    printTable(
      ['Name', 'Type', 'Version', 'Status'],
      [
        ['TerraformAdapter', 'IaC', 'N/A', colors.dim('Not Loaded')],
        ['HelmAdapter', 'IaC', 'N/A', colors.dim('Not Loaded')],
      ]
    );
    
    console.log('');
    printWarning('Info command not fully implemented yet');
    console.log(colors.dim('This is example output. Real info will query DI container.'));
    
    return 1;
  },

  help: async (ctx) => {
    showHelp(ctx.args[0]);
    return 0;
  },

  version: async () => {
    console.log(`CReact v${VERSION}`);
    return 0;
  },
};

/**
 * Display help text for a specific command or general help
 */
function showHelp(command?: string): void {
  if (command && commands[command]) {
    showCommandHelp(command);
    return;
  }

  console.log(`
CReact v${VERSION} - Universal Declarative Runtime

USAGE:
  creact <command> [options]

COMMANDS:
  build       Compile JSX → CloudDOM
  plan        Show diff preview without apply
  deploy      Apply changes to infrastructure
  resume      Resume interrupted deployment
  dev         Hot reload infrastructure (watch mode)
  logs        Stream CloudDOM event logs
  secrets     Manage encrypted configuration
  audit       View audit log entries
  info        List registered providers, backends, and extensions
  help        Show this help message
  version     Show version information

GLOBAL OPTIONS:
  --help      Show help for a command
  --json      Output machine-readable JSON
  --verbose   Enable verbose logging

EXAMPLES:
  creact build                    # Build CloudDOM from JSX
  creact plan --json              # Show diff in JSON format
  creact deploy                   # Deploy infrastructure
  creact dev --step               # Hot reload with manual approval
  creact secrets list             # List secret keys
  creact info                     # Show registered providers

For more information, visit: https://github.com/escambo/creact
`);
}

/**
 * Display detailed help for a specific command
 */
function showCommandHelp(command: string): void {
  const helpText: Record<string, string> = {
    build: `
creact build - Compile JSX to CloudDOM

USAGE:
  creact build [options]

OPTIONS:
  --config <path>    Path to creact.config.ts (default: ./creact.config.ts)
  --json             Output machine-readable JSON
  --verbose          Enable verbose logging

DESCRIPTION:
  Compiles JSX infrastructure definitions to CloudDOM representation.
  Validates the CloudDOM tree and saves it to the backend provider.
`,

    plan: `
creact plan - Show diff preview without apply

USAGE:
  creact plan [options]

OPTIONS:
  --config <path>    Path to creact.config.ts
  --json             Output machine-readable JSON (for CI/CD)
  --verbose          Enable verbose logging

DESCRIPTION:
  Computes diff between current and desired state without deploying.
  Shows colored diff: creates (green), updates (yellow), deletes (red).
`,

    deploy: `
creact deploy - Apply changes to infrastructure

USAGE:
  creact deploy [options]

OPTIONS:
  --config <path>    Path to creact.config.ts
  --auto-approve     Skip confirmation prompt
  --json             Output machine-readable JSON
  --verbose          Enable verbose logging

DESCRIPTION:
  Applies changes to infrastructure after confirmation.
  Uses state machine for crash recovery and rollback support.
`,

    resume: `
creact resume - Resume interrupted deployment

USAGE:
  creact resume [options]

OPTIONS:
  --stack <name>     Stack name to resume (default: default)
  --rollback         Rollback instead of resume
  --verbose          Enable verbose logging

DESCRIPTION:
  Resumes deployment from last checkpoint after crash or interruption.
  Use --rollback to revert to previous state instead.
`,

    dev: `
creact dev - Hot reload infrastructure

USAGE:
  creact dev [options]

OPTIONS:
  --config <path>    Path to creact.config.ts
  --step             Pause after each change for manual approval
  --verbose          Enable verbose logging

DESCRIPTION:
  Watches source files for changes and auto-applies updates.
  Only rebuilds and deploys affected CloudDOM subtrees.
  Target iteration time: <5 seconds for small changes.
`,

    logs: `
creact logs - Stream CloudDOM event logs

USAGE:
  creact logs [options]

OPTIONS:
  --stack <name>     Stack name (default: default)
  --follow           Follow log output (like tail -f)
  --json             Output machine-readable JSON
  --verbose          Enable verbose logging

DESCRIPTION:
  Streams deployment events and CloudDOM state changes.
`,

    secrets: `
creact secrets - Manage encrypted configuration

USAGE:
  creact secrets <subcommand> [options]

SUBCOMMANDS:
  list               List secret keys (not values)
  get <key>          Get secret value
  set <key> <value>  Set secret value
  delete <key>       Delete secret

OPTIONS:
  --stack <name>     Stack name (default: default)
  --json             Output machine-readable JSON

DESCRIPTION:
  Manages encrypted secrets stored in backend provider.
  Replaces .env files with secure, encrypted storage.
`,

    audit: `
creact audit - View audit log entries

USAGE:
  creact audit [options]

OPTIONS:
  --stack <name>     Stack name (default: default)
  --user <name>      Filter by user
  --action <type>    Filter by action (deploy, rollback, etc.)
  --json             Output machine-readable JSON

DESCRIPTION:
  Displays immutable audit log with deployment history.
  Shows: user, timestamp, stack, action, changes.
`,

    info: `
creact info - List registered providers and extensions

USAGE:
  creact info [options]

OPTIONS:
  --json             Output machine-readable JSON
  --verbose          Show detailed provider capabilities

DESCRIPTION:
  Lists all registered providers, backends, and extensions.
  Shows provider capabilities and API versions.
`,
  };

  console.log(helpText[command] || `No help available for command: ${command}`);
}

/**
 * Parse command-line arguments
 */
function parseCliArgs(argv: string[]): { command: string; ctx: CommandContext } {
  const [command = 'help', ...rest] = argv;

  // Parse flags
  const flags: Record<string, string | boolean> = {};
  const args: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];

    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);

      // Check if next arg is a value or another flag
      if (i + 1 < rest.length && !rest[i + 1].startsWith('--')) {
        flags[flagName] = rest[i + 1];
        i++; // Skip next arg
      } else {
        flags[flagName] = true;
      }
    } else if (arg.startsWith('-')) {
      // Short flags (single dash)
      flags[arg.slice(1)] = true;
    } else {
      args.push(arg);
    }
  }

  return {
    command,
    ctx: { args, flags },
  };
}

/**
 * Main CLI entry point
 */
async function main(): Promise<number> {
  try {
    const argv = process.argv.slice(2);

    // Handle --version flag
    if (argv.includes('--version') || argv.includes('-v')) {
      console.log(`CReact v${VERSION}`);
      return 0;
    }

    // Handle --help flag
    if (argv.includes('--help') || argv.includes('-h')) {
      showHelp();
      return 0;
    }

    // Parse command and arguments
    const { command, ctx } = parseCliArgs(argv);

    // Handle --help flag for specific command
    if (ctx.flags.help || ctx.flags.h) {
      showHelp(command);
      return 0;
    }

    // Execute command
    const handler = commands[command];

    if (!handler) {
      console.error(`Error: Unknown command "${command}"`);
      console.error('Run "creact help" for usage information');
      return 1;
    }

    return await handler(ctx);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// Run CLI if executed directly (ESM compatible check)
// Check if this file is being run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main()
    .then((exitCode) => {
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main, commands, showHelp, parseCliArgs };
export type { CommandContext, CommandHandler };
