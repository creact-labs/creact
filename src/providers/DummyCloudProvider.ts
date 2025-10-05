// REQ-04: Dummy provider implementation for POC and testing
// REQ-09: Lifecycle hooks implementation

import { ICloudProvider, CloudDOMNode } from './ICloudProvider';

/**
 * DummyCloudProvider is a POC implementation that logs CloudDOM structure
 * instead of deploying actual infrastructure.
 * 
 * Use cases:
 * - POC demonstrations
 * - Testing without cloud credentials
 * - Development and debugging
 * - CI/CD validation
 * 
 * This is a standalone implementation, NOT a base class.
 * 
 * @example
 * ```typescript
 * const provider = new DummyCloudProvider();
 * await provider.initialize();
 * provider.materialize(cloudDOM);
 * ```
 */
export class DummyCloudProvider implements ICloudProvider {
  private initialized = false;

  /**
   * Optional initialization (simulates async setup)
   * REQ-04.4: Support async initialization
   */
  async initialize(): Promise<void> {
    console.log('[DummyCloudProvider] Initializing...');
    this.initialized = true;
  }

  /**
   * Check if provider is initialized
   * Useful for integration testing
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Materialize CloudDOM by logging structure with indentation
   * REQ-04: Core provider interface implementation
   * 
   * @param cloudDOM - Array of CloudDOM nodes to materialize
   * @param scope - Optional provider-specific scope (unused in dummy)
   */
  materialize(cloudDOM: CloudDOMNode[], scope?: any): void {
    console.debug('\n=== DummyCloudProvider: Materializing CloudDOM ===\n');

    cloudDOM.forEach(node => {
      this.logNode(node, 0);
    });

    console.debug('\n=== Materialization Complete ===\n');
  }

  /**
   * Recursively log CloudDOM node with indentation
   * Outputs are logged in format: nodeId.outputKey = value
   */
  private logNode(node: CloudDOMNode, depth: number, visited: Set<any> = new Set()): void {
    // Prevent infinite recursion from circular references
    if (visited.has(node)) {
      const indent = '  '.repeat(depth);
      console.debug(`${indent}[Circular reference to ${node.id}]`);
      return;
    }
    visited.add(node);

    // Limit depth to prevent stack overflow
    if (depth > 50) {
      const indent = '  '.repeat(depth);
      console.debug(`${indent}[Max depth reached]`);
      return;
    }

    const indent = '  '.repeat(depth);

    // Log resource
    console.debug(`${indent}Deploying: ${node.id} (${node.construct?.name || 'Unknown'})`);

    // Safely log props (handle undefined/null)
    const propsStr = this.safeStringify(node.props || {}, 2);
    const propsLines = propsStr.split('\n');
    console.debug(`${indent}  Props: ${propsLines.join(`\n${indent}  `)}`);

    // Log outputs
    if (node.outputs && Object.keys(node.outputs).length > 0) {
      console.debug(`${indent}  Outputs:`);
      Object.entries(node.outputs).forEach(([outputKey, value]) => {
        console.debug(`${indent}    ${node.id}.${outputKey} = ${this.safeStringify(value)}`);
      });
    }

    // Log children recursively
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.logNode(child, depth + 1, visited);
      });
    }
  }

  /**
   * Safely stringify objects, handling circular references and non-JSON values
   */
  private safeStringify(obj: any, indent?: number): string {
    try {
      return JSON.stringify(obj, this.getCircularReplacer(), indent);
    } catch (error) {
      return '[Unable to stringify: contains circular references or non-JSON values]';
    }
  }

  /**
   * JSON replacer function that handles circular references
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      // Handle functions
      if (typeof value === 'function') {
        return '[Function]';
      }
      // Handle symbols
      if (typeof value === 'symbol') {
        return '[Symbol]';
      }
      return value;
    };
  }

  /**
   * Optional lifecycle hook: called before deployment
   * REQ-09.1: preDeploy lifecycle hook
   */
  async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
    console.debug('[DummyCloudProvider] preDeploy hook called');
    console.debug(`[DummyCloudProvider] Validating ${cloudDOM.length} resources...`);
  }

  /**
   * Optional lifecycle hook: called after successful deployment
   * REQ-09.2: postDeploy lifecycle hook
   */
  async postDeploy(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void> {
    console.debug('[DummyCloudProvider] postDeploy hook called');
    console.debug(`[DummyCloudProvider] Deployed ${cloudDOM.length} resources`);
    console.debug(`[DummyCloudProvider] Collected ${Object.keys(outputs).length} outputs`);
  }

  /**
   * Optional lifecycle hook: called when deployment fails
   * REQ-09.3: onError lifecycle hook
   */
  async onError(error: Error, cloudDOM: CloudDOMNode[]): Promise<void> {
    console.error('[DummyCloudProvider] onError hook called');
    console.error(`[DummyCloudProvider] Deployment failed: ${error.message}`);
    console.error(`[DummyCloudProvider] Failed while deploying ${cloudDOM.length} resources`);
  }
}
