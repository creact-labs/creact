
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
 * Output Manager for User-Facing CLI Output
 *
 * Handles all user-facing output to stdout with support for:
 * - Normal mode: Colored, formatted output with spinners
 * - JSON mode: Structured JSON for programmatic consumption
 * - Quiet mode: Minimal output (errors and critical info only)
 *
 * This is separate from Logger which handles internal debugging to stderr.
 */

import chalk from 'chalk';
import type { ChangeSet, CloudDOMNode } from '../core/types';

/**
 * Output mode configuration
 */
export type OutputMode = 'normal' | 'json' | 'quiet';

/**
 * Output Manager configuration options
 */
export interface OutputOptions {
  /** Output mode (normal, json, quiet) */
  mode: OutputMode;

  /** Enable colors (default: true for normal mode, false for json/quiet) */
  colors?: boolean;

  /** Enable verbose error output with stack traces */
  verbose?: boolean;
}

/**
 * Error context for detailed error reporting
 */
export interface ErrorContext {
  /** Resource ID where error occurred */
  resourceId?: string;

  /** Root cause of the error */
  cause?: string;

  /** Stack trace (shown only in verbose mode) */
  stackTrace?: string;
}

/**
 * Deployment result summary
 */
export interface DeployResult {
  /** Total number of resources processed */
  resourceCount: number;

  /** Total deployment duration in seconds */
  duration: number;

  /** Number of resources created */
  creates: number;

  /** Number of resources updated */
  updates: number;

  /** Number of resources deleted */
  deletes: number;

  /** Errors encountered during deployment */
  errors?: Array<{ resourceId: string; message: string }>;
}

/**
 * Output Manager - Handles all user-facing CLI output
 */
export class OutputManager {
  private readonly mode: OutputMode;
  private readonly colors: boolean;
  private readonly verbose: boolean;

  constructor(options: OutputOptions) {
    this.mode = options.mode;
    this.colors = options.colors ?? options.mode === 'normal';
    this.verbose = options.verbose ?? false;
  }

  // ============================================================================
  // General Output Methods
  // ============================================================================

