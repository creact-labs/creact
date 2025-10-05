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
}
