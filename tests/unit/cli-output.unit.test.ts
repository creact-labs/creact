/**
 * Unit tests for CLI output utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  colors,
  Spinner,
  ProgressBar,
  MultiProgressBar,
  formatDiff,
  formatDeploymentStatus,
  formatResource,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printHeader,
  printTable,
} from '../../src/cli/output';

describe('CLI Output Utilities', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('colors', () => {
    it('should provide color functions', () => {
      expect(colors.success).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.info).toBeDefined();
      expect(colors.create).toBeDefined();
      expect(colors.update).toBeDefined();
      expect(colors.delete).toBeDefined();
    });

    it('should format text with colors', () => {
      const successText = colors.success('Success');
      const errorText = colors.error('Error');
      
      expect(successText).toContain('Success');
      expect(errorText).toContain('Error');
    });
  });

  describe('Spinner', () => {
    it('should create spinner in normal mode', () => {
      const spinner = new Spinner(false);
      expect(spinner).toBeDefined();
    });

    it('should create spinner in JSON mode', () => {
      const spinner = new Spinner(true);
      spinner.start('Loading...');
      
      // In JSON mode, should log to stderr
      expect(consoleErrorSpy).toHaveBeenCalledWith('[info] Loading...');
    });

    it('should update spinner text', () => {
      const spinner = new Spinner(true);
      spinner.start('Loading...');
      spinner.update('Still loading...');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[info] Still loading...');
    });

    it('should mark spinner as successful', () => {
      const spinner = new Spinner(true);
      spinner.start('Loading...');
      spinner.succeed('Done!');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[success] Done!');
    });

    it('should mark spinner as failed', () => {
      const spinner = new Spinner(true);
      spinner.start('Loading...');
      spinner.fail('Failed!');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[error] Failed!');
    });

    it('should mark spinner as warning', () => {
      const spinner = new Spinner(true);
      spinner.start('Loading...');
      spinner.warn('Warning!');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[warning] Warning!');
    });
  });

  describe('ProgressBar', () => {
    it('should create progress bar in JSON mode', () => {
      const progress = new ProgressBar(true);
      progress.start(10, 0, 'Processing');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[progress] Processing (0/10)');
    });

    it('should update progress', () => {
      const progress = new ProgressBar(true);
      progress.start(10, 0, 'Processing');
      progress.update(5, 'Halfway');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[progress] Halfway (5/10)');
    });

    it('should increment progress', () => {
      const progress = new ProgressBar(true);
      progress.start(10, 0);
      progress.increment('Step 1');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[progress] Step 1 (1/10)');
    });

    it('should stop progress bar', () => {
      const progress = new ProgressBar(true);
      progress.start(10, 0);
      progress.stop();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('MultiProgressBar', () => {
    it('should create multi-progress bar in JSON mode', () => {
      const multiProgress = new MultiProgressBar(true);
      multiProgress.add('Task 1', 10, 0);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[progress] Task 1: 0/10');
    });

    it('should stop all progress bars', () => {
      const multiProgress = new MultiProgressBar(true);
      multiProgress.add('Task 1', 10, 0);
      multiProgress.stop();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('formatDiff', () => {
    it('should format empty diff', () => {
      const diff = formatDiff({
        creates: [],
        updates: [],
        deletes: [],
      });
      
      expect(diff).toContain('Planned Changes');
      expect(diff).toContain('Total: 0 changes');
    });

    it('should format diff with creates', () => {
      const diff = formatDiff({
        creates: [
          { id: 'api', construct: { name: 'AwsLambda' } },
          { id: 'db', construct: { name: 'DockerContainer' } },
        ],
        updates: [],
        deletes: [],
      });
      
      expect(diff).toContain('2 to create');
      expect(diff).toContain('AwsLambda.api');
      expect(diff).toContain('DockerContainer.db');
      expect(diff).toContain('Total: 2 changes');
    });

    it('should format diff with updates', () => {
      const diff = formatDiff({
        creates: [],
        updates: [
          { id: 'vpc', construct: { name: 'TerraformModule' } },
        ],
        deletes: [],
      });
      
      expect(diff).toContain('1 to update');
      expect(diff).toContain('TerraformModule.vpc');
    });

    it('should format diff with deletes', () => {
      const diff = formatDiff({
        creates: [],
        updates: [],
        deletes: [
          { id: 'old-service', construct: { name: 'AwsLambda' } },
        ],
      });
      
      expect(diff).toContain('1 to delete');
      expect(diff).toContain('AwsLambda.old-service');
    });

    it('should format diff with moves', () => {
      const diff = formatDiff({
        creates: [],
        updates: [],
        deletes: [],
        moves: [
          { from: 'frontend.old', to: 'frontend.new' },
        ],
      });
      
      expect(diff).toContain('1 to move');
      expect(diff).toContain('frontend.old');
      expect(diff).toContain('frontend.new');
    });

    it('should format diff with all change types', () => {
      const diff = formatDiff({
        creates: [{ id: 'new', construct: { name: 'Resource' } }],
        updates: [{ id: 'existing', construct: { name: 'Resource' } }],
        deletes: [{ id: 'old', construct: { name: 'Resource' } }],
        moves: [{ from: 'a', to: 'b' }],
      });
      
      expect(diff).toContain('1 to create');
      expect(diff).toContain('1 to update');
      expect(diff).toContain('1 to delete');
      expect(diff).toContain('1 to move');
      expect(diff).toContain('Total: 4 changes');
    });
  });

  describe('formatDeploymentStatus', () => {
    it('should format PENDING status', () => {
      const status = formatDeploymentStatus('PENDING');
      expect(status).toContain('PENDING');
    });

    it('should format APPLYING status', () => {
      const status = formatDeploymentStatus('APPLYING');
      expect(status).toContain('APPLYING');
    });

    it('should format DEPLOYED status', () => {
      const status = formatDeploymentStatus('DEPLOYED');
      expect(status).toContain('DEPLOYED');
    });

    it('should format FAILED status', () => {
      const status = formatDeploymentStatus('FAILED');
      expect(status).toContain('FAILED');
    });

    it('should format ROLLED_BACK status', () => {
      const status = formatDeploymentStatus('ROLLED_BACK');
      expect(status).toContain('ROLLED_BACK');
    });

    it('should handle case-insensitive status', () => {
      const status = formatDeploymentStatus('deployed');
      expect(status).toContain('DEPLOYED');
    });
  });

  describe('formatResource', () => {
    it('should format resource without status', () => {
      const resource = formatResource('AwsLambda', 'api');
      expect(resource).toContain('AwsLambda');
      expect(resource).toContain('api');
    });

    it('should format resource with status', () => {
      const resource = formatResource('AwsLambda', 'api', 'DEPLOYED');
      expect(resource).toContain('AwsLambda');
      expect(resource).toContain('api');
      expect(resource).toContain('DEPLOYED');
    });
  });

  describe('print functions', () => {
    it('should print success message', () => {
      printSuccess('Operation completed');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('Operation completed');
    });

    it('should print error message', () => {
      printError('Operation failed');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Operation failed');
    });

    it('should print warning message', () => {
      printWarning('Be careful');
      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('Be careful');
    });

    it('should print info message', () => {
      printInfo('FYI');
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('FYI');
    });

    it('should print header', () => {
      printHeader('Section Title');
      expect(consoleLogSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls;
      expect(calls.some((call: any) => call[0].includes('Section Title'))).toBe(true);
    });
  });

  describe('printTable', () => {
    it('should print table with headers and rows', () => {
      printTable(
        ['Name', 'Status', 'Version'],
        [
          ['Provider1', 'Active', '1.0.0'],
          ['Provider2', 'Inactive', '2.0.0'],
        ]
      );
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls;
      
      // Check header
      expect(calls.some((call: any) => call[0].includes('Name'))).toBe(true);
      expect(calls.some((call: any) => call[0].includes('Status'))).toBe(true);
      
      // Check rows
      expect(calls.some((call: any) => call[0].includes('Provider1'))).toBe(true);
      expect(calls.some((call: any) => call[0].includes('Provider2'))).toBe(true);
    });

    it('should handle empty table', () => {
      printTable(['Name', 'Status'], []);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls;
      expect(calls.some((call: any) => call[0].includes('Name'))).toBe(true);
    });

    it('should handle varying column widths', () => {
      printTable(
        ['Short', 'Very Long Header Name'],
        [
          ['A', 'B'],
          ['Very Long Value', 'C'],
        ]
      );
      
      expect(consoleLogSpy).toHaveBeenCalled();
      // Should not throw and should format properly
    });
  });
});
