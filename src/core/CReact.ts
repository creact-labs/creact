// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator - main class
// Orchestrates the entire pipeline: render → validate → build → deploy

import { Renderer } from './Renderer';
import { Validator } from './Validator';
import { CloudDOMBuilder } from './CloudDOMBuilder';
import { ICloudProvider } from '../providers/ICloudProvider';
import { IBackendProvider } from '../providers/IBackendProvider';
import { CloudDOMNode, JSXElement } from './types';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

/**
 * Configuration for CReact orchestrator
 * REQ-04: Dependency injection - providers are injected via config
 */
export interface CReactConfig {
  /** Cloud provider for materialization (injected) */
  cloudProvider: ICloudProvider;
  
  /** Backend provider for state management (injected) */
  backendProvider: IBackendProvider;
  
  /** Optional migration map for refactoring (REQ-08) */
  migrationMap?: Record<string, string>;
  
  /** Async timeout in milliseconds (default: 5 minutes) (REQ-10.5) */
  asyncTimeout?: number;
  
  /** Optional persistence directory (default: '.creact') (REQ-01.6) */
  persistDir?: string;
}

/**
 * CReact orchestrator - main class
 * 
 * Orchestrates the entire infrastructure-as-code pipeline:
 * 1. Render JSX → Fiber tree
 * 2. Validate Fiber tree
 * 3. Build CloudDOM from Fiber
 * 4. Persist CloudDOM to disk
 * 5. Compare CloudDOM trees (diff)
 * 6. Deploy CloudDOM to cloud provider
 * 
 * REQ-01: JSX → CloudDOM rendering
 * REQ-04: Dependency injection pattern
 * REQ-05: Deployment orchestration
 * REQ-07: Validation before commit/deploy
 * REQ-09: Provider lifecycle hooks
 */
export class CReact {
  private renderer: Renderer;
  private validator: Validator;
  private cloudDOMBuilder: CloudDOMBuilder;
  // Note: Reconciler will be added in Phase 3 (Task 14)
  
  /**
   * Constructor receives all dependencies via config (dependency injection)
   * 
   * REQ-04: Providers are injected, not inherited
   * 
   * @param config - Configuration with injected providers
   */
  constructor(private config: CReactConfig) {
    // Instantiate core components
    this.renderer = new Renderer();
    this.validator = new Validator();
    
    // Inject cloud provider into CloudDOMBuilder (REQ-04)
    this.cloudDOMBuilder = new CloudDOMBuilder(config.cloudProvider);
    
    // Note: Reconciler will be instantiated here in Phase 3
    // this.reconciler = new Reconciler(config.migrationMap);
  }
  
