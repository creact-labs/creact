// REQ-04: Dummy backend provider implementation for POC and testing
// REQ-05: State management for deployment tracking
// REQ-06: Universal output access

import { IBackendProvider } from './IBackendProvider';

/**
 * DummyBackendProvider is a POC implementation using in-memory Map storage.
 *
 * Use cases:
 * - POC demonstrations
 * - Testing without remote state backend
 * - Development and debugging
 * - CI/CD validation
 *
 * This is a standalone implementation, NOT a base class.
 *
 * @example
 * ```typescript
 * const provider = new DummyBackendProvider();
 * await provider.initialize();
 * await provider.saveState('stack', { cloudDOM: [...] });
 * const state = await provider.getState('stack');
 * ```
 */
export class DummyBackendProvider implements IBackendProvider {
  private state = new Map<string, any>();
  private initialized = false;
  private locks = new Map<string, { holder: string; acquiredAt: number; ttl: number }>();
  private auditLogs = new Map<string, any[]>();
  private snapshots = new Map<string, any[]>();

  /**
   * Optional initialization (simulates async setup)
   * REQ-04.4: Support async initialization
   */
  async initialize(): Promise<void> {
    console.log('[DummyBackendProvider] Initializing...');
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
   * Retrieve state for a given stack
   * Returns undefined if no state exists
   *
   * REQ-04: Core provider interface implementation
   * REQ-05: State management for deployment tracking
   * REQ-06: Universal output access
   *
   * @param stackName - Name of the stack to retrieve state for
   * @returns Promise resolving to stack state, or undefined if not found
   */
  async getState(stackName: string): Promise<any | undefined> {
    console.debug(`[DummyBackendProvider] Getting state for stack: ${stackName}`);
    return this.state.get(stackName);
  }

  /**
   * Save state for a given stack
   *
   * REQ-04: Core provider interface implementation
   * REQ-05: State management for deployment tracking
   * REQ-08.5: Store migration map versions in backend state
   *
   * @param stackName - Name of the stack to save state for
   * @param state - State object to persist (CloudDOM, outputs, metadata)
   * @returns Promise that resolves when state is saved
   */
  async saveState(stackName: string, state: any): Promise<void> {
    console.debug(`[DummyBackendProvider] Saving state for stack: ${stackName}`);
    this.state.set(stackName, state);
  }

  /**
   * Helper method: Clear all state (useful for testing)
   * Not part of IBackendProvider interface
   */
  clearAll(): void {
    console.debug('[DummyBackendProvider] Clearing all state');
    this.state.clear();
  }

  /**
   * Helper method: Get all state (useful for debugging)
   * Not part of IBackendProvider interface
   *
   * @returns Map of all stack states
   */
  getAllState(): Map<string, any> {
    return new Map(this.state);
  }

  /**
   * Acquire lock for a stack (optional method for StateMachine)
   * REQ-O02: State locking to prevent concurrent deployments
   *
   * @param stackName - Name of the stack to lock
   * @param holder - Identifier of the lock holder (user/process)
   * @param ttl - Time-to-live in seconds
   * @throws Error if lock is already held and not expired
   */
  async acquireLock(stackName: string, holder: string, ttl: number): Promise<void> {
    const existingLock = this.locks.get(stackName);

    if (existingLock) {
      const now = Date.now();
      const lockAge = now - existingLock.acquiredAt;
      const lockTTL = existingLock.ttl * 1000; // Convert to milliseconds

      if (lockAge < lockTTL) {
        throw new Error(
          `Stack "${stackName}" is locked by ${existingLock.holder} ` +
            `(acquired ${new Date(existingLock.acquiredAt).toISOString()})`
        );
      }
    }

    this.locks.set(stackName, { holder, acquiredAt: Date.now(), ttl });
    console.debug(`[DummyBackendProvider] Lock acquired for stack: ${stackName} by ${holder}`);
  }

  /**
   * Release lock for a stack (optional method for StateMachine)
   * REQ-O02: State locking to prevent concurrent deployments
   *
   * @param stackName - Name of the stack to unlock
   */
  async releaseLock(stackName: string): Promise<void> {
    this.locks.delete(stackName);
    console.debug(`[DummyBackendProvider] Lock released for stack: ${stackName}`);
  }

  /**
   * Check lock status for a stack (optional method for StateMachine)
   * REQ-O02: State locking to prevent concurrent deployments
   *
   * @param stackName - Name of the stack to check
   * @returns Lock info if lock exists, null otherwise
   */
  async checkLock(
    stackName: string
  ): Promise<{ holder: string; acquiredAt: number; ttl: number } | null> {
    return this.locks.get(stackName) || null;
  }

  /**
   * Append audit log entry (optional method for StateMachine)
   * REQ-O05: Audit log for compliance and debugging
   *
   * @param stackName - Name of the stack
   * @param entry - Audit log entry to append
   */
  async appendAuditLog(stackName: string, entry: any): Promise<void> {
    if (!this.auditLogs.has(stackName)) {
      this.auditLogs.set(stackName, []);
    }
    this.auditLogs.get(stackName)!.push(entry);
    console.debug(`[DummyBackendProvider] Audit log entry appended for stack: ${stackName}`);
  }

  /**
   * Save state snapshot (optional method for StateMachine)
   * REQ-O01: State snapshots for time-travel debugging
   *
   * @param stackName - Name of the stack
   * @param state - State snapshot to save
   */
  async saveSnapshot(stackName: string, state: any): Promise<void> {
    if (!this.snapshots.has(stackName)) {
      this.snapshots.set(stackName, []);
    }
    this.snapshots.get(stackName)!.push(state);
    console.debug(`[DummyBackendProvider] Snapshot saved for stack: ${stackName}`);
  }

  /**
   * Helper method: Check if lock exists (useful for testing)
   * Not part of IBackendProvider interface
   */
  hasLock(stackName: string): boolean {
    return this.locks.has(stackName);
  }

  /**
   * Helper method: Get audit logs (useful for testing)
   * Not part of IBackendProvider interface
   */
  getAuditLogs(stackName: string): any[] {
    return this.auditLogs.get(stackName) || [];
  }

  /**
   * Helper method: Get snapshots (useful for testing)
   * Not part of IBackendProvider interface
   */
  getSnapshots(stackName: string): any[] {
    return this.snapshots.get(stackName) || [];
  }
}
