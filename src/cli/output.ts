/**
 * CLI Output Utilities
 * 
 * Provides colored output, spinners, and progress indicators for CLI commands.
 * Uses chalk for colors, ora for spinners, and cli-progress for progress bars.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import cliProgress from 'cli-progress';

/**
 * Color utilities for consistent CLI output
 */
export const colors = {
  // Status colors
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,

  // Diff colors (for plan command)
  create: chalk.green,
  update: chalk.yellow,
  delete: chalk.red,
  move: chalk.cyan,

  // Semantic colors
  primary: chalk.cyan,
  secondary: chalk.gray,
  highlight: chalk.bold.white,
  dim: chalk.dim,

  // Resource types
  resource: chalk.magenta,
  output: chalk.blue,

  // Symbols
  checkmark: chalk.green('✓'),
  cross: chalk.red('✗'),
  arrow: chalk.cyan('→'),
  bullet: chalk.gray('•'),
};

/**
 * Spinner manager for long-running operations
 */
export class Spinner {
  private spinner: Ora | null = null;
  private isJsonMode: boolean = false;

  constructor(isJsonMode: boolean = false) {
    this.isJsonMode = isJsonMode;
  }

  /**
   * Start spinner with message
   */
  start(message: string): void {
    if (this.isJsonMode) {
      // In JSON mode, just log without spinner
      console.error(`[info] ${message}`);
      return;
    }

    this.spinner = ora({
      text: message,
      color: 'cyan',
    }).start();
  }

