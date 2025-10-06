// REQ-04: Provider interfaces for dependency injection
// REQ-09: Lifecycle hooks for observability and error handling

/**
 * CloudDOM node structure representing a cloud resource
 */
export interface CloudDOMNode {
  id: string;
  path: string[];
  construct: any;
  props: Record<string, any>;
  children: CloudDOMNode[];
  outputs?: Record<string, any>;
}

/**
 * ICloudProvider defines the interface for cloud infrastructure providers.
 * Implementations materialize CloudDOM trees into actual cloud resources.
 *
 * This interface supports dependency injection, allowing different providers
 * (e.g., DummyCloudProvider for testing, CDKTFProvider for production) to be
 * swapped without changing core CReact logic.
 *
 * @example
 * ```typescript
 * class DummyCloudProvider implements ICloudProvider {
 *   async initialize() {
 *     console.log('Provider initialized');
 *   }
 *
 *   materialize(cloudDOM: CloudDOMNode[], scope: any): void {
 *     console.log('Materializing:', cloudDOM);
 *   }
 * }
 * ```
 */
export interface ICloudProvider {
  /**
   * Optional async initialization for remote connections (AWS, Vault, etc.)
   * Called before any other provider methods.
   *
   * REQ-04.4: Support async initialization for providers that need to
   * establish remote connections or load configuration.
   *
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>;

  /**
   * Materialize CloudDOM tree into actual cloud resources.
   * This is the core method that deploys infrastructure.
   *
   * REQ-04: Core provider interface for cloud resource creation
   *
   * @param cloudDOM - Array of CloudDOM nodes to materialize
   * @param scope - Optional provider-specific scope object (e.g., CDKTF App)
   */
  materialize(cloudDOM: CloudDOMNode[], scope?: any): void;

  /**
   * Optional lifecycle hook called before deployment begins.
   * Use for validation, logging, or pre-deployment checks.
   *
   * REQ-09.1: preDeploy lifecycle hook for auditing and validation
   *
   * @param cloudDOM - CloudDOM tree about to be deployed
   * @returns Promise that resolves when pre-deployment tasks complete
   * @throws Error if pre-deployment checks fail (halts deployment)
   */
  preDeploy?(cloudDOM: CloudDOMNode[]): Promise<void>;

  /**
   * Optional lifecycle hook called after successful deployment.
   * Use for logging, metrics collection, or post-deployment actions.
   *
   * REQ-09.2: postDeploy lifecycle hook for observability
   *
   * @param cloudDOM - CloudDOM tree that was deployed
   * @param outputs - Collected outputs from deployed resources
   * @returns Promise that resolves when post-deployment tasks complete
   */
  postDeploy?(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void>;

  /**
   * Optional lifecycle hook called when deployment fails.
   * Use for error logging, cleanup, or alerting.
   *
   * REQ-09.3: onError lifecycle hook for error handling
   *
   * @param error - Error that caused deployment to fail
   * @param cloudDOM - CloudDOM tree that failed to deploy
   * @returns Promise that resolves when error handling completes
   */
  onError?(error: Error, cloudDOM: CloudDOMNode[]): Promise<void>;
}
