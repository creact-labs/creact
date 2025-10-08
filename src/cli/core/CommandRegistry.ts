/**
 * Command Registry - manages available CLI commands
 */

import { BaseCommand } from './BaseCommand';
import { CLIContext } from './CLIContext';
import { BuildCommand, PlanCommand, DeployCommand, DevCommand } from '../commands';

export type CommandConstructor = new (context: CLIContext) => BaseCommand;

/**
 * Registry of available CLI commands
 */
export class CommandRegistry {
  private static commands: Map<string, CommandConstructor> = new Map([
    ['build', BuildCommand],
    ['plan', PlanCommand],
    ['deploy', DeployCommand],
    ['dev', DevCommand],
  ]);

  /**
   * Get all available command names
   */
  static getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Check if command exists
   */
  static hasCommand(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Create command instance
   */
  static createCommand(name: string, context: CLIContext): BaseCommand {
    const CommandClass = this.commands.get(name);
    if (!CommandClass) {
      throw new Error(`Unknown command: ${name}`);
    }
    return new CommandClass(context);
  }

  /**
   * Register a new command
   */
  static registerCommand(name: string, commandClass: CommandConstructor): void {
    this.commands.set(name, commandClass);
  }

  /**
   * Get command help information
   */
  static getCommandHelp(): Array<{ name: string; description: string }> {
    const help: Array<{ name: string; description: string }> = [];
    
    for (const [name, CommandClass] of this.commands.entries()) {
      // Create temporary instance to get description
      const tempContext: CLIContext = { args: [], flags: {} };
      const instance = new CommandClass(tempContext);
      help.push({
        name,
        description: instance.getDescription()
      });
    }
    
    return help;
  }
}