  /**
   * Debug logging helper
   * Logs messages when CREACT_DEBUG environment variable is set
   * 
   * @param message - Message to log
   */
  private log(message: string): void {
    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[CReact] ${message}`);
    }
  }
  
  /**
   * Build CloudDOM from JSX
   * 
   * Pipeline: render → validate → build → persist
   * 
   * REQ-01: JSX → CloudDOM rendering
   * REQ-01.6: Persist CloudDOM to disk
   * REQ-07: Validate before commit
   * 
   * @param jsx - JSX element to render
   * @returns Promise resolving to CloudDOM tree
   */
  async build(jsx: JSXElement): Promise<CloudDOMNode[]> {
    this.log('Starting build pipeline');
    
    // Step 1: Render JSX → Fiber
    this.log('Rendering JSX to Fiber tree');
    const fiber = this.renderer.render(jsx);
    
    // Step 2: Validate Fiber (REQ-07)
    this.log('Validating Fiber tree');
    this.validator.validate(fiber);
    
    // Step 3: Build CloudDOM from Fiber (commit phase)
    this.log('Building CloudDOM from Fiber');
    const cloudDOM = await this.cloudDOMBuilder.build(fiber);
    
    // Step 4: Persist CloudDOM to disk (REQ-01.6)
    this.log('Persisting CloudDOM to disk');
    await this.persistCloudDOM(cloudDOM);
    
    this.log('Build pipeline complete');
    return cloudDOM;
  }
  
  /**
   * Build CloudDOM with error handling for CLI/CI environments
   * 
   * Provides a safer entrypoint that handles errors gracefully without
   * crashing the entire process. Useful for CI/CD pipelines.
   * 
   * @param jsx - JSX element to render
   * @returns Promise resolving to CloudDOM tree, or empty array on error
   */
  async buildSafe(jsx: JSXElement): Promise<CloudDOMNode[]> {
    try {
      return await this.build(jsx);
    } catch (error) {
      console.error('[CReact] Build failed:', error);
      return [];
    }
  }
  
  /**
   * Compare two CloudDOM trees and return diff
   * 
   * REQ-05: Reconciliation and diff
   * REQ-07.6: Validate before comparing
   * 
   * Note: This will be fully implemented in Phase 3 (Task 14) when Reconciler is added
   * 
   * @param previous - Previous CloudDOM tree
   * @param current - Current CloudDOM tree
   * @returns Diff object (placeholder for now)
   */
  async compare(previous: CloudDOMNode[], current: CloudDOMNode[]): Promise<any> {
    // REQ-07.6: Validate before comparing
    const currentFiber = this.renderer.getCurrentFiber();
    if (currentFiber) {
      this.validator.validate(currentFiber);
    }
    
    // TODO: Implement in Phase 3 (Task 14)
    // return this.reconciler.diff(previous, current);
    
    // Placeholder implementation
    return {
      creates: [],
      updates: [],
      deletes: [],
      moves: []
    };
  }
  
  /**
   * Deploy CloudDOM to cloud provider
   * 
   * Pipeline: validate → check idempotency → lifecycle hooks → materialize → save state
   * 
   * REQ-05: Deployment orchestration
   * REQ-05.4: Idempotent deployment
   * REQ-07.6: Validate before deploying
   * REQ-09: Provider lifecycle hooks
   * 
   * @param cloudDOM - CloudDOM tree to deploy
   * @param stackName - Stack name for state management (default: 'default')
   */
  async deploy(cloudDOM: CloudDOMNode[], stackName: string = 'default'): Promise<void> {
    // REQ-07.6: Validate before deploying
    const currentFiber = this.renderer.getCurrentFiber();
    if (currentFiber) {
      this.validator.validate(currentFiber);
    }
    
    // REQ-05.4: Check for changes (idempotent deployment)
    this.log('Checking for changes (idempotent deployment)');
    const previousState = await this.config.backendProvider.getState(stackName);
    
    if (previousState?.cloudDOM) {
      // TODO: Use Reconciler in Phase 3 to properly diff
      // For now, simple check if CloudDOM is identical
      const hasChanges = JSON.stringify(previousState.cloudDOM) !== JSON.stringify(cloudDOM);
      
      if (!hasChanges) {
        this.log('CloudDOM is identical to previous state');
        return;
      }
      
      this.log('CloudDOM differs from previous state');
    } else {
      this.log('First deployment for this stack');
    }
    
    try {
      // REQ-09.1: Lifecycle hook - preDeploy
      if (this.config.cloudProvider.preDeploy) {
        this.log('Calling preDeploy lifecycle hook');
        await this.config.cloudProvider.preDeploy(cloudDOM);
      }
      
      // Materialize CloudDOM to infrastructure
      this.log('Materializing CloudDOM to infrastructure');
      this.config.cloudProvider.materialize(cloudDOM, null);
      
      // Collect outputs from materialization
      // TODO: In Phase 2 (Task 13), extract outputs from CloudDOM nodes
      this.log('Extracting outputs from CloudDOM');
      const outputs = this.extractOutputs(cloudDOM);
      
      // Save state to backend
      this.log(`Saving state to backend (stack: ${stackName})`);
      await this.config.backendProvider.saveState(stackName, {
        cloudDOM,
        outputs,
        timestamp: new Date().toISOString()
      });
      
      // REQ-09.2: Lifecycle hook - postDeploy
      if (this.config.cloudProvider.postDeploy) {
        this.log('Calling postDeploy lifecycle hook');
        await this.config.cloudProvider.postDeploy(cloudDOM, outputs);
      }
      
      this.log('Deployment complete');
      
    } catch (error) {
      console.error('[CReact] Deployment failed:', error);
      
      // REQ-09.3: Lifecycle hook - onError
      if (this.config.cloudProvider.onError) {
        this.log('Calling onError lifecycle hook');
        await this.config.cloudProvider.onError(error as Error, cloudDOM);
      }
      
      // Save failed state for post-mortem analysis
      try {
        this.log('Saving failed deployment state');
        await this.config.backendProvider.saveState(`${stackName}-failed`, {
          error: (error as Error).message,
          cloudDOM,
          timestamp: new Date().toISOString()
        });
      } catch (saveError) {
        console.error('[CReact] Failed to save error state:', saveError);
      }
      
      // Re-throw error to halt deployment (REQ-09.4)
      throw error;
    }
  }
  
  /**
   * Validate CloudDOM schema before persistence
   * 
   * Ensures each node has required fields to catch upstream logic regressions.
   * 
   * @param cloudDOM - CloudDOM tree to validate
   * @throws Error if schema validation fails
   */
  private validateCloudDOMSchema(cloudDOM: CloudDOMNode[]): void {
    const validateNode = (node: CloudDOMNode, path: string) => {
      // Check required fields
      if (!node.id || typeof node.id !== 'string') {
        throw new Error(`CloudDOM node at ${path} missing or invalid 'id' field`);
      }
      if (!node.path || !Array.isArray(node.path)) {
        throw new Error(`CloudDOM node at ${path} missing or invalid 'path' field`);
      }
      if (!node.construct) {
        throw new Error(`CloudDOM node at ${path} missing 'construct' field`);
      }
      if (!node.props || typeof node.props !== 'object') {
        throw new Error(`CloudDOM node at ${path} missing or invalid 'props' field`);
      }
      if (!Array.isArray(node.children)) {
        throw new Error(`CloudDOM node at ${path} missing or invalid 'children' field`);
      }
      
      // Recursively validate children
      node.children.forEach((child, index) => {
        validateNode(child, `${path}.children[${index}]`);
      });
    };
    
    cloudDOM.forEach((node, index) => {
      validateNode(node, `cloudDOM[${index}]`);
    });
  }
  
  /**
   * Acquire write lock for persistence
   * 
   * Prevents race conditions when multiple CReact processes run concurrently
   * in the same directory.
   * 
   * Handles concurrent scenarios where the directory might be deleted/recreated
   * between async operations by ensuring the directory exists before each write attempt.
   * 
   * @param lockPath - Path to lock file
   * @param maxRetries - Maximum number of retry attempts (default: 10)
   * @param retryDelay - Delay between retries in ms (default: 100)
   * @throws Error if lock cannot be acquired after max retries
   */
  private async acquireWriteLock(
    lockPath: string,
    maxRetries: number = 10,
    retryDelay: number = 100
  ): Promise<void> {
    const dir = path.dirname(lockPath);
    
    // Ensure directory exists right before attempting to write
    // This prevents ENOENT errors in concurrent scenarios
    await fs.promises.mkdir(dir, { recursive: true });
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Try to create lock file exclusively (fails if exists)
        await fs.promises.writeFile(lockPath, process.pid.toString(), {
          flag: 'wx', // Exclusive write - fails if file exists
        });
        this.log(`Write lock acquired: ${lockPath}`);
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, check if process is still alive
          try {
            const lockPid = parseInt(
              await fs.promises.readFile(lockPath, 'utf-8'),
              10
            );
            
            // Check if process is still running
            try {
              process.kill(lockPid, 0); // Signal 0 checks if process exists
              // Process exists, wait and retry
              this.log(`Lock held by process ${lockPid}, waiting...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            } catch {
              // Process doesn't exist, remove stale lock
              this.log(`Removing stale lock from process ${lockPid}`);
              await fs.promises.unlink(lockPath);
            }
          } catch {
            // Can't read lock file, try to remove it
            try {
              await fs.promises.unlink(lockPath);
            } catch {
              // Ignore unlink errors
            }
          }
        } else if (error.code === 'ENOENT') {
          // Directory disappeared between mkdir and writeFile (race condition)
          // Recreate directory and retry
          this.log(`Directory disappeared, recreating: ${dir}`);
          await fs.promises.mkdir(dir, { recursive: true });
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          // Unexpected error, re-throw
          throw error;
        }
      }
    }
    
    throw new Error(
      `Failed to acquire write lock after ${maxRetries} attempts`
    );
  }
  
  /**
   * Release write lock
   * 
   * @param lockPath - Path to lock file
   */
  private async releaseWriteLock(lockPath: string): Promise<void> {
    try {
      await fs.promises.unlink(lockPath);
      this.log(`Write lock released: ${lockPath}`);
    } catch (error) {
      // Ignore errors when releasing lock (file may not exist)
      this.log(`Failed to release lock (may not exist): ${lockPath}`);
    }
  }
  
  /**
   * Calculate SHA-256 checksum of content
   * 
   * @param content - Content to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }
  
  /**
   * Persist CloudDOM to disk
   * 
   * Creates persistence directory if it doesn't exist and saves CloudDOM
   * to `clouddom.json` with formatted JSON for readability.
   * 
   * Features:
   * - Schema validation to catch upstream regressions
   * - Atomic writes (write to temp file, then rename)
   * - Write locking to prevent concurrent write conflicts
   * - SHA-256 checksum for integrity verification
   * - Latency logging for performance monitoring
   * 
   * Handles race conditions gracefully by retrying operations if directory
   * is deleted during persistence (common in test environments).
   * 
   * REQ-01.6: Persist CloudDOM to disk for debugging and determinism
   * 
   * @param cloudDOM - CloudDOM tree to persist
   * @returns Path to persisted CloudDOM file
   * @throws Error if CloudDOM contains non-serializable values or write fails
   */
  private async persistCloudDOM(cloudDOM: CloudDOMNode[]): Promise<string> {
    const startTime = Date.now();
    this.log(`Starting CloudDOM persistence at ${new Date(startTime).toISOString()}`);
    
    let lockPath: string | undefined;
    
    try {
      // Validate CloudDOM schema before serialization
      // Protects from upstream logic regressions
      this.log('Validating CloudDOM schema');
      this.validateCloudDOMSchema(cloudDOM);
      
      // Validate CloudDOM is serializable before attempting to write
      // This prevents silent corruption from cyclic structures or non-serializable values
      this.log('Validating CloudDOM serializability');
      try {
        JSON.stringify(cloudDOM);
      } catch (serializationError) {
        throw new Error('CloudDOM contains non-serializable values', {
          cause: serializationError,
        });
      }
      
      // Resolve persistence directory (configurable, defaults to '.creact')
      // Use path.resolve to handle both relative and absolute paths correctly
      const creactDir = path.resolve(this.config.persistDir ?? '.creact');
      
      // Create persistence directory if it doesn't exist (async)
      // MUST happen before acquiring lock since lock file goes in this directory
      // Using recursive: true means this won't fail if directory already exists
      this.log(`Ensuring persistence directory exists: ${creactDir}`);
      await fs.promises.mkdir(creactDir, { recursive: true });
      
      // Acquire write lock to prevent concurrent write conflicts
      lockPath = path.join(creactDir, '.clouddom.lock');
      await this.acquireWriteLock(lockPath);
      
      // Prepare CloudDOM JSON with formatting for readability
      // Add trailing newline for proper file formatting (even for empty arrays)
      const cloudDOMJson = JSON.stringify(cloudDOM, null, 2) + '\n';
      
      // Calculate SHA-256 checksum for integrity verification
      const checksum = this.calculateChecksum(cloudDOMJson);
      this.log(`CloudDOM checksum: ${checksum}`);
      
      // Defensive check: ensure directory still exists after lock acquisition
      // (it might have been deleted by cleanup between lock and write)
      await fs.promises.mkdir(creactDir, { recursive: true });
      
      // Use atomic writes to prevent partial data corruption
      // Write to temp file first, then rename (atomic operation)
      const cloudDOMPath = path.join(creactDir, 'clouddom.json');
      const checksumPath = path.join(creactDir, 'clouddom.sha256');
      const tmpPath = `${cloudDOMPath}.tmp`;
      const tmpChecksumPath = `${checksumPath}.tmp`;
      
      // Write files with defensive directory checks before each operation
      // This handles race conditions where cleanup might delete the directory
      try {
        this.log(`Writing CloudDOM to temporary file: ${tmpPath}`);
        await fs.promises.mkdir(creactDir, { recursive: true }); // Defensive
        await fs.promises.writeFile(tmpPath, cloudDOMJson, 'utf-8');
        
        this.log(`Writing checksum to temporary file: ${tmpChecksumPath}`);
        await fs.promises.mkdir(creactDir, { recursive: true }); // Defensive
        await fs.promises.writeFile(tmpChecksumPath, checksum, 'utf-8');
        
        this.log(`Atomically renaming to: ${cloudDOMPath}`);
        await fs.promises.mkdir(creactDir, { recursive: true }); // Defensive
        await fs.promises.rename(tmpPath, cloudDOMPath);
        
        this.log(`Atomically renaming checksum to: ${checksumPath}`);
        await fs.promises.mkdir(creactDir, { recursive: true }); // Defensive
        await fs.promises.rename(tmpChecksumPath, checksumPath);
      } catch (error: any) {
        // Clean up temp files if they exist
        try {
          if (fs.existsSync(tmpPath)) await fs.promises.unlink(tmpPath);
          if (fs.existsSync(tmpChecksumPath)) await fs.promises.unlink(tmpChecksumPath);
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
      
      // Calculate and log persistence latency
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      this.log(
        `CloudDOM persistence completed at ${new Date(endTime).toISOString()} (latency: ${latencyMs}ms)`
      );
      this.log(
        `CloudDOM persisted to: ${cloudDOMPath} (${latencyMs}ms, checksum: ${checksum.substring(0, 8)}...)`
      );
      
      return cloudDOMPath;
      
    } catch (error: any) {
      console.error('[CReact] Failed to persist CloudDOM:', error);
      
      // Propagate original validation/serialization errors directly
      // so tests can assert on specific error messages
      if (error instanceof Error && /CloudDOM|missing|non-serializable/.test(error.message)) {
        throw error;
      }
      
      // Preserve original error context using 'cause' (Node ≥16.9)
      // This maintains stack trace and makes upstream error handling easier
      throw new Error('Failed to persist CloudDOM', { cause: error });
      
    } finally {
      // Always release write lock, even on error
      if (lockPath) {
        await this.releaseWriteLock(lockPath);
      }
    }
  }
  
  /**
   * Extract outputs from CloudDOM nodes
   * 
   * REQ-02: Extract outputs from useState calls
   * REQ-06: Universal output access
   * 
   * Note: This will be fully implemented in Phase 2 (Task 13)
   * 
   * @param cloudDOM - CloudDOM tree
   * @returns Outputs object
   */
  private extractOutputs(cloudDOM: CloudDOMNode[]): Record<string, any> {
    const outputs: Record<string, any> = {};
    
    const walk = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        // Extract outputs from node
        if (node.outputs) {
          for (const [key, value] of Object.entries(node.outputs)) {
            // Output name format: nodeId.outputKey (REQ-06)
            const outputName = `${node.id}.${key}`;
            outputs[outputName] = value;
          }
        }
        
        // Recursively walk children
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    
    walk(cloudDOM);
    return outputs;
  }
  
  /**
   * Get the cloud provider (for testing/debugging)
   * 
   * @returns The injected cloud provider
   */
  getCloudProvider(): ICloudProvider {
    return this.config.cloudProvider;
  }
  
  /**
   * Get the backend provider (for testing/debugging)
   * 
   * @returns The injected backend provider
   */
  getBackendProvider(): IBackendProvider {
    return this.config.backendProvider;
  }
}
