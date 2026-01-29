/**
 * Synchronous Batching Tests
 *
 * Tests that the reactive system uses synchronous batching:
 * - When batch() is called, all updates happen synchronously before returning
 * - fillInstanceOutputs wraps updates in batch(), so re-renders happen immediately
 * - No need for async waiting/polling to detect new nodes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { batch, scheduleComputation, runComputation } from '../src/reactive/tracking.js';
import { createSignal, type Computation } from '../src/reactive/signal.js';

describe('Synchronous Batching', () => {
  describe('batch() flushes synchronously', () => {
    it('should run scheduled computations before batch returns', () => {
      const executionOrder: string[] = [];

      const [read, write] = createSignal(0);

      // Create a computation that tracks the signal
      const comp: Computation<void> = {
        fn: () => {
          read(); // Track dependency
          executionOrder.push('computation');
        },
        sources: null,
        sourceSlots: null,
        state: 1, // STALE
        cleanups: null,
      };

      // Initial run to establish tracking
      runComputation(comp);
      executionOrder.length = 0; // Clear

      // Now update in a batch
      batch(() => {
        executionOrder.push('before-write');
        write(1); // This schedules the computation
        executionOrder.push('after-write');
      });

      executionOrder.push('after-batch');

      // With synchronous batching, computation runs BEFORE batch returns
      expect(executionOrder).toEqual([
        'before-write',
        'after-write',
        'computation', // Runs at end of batch, not after
        'after-batch',
      ]);
    });

    it('should handle nested batches correctly', () => {
      const executionOrder: string[] = [];

      const [read, write] = createSignal(0);

      const comp: Computation<void> = {
        fn: () => {
          read();
          executionOrder.push('computation');
        },
        sources: null,
        sourceSlots: null,
        state: 1,
        cleanups: null,
      };

      runComputation(comp);
      executionOrder.length = 0;

      batch(() => {
        executionOrder.push('outer-start');
        write(1);

        batch(() => {
          executionOrder.push('inner-start');
          write(2);
          executionOrder.push('inner-end');
        });

        executionOrder.push('outer-end');
      });

      executionOrder.push('after-all');

      // Inner batch should NOT flush (we're still in outer batch)
      // Computation should run only once, at end of outer batch
      expect(executionOrder).toEqual([
        'outer-start',
        'inner-start',
        'inner-end',
        'outer-end',
        'computation', // Only at end of outermost batch
        'after-all',
      ]);
    });

    it('should process all queued computations', () => {
      const executed: string[] = [];

      const [read1, write1] = createSignal(0);
      const [read2, write2] = createSignal(0);

      const comp1: Computation<void> = {
        fn: () => { read1(); executed.push('comp1'); },
        sources: null,
        sourceSlots: null,
        state: 1,
        cleanups: null,
      };

      const comp2: Computation<void> = {
        fn: () => { read2(); executed.push('comp2'); },
        sources: null,
        sourceSlots: null,
        state: 1,
        cleanups: null,
      };

      runComputation(comp1);
      runComputation(comp2);
      executed.length = 0;

      batch(() => {
        write1(1);
        write2(1);
      });

      // Both computations should have run
      expect(executed).toContain('comp1');
      expect(executed).toContain('comp2');
    });
  });

  describe('Outside of batch uses async scheduling', () => {
    it('should schedule computation for microtask when not in batch', async () => {
      const executed: string[] = [];

      const [read, write] = createSignal(0);

      const comp: Computation<void> = {
        fn: () => {
          read();
          executed.push('computation');
        },
        sources: null,
        sourceSlots: null,
        state: 1,
        cleanups: null,
      };

      runComputation(comp);
      executed.length = 0;

      // Update OUTSIDE of batch
      write(1);
      executed.push('after-write');

      // Computation hasn't run yet (it's scheduled for microtask)
      expect(executed).toEqual(['after-write']);

      // Wait for microtask
      await Promise.resolve();

      // Now it should have run
      expect(executed).toContain('computation');
    });
  });

  describe('Cascading updates within batch', () => {
    it('should handle cascading signal updates', () => {
      const executed: string[] = [];

      const [a, setA] = createSignal(0);
      const [b, setB] = createSignal(0);

      // comp1 reads A and writes B
      const comp1: Computation<void> = {
        fn: () => {
          const val = a();
          executed.push(`comp1-read-${val}`);
          if (val > 0) {
            setB(val * 10);
          }
        },
        sources: null,
        sourceSlots: null,
        state: 1,
        cleanups: null,
      };

      // comp2 reads B
      const comp2: Computation<void> = {
        fn: () => {
          const val = b();
          executed.push(`comp2-read-${val}`);
        },
        sources: null,
        sourceSlots: null,
        state: 1,
        cleanups: null,
      };

      runComputation(comp1);
      runComputation(comp2);
      executed.length = 0;

      batch(() => {
        setA(5);
      });

      // comp1 runs, sets B to 50, which triggers comp2
      // All should happen synchronously within the batch
      expect(executed).toContain('comp1-read-5');
      expect(executed).toContain('comp2-read-50');
    });
  });
});
