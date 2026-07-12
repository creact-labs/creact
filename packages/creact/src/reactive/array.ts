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

interface MapArrayOptions<T> {
  fallback?: Accessor<unknown>;
  keyFn?: (item: T) => unknown;
}

/** Render the fallback into slot 0 — it deliberately stands in for a mapped item */
function renderFallbackRow<U>(
  mapped: U[],
  disposers: (() => void)[],
  fallback: Accessor<unknown>,
): void {
  mapped[0] = createRoot((disposer) => {
    disposers[0] = disposer;
    return fallback();
  }) as U;
}

/** Mutable bookkeeping for one mapArray instance */
interface MapState<T, U> {
  keys: unknown[];
  mapped: U[];
  disposers: (() => void)[];
  len: number;
  /** Index setters — only allocated when mapFn uses the index parameter */
  indexes: Setter<number>[] | null;
  /** Item setters — only allocated when keyFn is used */
  itemSignals: Setter<T>[] | null;
}

/** Row factory: runs mapFn inside its own root, wiring item/index signals */
type RowMapper<T, U> = (
  j: number,
  arr: readonly T[],
) => (disposer: () => void) => U;

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
  options: MapArrayOptions<T> = {},
): () => U[] {
  const state: MapState<T, U> = {
    keys: [],
    mapped: [],
    disposers: [],
    len: 0,
    // Only create index signals if mapFn uses the index parameter
    indexes: mapFn.length > 1 ? [] : null,
    // Item signals for updating item values when keyFn is used
    itemSignals: options.keyFn ? [] : null,
  };

  // Clean up all mapped items when owner is disposed
  onCleanup(() => dispose(state.disposers));

  const mapper: RowMapper<T, U> =
    (j, arr) => (disposer: () => void) => {
      state.disposers[j] = disposer;
      const item = arr[j] as T;

      // Create item accessor - signal if keyFn is used, static otherwise
      let itemAccessor: Accessor<T>;
      if (state.itemSignals) {
        const [s, set] = createSignal(item);
        state.itemSignals[j] = set;
        itemAccessor = s;
      } else {
        itemAccessor = () => item;
      }

      let element: U;
      if (state.indexes) {
        const [s, set] = createSignal(j);
        state.indexes[j] = set;
        element = mapFn(itemAccessor, s);
      } else {
        element = mapFn(itemAccessor, (() => j) as Accessor<number>);
      }

      injectKey(options.keyFn, item, element);
      return element;
    };

  return () => {
    const newItems = list() || [];
    return untrack(() => reconcileKeyed(state, newItems, options, mapper));
  };
}

/** Inject key from keyFn onto the returned JSX element */
function injectKey<T, U>(
  keyFn: ((item: T) => unknown) | undefined,
  item: T,
  element: U,
): void {
  if (keyFn && element && typeof element === "object" && "type" in element) {
    (element as { key?: unknown }).key = keyFn(item);
  }
}

function reconcileKeyed<T, U>(
  state: MapState<T, U>,
  newItems: readonly T[],
  options: MapArrayOptions<T>,
  mapper: RowMapper<T, U>,
): U[] {
  const newLen = newItems.length;

  // Fast path for empty arrays
  if (newLen === 0) {
    return emptyKeyedFastPath(state, options);
  }

  // Fast path for initial create
  if (state.len === 0) {
    state.mapped = new Array(newLen);
    for (let j = 0; j < newLen; j++) {
      const item = newItems[j] as T;
      state.keys[j] = options.keyFn ? options.keyFn(item) : item;
      state.mapped[j] = createRoot(mapper(j, newItems));
    }
    state.len = newLen;
    return state.mapped;
  }

  return updateKeyed(state, newItems, options, mapper);
}

/** Empty list: dispose all rows, then render the fallback if provided */
function emptyKeyedFastPath<T, U>(
  state: MapState<T, U>,
  options: MapArrayOptions<T>,
): U[] {
  if (state.len !== 0) {
    dispose(state.disposers);
    state.disposers = [];
    state.keys = [];
    state.mapped = [];
    state.len = 0;
    if (state.indexes) state.indexes = [];
    if (state.itemSignals) state.itemSignals = [];
  }
  if (options.fallback) {
    state.keys = [FALLBACK];
    renderFallbackRow(state.mapped, state.disposers, options.fallback);
    state.len = 1;
  }
  return state.mapped;
}

/** Next-generation arrays built during one keyed update pass */
interface NextRows<T, U> {
  mapped: U[];
  disposers: (() => void)[];
  indexes: Setter<number>[] | null;
  itemSignals: Setter<T>[] | null;
}

/** Keyed reconciliation: reuse rows whose key survived, create the rest */
function updateKeyed<T, U>(
  state: MapState<T, U>,
  newItems: readonly T[],
  options: MapArrayOptions<T>,
  mapper: RowMapper<T, U>,
): U[] {
  const newLen = newItems.length;
  const next: NextRows<T, U> = {
    mapped: new Array(newLen),
    disposers: new Array(newLen),
    indexes: state.indexes ? new Array(newLen) : null,
    itemSignals: state.itemSignals ? new Array(newLen) : null,
  };

  const keyToIndex = buildKeyIndex(state);
  const newKeys: unknown[] = new Array(newLen);

  // Map new items, reusing old ones where possible
  for (let j = 0; j < newLen; j++) {
    const item = newItems[j] as T;
    const key = options.keyFn ? options.keyFn(item) : item;
    newKeys[j] = key;
    const oldIndex = keyToIndex.get(key);

    if (oldIndex !== undefined) {
      reuseRow(state, next, j, oldIndex, item);
      // Remove from map so we know what's left over
      keyToIndex.delete(key);
    } else {
      createRow(state, next, j, newItems, mapper);
    }
  }

  // Dispose items that are no longer in the list
  for (const oldIndex of keyToIndex.values()) {
    const d = state.disposers[oldIndex];
    if (d) d();
  }

  state.keys = newKeys;
  state.mapped = next.mapped;
  state.disposers = next.disposers;
  if (state.indexes) state.indexes = next.indexes;
  if (state.itemSignals) state.itemSignals = next.itemSignals;
  state.len = newLen;

  return state.mapped;
}