  /**
   * Show success message
   */
  showSuccess(message: string): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'success', message });
      return;
    }

    const formatted = this.colors ? chalk.green(message) : message;
    console.log(formatted);
  }

  /**
   * Show info message
   */
  showInfo(message: string): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'info', message });
      return;
    }

    console.log(message);
  }

  /**
   * Show warning message
   */
  showWarning(message: string): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'warning', message });
      return;
    }

    const formatted = this.colors ? chalk.yellow(message) : message;
    console.log(formatted);
  }

  /**
   * Show error message with optional context
   */
  showError(message: string, context?: ErrorContext): void {
    // Always show errors, even in quiet mode
    if (this.mode === 'json') {
      this.outputJson({
        type: 'error',
        message,
        resourceId: context?.resourceId,
        cause: context?.cause,
        stackTrace: this.verbose ? context?.stackTrace : undefined,
      });
      return;
    }

    const formatted = this.colors ? chalk.red(`Error: ${message}`) : `Error: ${message}`;
    console.error(formatted);

    if (context?.resourceId) {
      console.error(`  Resource: ${context.resourceId}`);
    }

    if (context?.cause) {
      console.error(`  Cause: ${context.cause}`);
    }

    if (this.verbose && context?.stackTrace) {
      console.error(`\nStack trace:\n${context.stackTrace}`);
    } else if (!this.verbose && context?.stackTrace) {
      console.error('\n  Run with --verbose for full stack trace.');
    }
  }

  // ============================================================================
  // Plan Display Methods
  // ============================================================================

  /**
   * Show plan header with stack name
   */
  showPlanHeader(stackName: string): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'plan_header', stackName });
      return;
    }

    const header = this.colors
      ? chalk.bold.cyan(`\nPlanning changes for stack: ${stackName}`)
      : `\nPlanning changes for stack: ${stackName}`;
    console.log(header);
    console.log(this.colors ? chalk.dim('─'.repeat(50)) : '─'.repeat(50));
  }

  /**
   * Show planned changes with diff visualization
   */
  showPlanChanges(changeSet: ChangeSet): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({
        type: 'plan_changes',
        creates: changeSet.creates.map((n) => this.nodeToJson(n)),
        updates: changeSet.updates.map((n) => this.nodeToJson(n)),
        deletes: changeSet.deletes.map((n) => this.nodeToJson(n)),
        moves: changeSet.moves,
      });
      return;
    }

    // Creates
    if (changeSet.creates.length > 0) {
      const header = this.colors
        ? chalk.green(`\n  + ${changeSet.creates.length} to create`)
        : `\n  + ${changeSet.creates.length} to create`;
      console.log(header);
      changeSet.creates.forEach((node) => {
        const line = `    + ${this.formatNodeId(node)}`;
        console.log(this.colors ? chalk.green(line) : line);
      });
    }

    // Updates
    if (changeSet.updates.length > 0) {
      const header = this.colors
        ? chalk.yellow(`\n  ~ ${changeSet.updates.length} to update`)
        : `\n  ~ ${changeSet.updates.length} to update`;
      console.log(header);
      changeSet.updates.forEach((node) => {
        const line = `    ~ ${this.formatNodeId(node)}`;
        console.log(this.colors ? chalk.yellow(line) : line);
      });
    }

    // Deletes
    if (changeSet.deletes.length > 0) {
      const header = this.colors
        ? chalk.red(`\n  - ${changeSet.deletes.length} to delete`)
        : `\n  - ${changeSet.deletes.length} to delete`;
      console.log(header);
      changeSet.deletes.forEach((node) => {
        const line = `    - ${this.formatNodeId(node)}`;
        console.log(this.colors ? chalk.red(line) : line);
      });
    }

    // Moves
    if (changeSet.moves && changeSet.moves.length > 0) {
      const header = this.colors
        ? chalk.cyan(`\n  → ${changeSet.moves.length} to move`)
        : `\n  → ${changeSet.moves.length} to move`;
      console.log(header);
      changeSet.moves.forEach((move) => {
        const line = `    → ${move.from} → ${move.to}`;
        console.log(this.colors ? chalk.cyan(line) : line);
      });
    }
  }

  /**
   * Show plan summary with change counts
   */
  showPlanSummary(changeSet: ChangeSet): void {
    if (this.mode === 'quiet') return;

    const creates = changeSet.creates.length;
    const updates = changeSet.updates.length;
    const deletes = changeSet.deletes.length;
    const moves = changeSet.moves?.length || 0;
    const total = creates + updates + deletes + moves;

    if (this.mode === 'json') {
      this.outputJson({
        type: 'plan_summary',
        creates,
        updates,
        deletes,
        moves,
        total,
      });
      return;
    }

    if (total === 0) {
      const message = this.colors
        ? chalk.dim('\nNo changes. Infrastructure is up-to-date.')
        : '\nNo changes. Infrastructure is up-to-date.';
      console.log(message);
      return;
    }

    const summary = `\nPlan: ${creates} to add, ${updates} to change, ${deletes} to destroy`;
    console.log(this.colors ? chalk.bold(summary) : summary);
  }

  // ============================================================================
  // Deployment Progress Methods
  // ============================================================================

  /**
   * Show deployment header
   */
  showDeployHeader(): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'deploy_header' });
      return;
    }

    const header = this.colors ? chalk.bold.cyan('\nApplying changes...') : '\nApplying changes...';
    console.log(header);
  }

  /**
   * Show resource deployment progress
   */
  showResourceProgress(id: string, action: string): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'resource_progress', resourceId: id, action });
      return;
    }

    const spinner = this.colors ? chalk.cyan('⟳') : '⟳';
    const message = `${spinner} ${id}: ${action}...`;
    console.log(message);
  }

  /**
   * Show resource deployment completion
   */
  showResourceComplete(id: string, action: string, duration: number): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'resource_complete', resourceId: id, action, duration });
      return;
    }

    const checkmark = this.colors ? chalk.green('✓') : '✓';
    const durationStr = duration.toFixed(1);
    const message = `${checkmark} ${id}: ${action} (${durationStr}s)`;
    console.log(this.colors ? chalk.green(message) : message);
  }

  /**
   * Show deployment summary
   */
  showDeploySummary(result: DeployResult): void {
    if (this.mode === 'quiet' && !result.errors?.length) return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'deploy_summary', ...result });
      return;
    }

    console.log('');

    if (result.errors && result.errors.length > 0) {
      const message = this.colors
        ? chalk.red(`Deployment failed with ${result.errors.length} error(s)`)
        : `Deployment failed with ${result.errors.length} error(s)`;
      console.log(message);
      result.errors.forEach((err) => {
        console.log(`  - ${err.resourceId}: ${err.message}`);
      });
      return;
    }

    const summary = `Apply complete! Resources: ${result.creates} added, ${result.updates} changed, ${result.deletes} destroyed`;
    const duration = `Duration: ${result.duration.toFixed(1)}s`;

    console.log(this.colors ? chalk.bold.green(summary) : summary);
    console.log(this.colors ? chalk.dim(duration) : duration);
  }

  // ============================================================================
  // Reactive Changes Methods
  // ============================================================================

  /**
   * Show reactive changes detected notification
   */
  showReactiveChangesDetected(): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'reactive_changes_detected' });
      return;
    }

    const message = this.colors
      ? chalk.yellow('\nReactive changes detected')
      : '\nReactive changes detected';
    console.log(message);
  }

  // ============================================================================
  // Hot Reload Methods
  // ============================================================================

  /**
   * Show file changed notification
   */
  showFileChanged(filename: string): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'file_changed', filename });
      return;
    }

    const message = `File changed: ${filename}`;
    console.log(this.colors ? chalk.blue(message) : message);
  }

  /**
   * Show hot reload start notification
   */
  showHotReloadStart(): void {
    if (this.mode === 'quiet') return;

    if (this.mode === 'json') {
      this.outputJson({ type: 'hot_reload_start' });
      return;
    }

    const message = this.colors ? chalk.cyan('Hot reloading...') : 'Hot reloading...';
    console.log(message);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Output JSON to stdout
   */
  private outputJson(data: any): void {
    console.log(JSON.stringify({ ...data, timestamp: Date.now() }));
  }

  /**
   * Format node ID for display
   */
  private formatNodeId(node: CloudDOMNode): string {
    const constructName = node.construct?.name || 'Unknown';
    return `${constructName}.${node.id}`;
  }

  /**
   * Convert CloudDOM node to JSON representation
   */
  private nodeToJson(node: CloudDOMNode): any {
    return {
      id: node.id,
      construct: node.construct?.name || 'Unknown',
      path: node.path.join('.'),
    };
  }
}

/**
 * Create an Output Manager from CLI flags
 */
export function createOutputManager(flags: {
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}): OutputManager {
  let mode: OutputMode = 'normal';

  if (flags.json) {
    mode = 'json';
  } else if (flags.quiet) {
    mode = 'quiet';
  }

  return new OutputManager({
    mode,
    verbose: flags.verbose,
  });
}
