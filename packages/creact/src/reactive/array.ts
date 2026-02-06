/**
 * Array utilities for reactive list rendering
 */

import { createRoot, onCleanup } from "./owner";
import { type Accessor, createSignal, type Setter } from "./signal";
import { untrack } from "./tracking";

const FALLBACK = Symbol("fallback");

function dispose(disposers: (() => void)[]): void {
  for (let i = 0; i < disposers.length; i++) {
    const d = disposers[i];
    if (d) d();
  }
}

/**
 * Reactive map helper for arrays
 *
 * Unlike Array.map(), this tracks the array reactively and efficiently
 * updates when items are added, removed, or reordered. Each item is
 * mapped only once and reused on subsequent renders.
 *
 * @param list - Accessor returning the array (or null/undefined/false)
 * @param mapFn - Function to map each item, receives item accessor and reactive index accessor
 * @param options - fallback: Accessor returning fallback when list is empty, keyFn: function to extract key from item
 */
export function mapArray<T, U>(
  list: Accessor<readonly T[] | undefined | null | false>,
  mapFn: (v: Accessor<T>, i: Accessor<number>) => U,
  options: { fallback?: Accessor<any>; keyFn?: (item: T) => any } = {},
): () => U[] {
  let keys: (any | typeof FALLBACK)[] = [];
  let mapped: U[] = [];
  let disposers: (() => void)[] = [];
  let len = 0;
  // Only create index signals if mapFn uses the index parameter
  let indexes: Setter<number>[] | null = mapFn.length > 1 ? [] : null;
  // Item signals for updating item values when keyFn is used
  let itemSignals: Setter<T>[] | null = options.keyFn ? [] : null;

  // Clean up all mapped items when owner is disposed
  onCleanup(() => dispose(disposers));

  return () => {
    const newItems = list() || [];
    const newLen = newItems.length;

    return untrack(() => {
      // Fast path for empty arrays
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          keys = [];
          mapped = [];
          len = 0;
          if (indexes) indexes = [];
          if (itemSignals) itemSignals = [];
        }
        if (options.fallback) {
          keys = [FALLBACK];
          mapped[0] = createRoot((disposer) => {
            disposers[0] = disposer;
            return options.fallback!();
          });
          len = 1;
        }
        return mapped;
      }

      // Fast path for initial create
      if (len === 0) {
        mapped = new Array(newLen);
        for (let j = 0; j < newLen; j++) {
          const item = newItems[j] as T;
          keys[j] = options.keyFn ? options.keyFn(item) : item;
          mapped[j] = createRoot(mapper(j, newItems));
        }
        len = newLen;
        return mapped;
      }

      // Reconciliation for updates
      const newMapped: U[] = new Array(newLen);
      const newDisposers: (() => void)[] = new Array(newLen);
      const newIndexes: Setter<number>[] | null = indexes
        ? new Array(newLen)
        : null;
      const newItemSignals: Setter<T>[] | null = itemSignals
        ? new Array(newLen)
        : null;
      const keyToIndex = new Map<any, number>();

      // Build index map for old keys
      for (let i = 0; i < len; i++) {
        const oldKey = keys[i];
        if (oldKey !== undefined) keyToIndex.set(oldKey, i);
      }

      // New keys array
      const newKeys: (any | typeof FALLBACK)[] = new Array(newLen);

      // Map new items, reusing old ones where possible
      for (let j = 0; j < newLen; j++) {
        const item = newItems[j] as T;
        const key = options.keyFn ? options.keyFn(item) : item;
        newKeys[j] = key;
        const oldIndex = keyToIndex.get(key);

        if (oldIndex !== undefined) {
          // Reuse existing mapped result
          newMapped[j] = mapped[oldIndex] as U;
          newDisposers[j] = disposers[oldIndex] as () => void;
          if (newIndexes && indexes) {
            newIndexes[j] = indexes[oldIndex] as Setter<number>;
            // Update index if it changed
            if (oldIndex !== j) {
              const setter = indexes[oldIndex];
              if (setter) setter(j);
            }
          }
          if (newItemSignals && itemSignals) {
            newItemSignals[j] = itemSignals[oldIndex] as Setter<T>;
            // Update item signal with new item value
            const setter = itemSignals[oldIndex];
            if (setter) setter(() => item);
          }
          // Remove from map so we know what's left over
          keyToIndex.delete(key);
        } else {
          // Create new mapped item
          newMapped[j] = createRoot(mapper(j, newItems));
          // Copy the new item's signals from old arrays to new arrays
          newDisposers[j] = disposers[j] as () => void;
          if (newIndexes && indexes) {
            newIndexes[j] = indexes[j] as Setter<number>;
          }
          if (newItemSignals && itemSignals) {
            newItemSignals[j] = itemSignals[j] as Setter<T>;
          }
        }
      }

      // Dispose items that are no longer in the list
      for (const oldIndex of keyToIndex.values()) {
        const d = disposers[oldIndex];
        if (d) d();
      }

      keys = newKeys;
      mapped = newMapped;
      disposers = newDisposers;
      if (indexes) indexes = newIndexes;
      if (itemSignals) itemSignals = newItemSignals;
      len = newLen;

      return mapped;
    });

    function mapper(j: number, arr: readonly T[]) {
      return (disposer: () => void) => {
        disposers[j] = disposer;
        const item = arr[j] as T;

        // Create item accessor - signal if keyFn is used, static otherwise
        let itemAccessor: Accessor<T>;
        if (itemSignals) {
          const [s, set] = createSignal(item);
          itemSignals[j] = set;
          itemAccessor = s;
        } else {
          itemAccessor = () => item;
        }

        let element: U;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          element = mapFn(itemAccessor, s);
        } else {
          element = mapFn(itemAccessor, (() => j) as Accessor<number>);
        }

        // Inject key from keyFn onto the returned JSX element
        if (
          options.keyFn &&
          element &&
          typeof element === "object" &&
          "type" in element
        ) {
          const key = options.keyFn(item);
          (element as any).key = key;
        }

        return element;
      };
    }
  };
}

