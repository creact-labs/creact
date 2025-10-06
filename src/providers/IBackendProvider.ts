// REQ-04: Provider interfaces for dependency injection
// REQ-05: Backend state management for deployment tracking
// REQ-06: Universal output access

/**
 * IBackendProvider defines the interface for state storage backends.
 * Implementations manage persistent state for CloudDOM trees and outputs.
 *
 * This interface supports dependency injection, allowing different backends
 * (e.g., DummyBackendProvider for testing, S3BackendProvider for production)
 * to be swapped without changing core CReact logic.
 *
 * @template TState - Type of state object stored (defaults to any for flexibility)
 *
 * @example
 * ```typescript
 * class DummyBackendProvider implements IBackendProvider {
 *   private state = new Map<string, any>();
 *
 *   async initialize() {
 *     console.log('Backend initialized');
 *   }
 *
 *   async getState(stackName: string): Promise<any | undefined> {
 *     return this.state.get(stackName);
 *   }
 *
 *   async saveState(stackName: string, state: any): Promise<void> {
 *     this.state.set(stackName, state);
 *   }
 * }
 * ```
 */
export interface IBackendProvider<TState = any> {
  /**
   * Optional async initialization for remote connections (S3, DynamoDB, etc.)
   * Called before any other provider methods.
   *
   * REQ-04.4: Support async initialization for providers that need to
   * establish remote connections or load configuration.
   *
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>;

  /**
   * Retrieve state for a given stack.
   * Returns undefined if no state exists for the stack.
   *
   * REQ-04: Core provider interface for state retrieval
   * REQ-05: State management for deployment tracking and idempotency
   * REQ-06: Universal output access across stacks
   *
   * @param stackName - Name of the stack to retrieve state for
   * @returns Promise resolving to stack state, or undefined if not found
   */
  getState(stackName: string): Promise<TState | undefined>;

  /**
   * Save state for a given stack.
   * State typically includes CloudDOM tree, outputs, and metadata.
   *
   * REQ-04: Core provider interface for state persistence
   * REQ-05: State management for deployment tracking and idempotency
   * REQ-08.5: Store migration map versions in backend state
   *
   * @param stackName - Name of the stack to save state for
   * @param state - State object to persist (CloudDOM, outputs, metadata)
   * @returns Promise that resolves when state is saved
   */
  saveState(stackName: string, state: TState): Promise<void>;
}
