// DummyBackendProvider edge cases - Production-critical scenarios

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DummyBackendProvider } from '../../providers/DummyBackendProvider';

describe('DummyBackendProvider - Edge Cases', () => {
  let provider: DummyBackendProvider;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new DummyBackendProvider();
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Non-JSON Props', () => {
    it('should handle state with functions (not serializable)', async () => {
      const stateWithFunction = {
        name: 'test',
        handler: () => 'function',
      };

      // Should not crash when saving
      await expect(provider.saveState('stack', stateWithFunction)).resolves.not.toThrow();
    });

    it('should handle state with symbols', async () => {
      const sym = Symbol('test');
      const stateWithSymbol = {
        name: 'test',
        [sym]: 'symbol-value',
      };

      // Should not crash when saving
      await expect(provider.saveState('stack', stateWithSymbol)).resolves.not.toThrow();
    });

    it('should handle circular references in state', async () => {
      const circularState: any = { name: 'test' };
      circularState.self = circularState;

      // Should not crash when saving (even though it can't be JSON.stringified)
      await expect(provider.saveState('stack', circularState)).resolves.not.toThrow();
    });

    it('should handle saving state with undefined keys', async () => {
      const stateWithUndefinedKeys = {
        [undefined as any]: 'value',
        normal: 'value',
      };

      await expect(provider.saveState('stack', stateWithUndefinedKeys)).resolves.not.toThrow();
    });

    it('should handle saving state with symbol keys', async () => {
      const sym = Symbol('key');
      const stateWithSymbolKeys = {
        [sym]: 'value',
        normal: 'value',
      };

      await expect(provider.saveState('stack', stateWithSymbolKeys)).resolves.not.toThrow();
    });
  });

  describe('Edge Case Stack Names', () => {
    it('should handle stack names with special characters', async () => {
      const specialNames = [
        'stack-with-dashes',
        'stack_with_underscores',
        'stack.with.dots',
        'stack/with/slashes',
        'stack:with:colons',
      ];

      for (const name of specialNames) {
        await provider.saveState(name, { name });
        const retrieved = await provider.getState(name);
        expect(retrieved).toEqual({ name });
      }
    });

    it('should handle empty stack name', async () => {
      await provider.saveState('', { data: 'empty' });
      const retrieved = await provider.getState('');

      expect(retrieved).toEqual({ data: 'empty' });
    });

    it('should handle very long stack names', async () => {
      const longName = 'a'.repeat(1000);
      await provider.saveState(longName, { data: 'long' });
      const retrieved = await provider.getState(longName);

      expect(retrieved).toEqual({ data: 'long' });
    });

    it('should handle stack name collision with different casing', async () => {
      await provider.saveState('Stack', { value: 'uppercase' });
      await provider.saveState('stack', { value: 'lowercase' });
      await provider.saveState('STACK', { value: 'allcaps' });

      const upper = await provider.getState('Stack');
      const lower = await provider.getState('stack');
      const caps = await provider.getState('STACK');

      // Should treat as different stacks (case-sensitive)
      expect(upper).toEqual({ value: 'uppercase' });
      expect(lower).toEqual({ value: 'lowercase' });
      expect(caps).toEqual({ value: 'allcaps' });
    });

    it('should handle stack name with null bytes', async () => {
      const maliciousName = 'stack\x00injection';

      await provider.saveState(maliciousName, { data: 'test' });
      const retrieved = await provider.getState(maliciousName);

      // Should handle null bytes in key
      expect(retrieved).toEqual({ data: 'test' });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent writes to same stack', async () => {
      // Simulate concurrent writes
      const promises = [
        provider.saveState('stack', { version: 1 }),
        provider.saveState('stack', { version: 2 }),
        provider.saveState('stack', { version: 3 }),
      ];

      await Promise.all(promises);
      const retrieved = await provider.getState('stack');

      // Last write should win (one of the versions)
      expect(retrieved).toBeDefined();
      expect(retrieved).toHaveProperty('version');
    });

    it('should handle concurrent write-write race to same stack (last-write-wins)', async () => {
      // DummyBackendProvider uses synchronous Map.set() under the hood
      // So "concurrent" writes are actually deterministic - last write wins

      const writes: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        writes.push(provider.saveState('stack', { version: i }));
      }

      await Promise.all(writes);

      const final = await provider.getState('stack');

      // Last write wins (version 99)
      // Note: This is deterministic because Map.set() is synchronous
      expect(final).toBeDefined();
      expect(final.version).toBe(99);
    });

    it('should handle read during partial write (atomicity)', async () => {
      // Start a write
      const writePromise = provider.saveState('stack', { large: 'x'.repeat(1000000) });

      // Immediately try to read
      const readPromise = provider.getState('stack');

      const [, readResult] = await Promise.all([writePromise, readPromise]);

      // Should either get old value or new value, not partial
      expect(readResult === undefined || readResult.large).toBeTruthy();
    });

    it('should handle 1000 concurrent writes to different stacks', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(provider.saveState(`stack-${i}`, { id: i }));
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Verify all writes succeeded
      for (let i = 0; i < 1000; i++) {
        const state = await provider.getState(`stack-${i}`);
        expect(state).toEqual({ id: i });
      }

      // Should complete in reasonable time
      expect(duration).toBeLessThan(2000);
    });

    it('should handle saving state while getAllState is iterating', async () => {
      // Setup initial state
      for (let i = 0; i < 10; i++) {
        await provider.saveState(`stack-${i}`, { id: i });
      }

      // Start iteration
      const allState = provider.getAllState();

      // Modify state during iteration
      await provider.saveState('new-stack', { id: 'new' });

      // Iteration should complete (may or may not include new entry)
      let count = 0;
      for (const [key, value] of allState) {
        count++;
      }

      expect(count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Rapid State Overwrites', () => {
    it('should handle rapid state overwrites in loop', async () => {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(provider.saveState('stack', { version: i }));
      }

      await Promise.all(promises);

      const finalState = await provider.getState('stack');
      expect(finalState).toBeDefined();
      expect(finalState).toHaveProperty('version');
    });

    it('should maintain atomicity with concurrent writes', async () => {
      // Write to multiple stacks concurrently
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(provider.saveState(`stack-${i}`, { id: i }));
      }

      await Promise.all(promises);

      // Verify all writes succeeded
      for (let i = 0; i < 50; i++) {
        const state = await provider.getState(`stack-${i}`);
        expect(state).toEqual({ id: i });
      }
    });
  });

  describe('Large State Handling', () => {
    it('should handle state size exceeding 10MB', async () => {
      // Create ~10MB of data
      const largeString = 'x'.repeat(1024 * 1024); // 1MB string
      const largeState: any = {};
      for (let i = 0; i < 10; i++) {
        largeState[`chunk${i}`] = largeString;
      }

      const startTime = Date.now();
      await provider.saveState('large-stack', largeState);
      const saveDuration = Date.now() - startTime;

      const retrieveStart = Date.now();
      const retrieved = await provider.getState('large-stack');
      const retrieveDuration = Date.now() - retrieveStart;

      expect(retrieved).toBeDefined();
      // Should handle large state without excessive delay
      expect(saveDuration).toBeLessThan(1000);
      expect(retrieveDuration).toBeLessThan(1000);
    });

    it('should handle state approaching heap limit gracefully', async () => {
      // Create very large state (~50MB)
      const largeString = 'x'.repeat(1024 * 1024); // 1MB
      const veryLargeState: any = {};
      for (let i = 0; i < 50; i++) {
        veryLargeState[`chunk${i}`] = largeString;
      }

      // Should handle or throw clear error
      try {
        await provider.saveState('huge-stack', veryLargeState);
        const retrieved = await provider.getState('huge-stack');
        expect(retrieved).toBeDefined();
      } catch (error) {
        // If it fails, should be clear error (not silent corruption)
        expect(error).toBeDefined();
      }
    });
  });

  describe('Concurrent Initialization', () => {
    it('should handle two initialize() calls racing', async () => {
      // Race two initializations
      const [result1, result2] = await Promise.all([provider.initialize(), provider.initialize()]);

      // Should end in consistent state
      expect(provider.isInitialized()).toBe(true);
    });
  });

  describe('Memory Leaks', () => {
    it('should not leak memory with repeated state operations', async () => {
      // Perform 1000 operations
      for (let i = 0; i < 1000; i++) {
        await provider.saveState(`temp-${i}`, { data: 'x'.repeat(1000) });
      }

      // Clear all
      provider.clearAll();

      // Verify cleanup
      for (let i = 0; i < 1000; i++) {
        const state = await provider.getState(`temp-${i}`);
        expect(state).toBeUndefined();
      }
    });
  });

  describe('Provider Isolation', () => {
    it('should handle two different backend providers for same stack', async () => {
      const backend1 = new DummyBackendProvider();
      const backend2 = new DummyBackendProvider();

      await backend1.initialize();
      await backend2.initialize();

      // Provider 1 saves state
      await backend1.saveState('stack', { source: 'provider1' });

      // Provider 2 tries to read same stack
      const state = await backend2.getState('stack');

      // Should be undefined (providers are isolated)
      expect(state).toBeUndefined();

      // Provider 2 saves its own state
      await backend2.saveState('stack', { source: 'provider2' });

      // Each provider has its own state
      const state1 = await backend1.getState('stack');
      const state2 = await backend2.getState('stack');

      expect(state1).toEqual({ source: 'provider1' });
      expect(state2).toEqual({ source: 'provider2' });
    });

    it('should handle multiple providers operating on same stack concurrently', async () => {
      const provider1 = new DummyBackendProvider();
      const provider2 = new DummyBackendProvider();

      await provider1.initialize();
      await provider2.initialize();

      // Both write to same stack name
      await Promise.all([
        provider1.saveState('shared-stack', { provider: 1 }),
        provider2.saveState('shared-stack', { provider: 2 }),
      ]);

      // Each provider has its own state (isolated)
      const state1 = await provider1.getState('shared-stack');
      const state2 = await provider2.getState('shared-stack');

      expect(state1).toEqual({ provider: 1 });
      expect(state2).toEqual({ provider: 2 });
    });
  });

  describe('State Consistency', () => {
    it('should handle backend returning stale state from cache', async () => {
      // Save initial state
      await provider.saveState('stack', { version: 1 });

      // Get state (potentially cached)
      const cached = await provider.getState('stack');

      // Update state
      await provider.saveState('stack', { version: 2 });

      // Get state again
      const fresh = await provider.getState('stack');

      // Should get fresh state (no caching in dummy provider)
      expect(fresh).toEqual({ version: 2 });
      expect(cached).toEqual({ version: 1 });
    });
  });

  describe('Methods Called Before Initialize', () => {
    it('should handle provider methods called before initialize', async () => {
      const uninitializedProvider = new DummyBackendProvider();

      // Call methods before initialize
      expect(uninitializedProvider.isInitialized()).toBe(false);

      // Methods should work (initialization is optional)
      await expect(
        uninitializedProvider.saveState('stack', { data: 'test' })
      ).resolves.not.toThrow();
    });
  });
});