/** Index map over the old keys (skipping empty slots) */
function buildKeyIndex<T, U>(state: MapState<T, U>): Map<unknown, number> {
  const keyToIndex = new Map<unknown, number>();
  for (let i = 0; i < state.len; i++) {
    const oldKey = state.keys[i];
    if (oldKey !== undefined) keyToIndex.set(oldKey, i);
  }
  return keyToIndex;
}

/** Carry an existing row over, updating its index and item signals */
function reuseRow<T, U>(
  state: MapState<T, U>,
  next: NextRows<T, U>,
  j: number,
  oldIndex: number,
  item: T,
): void {
  next.mapped[j] = state.mapped[oldIndex] as U;
  next.disposers[j] = state.disposers[oldIndex] as () => void;

  if (next.indexes && state.indexes) {
    next.indexes[j] = state.indexes[oldIndex] as Setter<number>;
    // Update index if it changed
    if (oldIndex !== j) {
      const setter = state.indexes[oldIndex];
      if (setter) setter(j);
    }
  }
  if (next.itemSignals && state.itemSignals) {
    next.itemSignals[j] = state.itemSignals[oldIndex] as Setter<T>;
    // Update item signal with new item value
    const setter = state.itemSignals[oldIndex];
    if (setter) setter(() => item);
  }
}

/** Create a fresh row and copy its freshly-wired signals into the next arrays */
function createRow<T, U>(
  state: MapState<T, U>,
  next: NextRows<T, U>,
  j: number,
  newItems: readonly T[],
  mapper: RowMapper<T, U>,
): void {
  next.mapped[j] = createRoot(mapper(j, newItems));
  // The mapper wrote this row's signals into the state arrays — carry them over
  next.disposers[j] = state.disposers[j] as () => void;
  if (next.indexes && state.indexes) {
    next.indexes[j] = state.indexes[j] as Setter<number>;
  }
  if (next.itemSignals && state.itemSignals) {
    next.itemSignals[j] = state.itemSignals[j] as Setter<T>;
  }
}

/** Mutable bookkeeping for one indexArray instance */
interface IndexState<T, U> {
  items: (T | typeof FALLBACK)[];
  mapped: U[];
  disposers: (() => void)[];
  signals: Setter<T>[];
  len: number;
}

/**
 * Like mapArray but for arrays where items may repeat
 * Uses index as key instead of item identity
 */
export function indexArray<T, U>(
  list: Accessor<readonly T[] | undefined | null | false>,
  mapFn: (v: Accessor<T>, i: number) => U,
  options: { fallback?: Accessor<unknown> } = {},
): () => U[] {
  const state: IndexState<T, U> = {
    items: [],
    mapped: [],
    disposers: [],
    signals: [],
    len: 0,
  };

  onCleanup(() => dispose(state.disposers));

  const mapper = (i: number, arr: readonly T[]) => (disposer: () => void) => {
    state.disposers[i] = disposer;
    const [s, set] = createSignal(arr[i] as T);
    state.signals[i] = set;
    return mapFn(s, i);
  };

  return () => {
    const newItems = list() || [];
    return untrack(() => reconcileIndexed(state, newItems, options, mapper));
  };
}

function reconcileIndexed<T, U>(
  state: IndexState<T, U>,
  newItems: readonly T[],
  options: { fallback?: Accessor<unknown> },
  mapper: (i: number, arr: readonly T[]) => (disposer: () => void) => U,
): U[] {
  const newLen = newItems.length;

  // Fast path for empty arrays
  if (newLen === 0) {
    return emptyIndexedFastPath(state, options);
  }

  clearIndexedFallback(state);

  // Update existing items or create new ones
  for (let i = 0; i < newLen; i++) {
    if (i < state.len && state.items[i] !== newItems[i]) {
      // Update existing signal with new value
      const setter = state.signals[i];
      if (setter) setter(() => newItems[i] as T);
    } else if (i >= state.len) {
      // Create new mapped item
      state.mapped[i] = createRoot(mapper(i, newItems));
    }
  }

  // Dispose items beyond new length
  for (let i = newLen; i < state.len; i++) {
    const d = state.disposers[i];
    if (d) d();
  }

  state.len = state.signals.length = state.disposers.length = newLen;
  state.items = newItems.slice(0);
  return (state.mapped = state.mapped.slice(0, newLen));
}

/** Empty list: dispose all rows, then render the fallback if provided */
function emptyIndexedFastPath<T, U>(
  state: IndexState<T, U>,
  options: { fallback?: Accessor<unknown> },
): U[] {
  if (state.len !== 0) {
    dispose(state.disposers);
    state.disposers = [];
    state.items = [];
    state.mapped = [];
    state.len = 0;
    state.signals = [];
  }
  if (options.fallback) {
    state.items = [FALLBACK];
    renderFallbackRow(state.mapped, state.disposers, options.fallback);
    state.len = 1;
  }
  return state.mapped;
}

/** Clear the fallback row before rendering real items */
function clearIndexedFallback<T, U>(state: IndexState<T, U>): void {
  if (state.items[0] === FALLBACK) {
    const d = state.disposers[0];
    if (d) d();
    state.disposers = [];
    state.items = [];
    state.mapped = [];
    state.len = 0;
  }
}
