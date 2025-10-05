// REQ-04: DummyBackendProvider unit tests - Core functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';

describe('DummyBackendProvider - Core Functionality', () => {
  let provider: DummyBackendProvider;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new DummyBackendProvider();
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await provider.initialize();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DummyBackendProvider] Initializing')
      );

      consoleLogSpy.mockRestore();
    });

    it('should check initialization status', async () => {
      expect(provider.isInitialized()).toBe(false);
      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should save and retrieve state', async () => {
      const state = { key: 'value' };

      await provider.saveState('test-stack', state);
      const retrieved = await provider.getState('test-stack');

      expect(retrieved).toEqual(state);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Saving state for stack: test-stack')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting state for stack: test-stack')
      );
    });

    it('should return undefined for non-existent state', async () => {
      const retrieved = await provider.getState('non-existent');

      expect(retrieved).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Getting state for stack: non-existent')
      );
    });

    it('should handle multiple state updates for same stack', async () => {
      await provider.saveState('stack', { version: 1 });
      await provider.saveState('stack', { version: 2 });

      const retrieved = await provider.getState('stack');

      expect(retrieved).toEqual({ version: 2 });
    });

    it('should clear all state', async () => {
      await provider.saveState('stack1', { data: 1 });
      await provider.saveState('stack2', { data: 2 });

      provider.clearAll();

      const state1 = await provider.getState('stack1');
      const state2 = await provider.getState('stack2');

      expect(state1).toBeUndefined();
      expect(state2).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DummyBackendProvider] Clearing all state')
      );
    });

    it('should get all stored state', async () => {
      await provider.saveState('stack1', { data: 1 });
      await provider.saveState('stack2', { data: 2 });

      const allState = provider.getAllState();

      expect(allState.size).toBe(2);
      expect(allState.get('stack1')).toEqual({ data: 1 });
      expect(allState.get('stack2')).toEqual({ data: 2 });
    });
  });

  describe('State Persistence', () => {
    it('should handle saving undefined state', async () => {
      await provider.saveState('stack', undefined as any);
      const retrieved = await provider.getState('stack');

      // Should store undefined
      expect(retrieved).toBeUndefined();
    });

    it('should handle saving null state', async () => {
      await provider.saveState('stack', null as any);
      const retrieved = await provider.getState('stack');

      // Should store null
      expect(retrieved).toBeNull();
    });

    it('should handle empty object state', async () => {
      await provider.saveState('stack', {});
      const retrieved = await provider.getState('stack');

      expect(retrieved).toEqual({});
    });

    it('should handle deeply nested state', async () => {
      const deepState = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      await provider.saveState('stack', deepState);
      const retrieved = await provider.getState('stack');

      expect(retrieved).toEqual(deepState);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent writes to different stacks', async () => {
      const promises = [
        provider.saveState('stack1', { id: 1 }),
        provider.saveState('stack2', { id: 2 }),
        provider.saveState('stack3', { id: 3 }),
      ];

      await Promise.all(promises);

      const state1 = await provider.getState('stack1');
      const state2 = await provider.getState('stack2');
      const state3 = await provider.getState('stack3');

      expect(state1).toEqual({ id: 1 });
      expect(state2).toEqual({ id: 2 });
      expect(state3).toEqual({ id: 3 });
    });

    it('should handle concurrent reads', async () => {
      await provider.saveState('stack', { data: 'test' });

      const promises = [
        provider.getState('stack'),
        provider.getState('stack'),
        provider.getState('stack'),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toEqual({ data: 'test' });
      });
    });
  });
});
