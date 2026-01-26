import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSignal } from '../src/reactive/signal.js';
import { createEffect, onCleanup } from '../src/reactive/effect.js';
import { batch, untrack, flushSync } from '../src/reactive/tracking.js';

describe('Reactive System', () => {
  describe('createSignal', () => {
    it('should create a signal with initial value', () => {
      const [count] = createSignal(0);
      expect(count()).toBe(0);
    });

    it('should update value when written', () => {
      const [count, setCount] = createSignal(0);
      setCount(5);
      expect(count()).toBe(5);
    });

    it('should not update if value is the same', () => {
      const [count, setCount] = createSignal(5);
      const fn = vi.fn();
      createEffect(() => {
        fn(count());
      });
      expect(fn).toHaveBeenCalledTimes(1);

      setCount(5); // Same value
      expect(fn).toHaveBeenCalledTimes(1); // Should not re-run
    });
  });

  describe('createEffect', () => {
    it('should run immediately', () => {
      const fn = vi.fn();
      createEffect(fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should re-run when signal changes', async () => {
      const [count, setCount] = createSignal(0);
      const fn = vi.fn();

      createEffect(() => {
        fn(count());
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenLastCalledWith(0);

      setCount(1);
      await flushSync();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(1);
    });

    it('should track multiple signals', async () => {
      const [a, setA] = createSignal(1);
      const [b, setB] = createSignal(2);
      const fn = vi.fn();

      createEffect(() => {
        fn(a()! + b()!);
      });

      expect(fn).toHaveBeenLastCalledWith(3);

      setA(10);
      await flushSync();
      expect(fn).toHaveBeenLastCalledWith(12);

      setB(20);
      await flushSync();
      expect(fn).toHaveBeenLastCalledWith(30);
    });

    it('should run cleanup on re-run', async () => {
      const [count, setCount] = createSignal(0);
      const cleanup = vi.fn();

      createEffect(() => {
        count();
        return cleanup;
      });

      expect(cleanup).not.toHaveBeenCalled();

      setCount(1);
      await flushSync();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCleanup', () => {
    it('should register cleanup in current effect', async () => {
      const [count, setCount] = createSignal(0);
      const cleanup = vi.fn();

      createEffect(() => {
        count();
        onCleanup(cleanup);
      });

      expect(cleanup).not.toHaveBeenCalled();

      setCount(1);
      await flushSync();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('untrack', () => {
    it('should not track reads inside untrack', async () => {
      const [a, setA] = createSignal(1);
      const [b, setB] = createSignal(2);
      const fn = vi.fn();

      createEffect(() => {
        fn(a()! + untrack(() => b()!));
      });

      expect(fn).toHaveBeenLastCalledWith(3);

      // Changing b should NOT trigger effect
      setB(20);
      await flushSync();
      expect(fn).toHaveBeenCalledTimes(1);

      // Changing a should trigger effect
      setA(10);
      await flushSync();
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(30); // 10 + 20
    });
  });

  describe('batch', () => {
    it('should batch multiple updates', async () => {
      const [a, setA] = createSignal(1);
      const [b, setB] = createSignal(2);
      const fn = vi.fn();

      createEffect(() => {
        fn(a()! + b()!);
      });

      expect(fn).toHaveBeenCalledTimes(1);

      batch(() => {
        setA(10);
        setB(20);
      });

      await flushSync();

      // Should only run once for both updates
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(30);
    });
  });
});