  /**
   * Update spinner text
   */
  update(message: string): void {
    if (this.isJsonMode) {
      console.error(`[info] ${message}`);
      return;
    }

    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Mark spinner as successful
   */
  succeed(message?: string): void {
    if (this.isJsonMode) {
      console.error(`[success] ${message || 'Done'}`);
      return;
    }

    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  /**
   * Mark spinner as failed
   */
  fail(message?: string): void {
    if (this.isJsonMode) {
      console.error(`[error] ${message || 'Failed'}`);
      return;
    }

    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  /**
   * Mark spinner as warning
   */
  warn(message?: string): void {
    if (this.isJsonMode) {
      console.error(`[warning] ${message || 'Warning'}`);
      return;
    }

    if (this.spinner) {
      this.spinner.warn(message);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner without status
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

/**
 * Progress bar for batch operations
 */
export class ProgressBar {
  private bar: cliProgress.SingleBar | null = null;
  private isJsonMode: boolean = false;
  private total: number = 0;
  private current: number = 0;

  constructor(isJsonMode: boolean = false) {
    this.isJsonMode = isJsonMode;
  }

  /**
   * Start progress bar
   */
  start(total: number, startValue: number = 0, message?: string): void {
    this.total = total;
    this.current = startValue;

    if (this.isJsonMode) {
      console.error(`[progress] ${message || 'Starting'} (0/${total})`);
      return;
    }

    this.bar = new cliProgress.SingleBar({
      format: `${message || 'Progress'} |${chalk.cyan('{bar}')}| {percentage}% | {value}/{total} | {status}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    this.bar.start(total, startValue, { status: '' });
  }

  /**
   * Update progress
   */
  update(value: number, status?: string): void {
    this.current = value;

    if (this.isJsonMode) {
      console.error(`[progress] ${status || 'Processing'} (${value}/${this.total})`);
      return;
    }

    if (this.bar) {
      this.bar.update(value, { status: status || '' });
    }
  }

  /**
   * Increment progress by 1
   */
  increment(status?: string): void {
    this.update(this.current + 1, status);
  }

  /**
   * Stop progress bar
   */
  stop(): void {
    if (this.bar) {
      this.bar.stop();
      this.bar = null;
    }
  }
}

/**
 * Multi-bar progress for parallel operations
 */
export class MultiProgressBar {
  private multibar: cliProgress.MultiBar | null = null;
  private bars: Map<string, cliProgress.SingleBar> = new Map();
  private isJsonMode: boolean = false;

  constructor(isJsonMode: boolean = false) {
    this.isJsonMode = isJsonMode;

    if (!isJsonMode) {
      this.multibar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: '{name} |{bar}| {percentage}% | {value}/{total}',
      }, cliProgress.Presets.shades_classic);
    }
  }

  /**
   * Add a new progress bar
   */
  add(name: string, total: number, startValue: number = 0): void {
    if (this.isJsonMode) {
      console.error(`[progress] ${name}: 0/${total}`);
      return;
    }

    if (this.multibar) {
      const bar = this.multibar.create(total, startValue, { name });
      this.bars.set(name, bar);
    }
  }

  /**
   * Update a specific progress bar
   */
  update(name: string, value: number): void {
    if (this.isJsonMode) {
      return;
    }

    const bar = this.bars.get(name);
    if (bar) {
      bar.update(value);
    }
  }

  /**
   * Increment a specific progress bar
   */
  increment(name: string): void {
    if (this.isJsonMode) {
      return;
    }

    const bar = this.bars.get(name);
    if (bar) {
      bar.increment();
    }
  }

  /**
   * Stop all progress bars
   */
  stop(): void {
    if (this.multibar) {
      this.multibar.stop();
      this.multibar = null;
      this.bars.clear();
    }
  }
}

/**
 * Format diff output with colors
 */
export function formatDiff(changeSet: {
  creates: any[];
  updates: any[];
  deletes: any[];
  moves?: Array<{ from: string; to: string }>;
}): string {
  const lines: string[] = [];

  // Header
  lines.push(chalk.bold('\nPlanned Changes:\n'));

  // Creates
  if (changeSet.creates.length > 0) {
    lines.push(colors.create(`  + ${changeSet.creates.length} to create`));
    changeSet.creates.forEach((node) => {
      lines.push(colors.create(`    + ${node.construct?.name || 'Unknown'}.${node.id}`));
    });
    lines.push('');
  }

  // Updates
  if (changeSet.updates.length > 0) {
    lines.push(colors.update(`  ~ ${changeSet.updates.length} to update`));
    changeSet.updates.forEach((node) => {
      lines.push(colors.update(`    ~ ${node.construct?.name || 'Unknown'}.${node.id}`));
    });
    lines.push('');
  }

  // Deletes
  if (changeSet.deletes.length > 0) {
    lines.push(colors.delete(`  - ${changeSet.deletes.length} to delete`));
    changeSet.deletes.forEach((node) => {
      lines.push(colors.delete(`    - ${node.construct?.name || 'Unknown'}.${node.id}`));
    });
    lines.push('');
  }

  // Moves
  if (changeSet.moves && changeSet.moves.length > 0) {
    lines.push(colors.move(`  → ${changeSet.moves.length} to move`));
    changeSet.moves.forEach((move) => {
      lines.push(colors.move(`    → ${move.from} → ${move.to}`));
    });
    lines.push('');
  }

  // Summary
  const total = changeSet.creates.length + changeSet.updates.length + changeSet.deletes.length + (changeSet.moves?.length || 0);
  lines.push(chalk.bold(`Total: ${total} changes\n`));

  return lines.join('\n');
}

/**
 * Format deployment status with colors
 */
export function formatDeploymentStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return colors.info('PENDING');
    case 'APPLYING':
      return colors.warning('APPLYING');
    case 'DEPLOYED':
      return colors.success('DEPLOYED');
    case 'FAILED':
      return colors.error('FAILED');
    case 'ROLLED_BACK':
      return colors.warning('ROLLED_BACK');
    default:
      return colors.dim(status);
  }
}

/**
 * Format resource output
 */
export function formatResource(construct: string, id: string, status?: string): string {
  const resourceStr = `${colors.resource(construct)}.${colors.highlight(id)}`;

  if (status) {
    return `${resourceStr} ${colors.dim('→')} ${formatDeploymentStatus(status)}`;
  }

  return resourceStr;
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  console.log(`${colors.checkmark} ${colors.success(message)}`);
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(`${colors.cross} ${colors.error(message)}`);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.warn(`${colors.warning('⚠')} ${colors.warning(message)}`);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(`${colors.info('ℹ')} ${colors.info(message)}`);
}

/**
 * Print section header
 */
export function printHeader(message: string): void {
  console.log(`\n${colors.highlight(message)}`);
  console.log(colors.dim('─'.repeat(message.length)));
}

/**
 * Print table
 */
export function printTable(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const widths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').length));
    return Math.max(header.length, maxRowWidth);
  });

  // Print header
  const headerRow = headers.map((header, i) => header.padEnd(widths[i])).join('  ');
  console.log(colors.highlight(headerRow));
  console.log(colors.dim('─'.repeat(headerRow.length)));

  // Print rows
  rows.forEach(row => {
    const rowStr = row.map((cell, i) => (cell || '').padEnd(widths[i])).join('  ');
    console.log(rowStr);
  });
}
