
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

// REQ-04: Provider interfaces for dependency injection
// REQ-05: Backend state management for deployment tracking
// REQ-06: Universal output access

/**
 * Lock information for state locking
 * REQ-O02: State locking to prevent concurrent deployments
 */
export interface LockInfo {
  /** Process/user holding the lock */
  holder: string;
  /** Timestamp when lock was acquired (milliseconds since epoch) */
  acquiredAt: number;
  /** Time-to-live in seconds */
  ttl: number;
}

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
 *   private locks = new Map<string, LockInfo>();
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
 *
 *   async acquireLock(stackName: string, holder: string, ttl: number): Promise<void> {
 *     // Implementation
 *   }
 *
 *   async releaseLock(stackName: string): Promise<void> {
 *     this.locks.delete(stackName);
 *   }
 *
 *   async checkLock(stackName: string): Promise<LockInfo | null> {
 *     return this.locks.get(stackName) || null;
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

  /**
   * Acquire lock for a stack to prevent concurrent deployments.
   * Locking mechanism is backend-specific:
   * - File backend: flock on .creact/.lock
   * - S3 backend: DynamoDB conditional writes
   * - Redis backend: SETNX with TTL
   *
   * REQ-O02: State locking to prevent concurrent deployments
   * REQ-O02.1: WHEN deployment starts THEN CReact SHALL call acquireLock
   * REQ-O02.2: WHEN lock is held THEN acquireLock SHALL throw error with lock holder info
   *
   * @param stackName - Name of the stack to lock
   * @param holder - Identifier of the lock holder (user/process)
   * @param ttl - Time-to-live in seconds (lock auto-expires after this duration)
   * @throws Error if lock is already held and not expired
   */
  acquireLock?(stackName: string, holder: string, ttl: number): Promise<void>;

  /**
   * Release lock for a stack.
   *
   * REQ-O02: State locking to prevent concurrent deployments
   * REQ-O02.5: WHEN deployment completes THEN CReact SHALL call releaseLock
   *
   * @param stackName - Name of the stack to unlock
   */
  releaseLock?(stackName: string): Promise<void>;

  /**
   * Check lock status for a stack.
   * Returns lock info if lock exists, null otherwise.
   *
   * REQ-O02: State locking to prevent concurrent deployments
   * REQ-O02.3: WHEN process crashes THEN lock SHALL have TTL and auto-expire
   *
   * @param stackName - Name of the stack to check
   * @returns Lock info if lock exists, null otherwise
   */
  checkLock?(stackName: string): Promise<LockInfo | null>;

  /**
   * Append audit log entry for compliance and debugging.
   * Optional method for backends that support audit logging.
   *
   * REQ-O05: Audit log for compliance and debugging
   *
   * @param stackName - Name of the stack
   * @param entry - Audit log entry to append
   */
  appendAuditLog?(stackName: string, entry: any): Promise<void>;

  /**
   * Save state snapshot for time-travel debugging.
   * Optional method for backends that support snapshots.
   *
   * REQ-O01: State snapshots for time-travel debugging
   *
   * @param stackName - Name of the stack
   * @param state - State snapshot to save
   */
  saveSnapshot?(stackName: string, state: TState): Promise<void>;
}