/**
 * Like mapArray but for arrays where items may repeat
 * Uses index as key instead of item identity
 */
export function indexArray<T, U>(
  list: Accessor<readonly T[] | undefined | null | false>,
  mapFn: (v: Accessor<T>, i: number) => U,
  options: { fallback?: Accessor<any> } = {},
): () => U[] {
  let items: (T | typeof FALLBACK)[] = [];
  let mapped: U[] = [];
  let disposers: (() => void)[] = [];
  let signals: Setter<T>[] = [];
  let len = 0;

  onCleanup(() => dispose(disposers));

  return () => {
    const newItems = list() || [];
    const newLen = newItems.length;

    return untrack(() => {
      // Fast path for empty arrays
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          signals = [];
        }
        if (options.fallback) {
          items = [FALLBACK];
          mapped[0] = createRoot((disposer) => {
            disposers[0] = disposer;
            return options.fallback!();
          });
          len = 1;
        }
        return mapped;
      }

      // Clear fallback if we had one
      if (items[0] === FALLBACK) {
        const d = disposers[0];
        if (d) d();
        disposers = [];
        items = [];
        mapped = [];
        len = 0;
      }

      // Update existing items or create new ones
      for (let i = 0; i < newLen; i++) {
        if (i < len && items[i] !== newItems[i]) {
          // Update existing signal with new value
          const setter = signals[i];
          if (setter) setter(() => newItems[i] as T);
        } else if (i >= len) {
          // Create new mapped item
          mapped[i] = createRoot(mapper(i, newItems));
        }
      }

      // Dispose items beyond new length
      for (let i = newLen; i < len; i++) {
        const d = disposers[i];
        if (d) d();
      }

      len = signals.length = disposers.length = newLen;
      items = newItems.slice(0);
      return (mapped = mapped.slice(0, len));
    });

    function mapper(i: number, arr: readonly T[]) {
      return (disposer: () => void) => {
        disposers[i] = disposer;
        const [s, set] = createSignal(arr[i] as T);
        signals[i] = set;
        return mapFn(s, i);
      };
    }
  };
}
