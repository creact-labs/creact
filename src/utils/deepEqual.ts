
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

// Utility for deep equality comparison
// Used by Reconciler for prop diffing and StateMachine for checkpoint diffs

/**
 * Cache for memoizing deep equality comparisons
 * Key format: `${hashA}::${hashB}` (using content hashes for performance)
 */
const equalityCache = new Map<string, boolean>();

/**
 * Cache for object hashes to avoid repeated JSON.stringify calls
 * Uses WeakMap for automatic garbage collection
 */
const hashCache = new WeakMap<object, string>();

/**
 * Cache for primitive hashes (strings, numbers, etc.)
 * Uses regular Map with size limit since primitives aren't garbage collected
 */
const primitiveHashCache = new Map<string, string>();

/**
 * Cache hit/miss statistics for performance profiling
 */
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Maximum cache size to prevent memory leaks
 */
const MAX_CACHE_SIZE = 1000;
const MAX_PRIMITIVE_CACHE_SIZE = 500;

/**
 * Compute a fast hash of a value for cache keys
 *
 * Uses WeakMap to cache hashes per object reference.
 * Uses regular Map with size limit for primitives.
 *
 * @param value - Value to hash
 * @returns Hash string
 */
function fastHash(value: any): string {
  // Primitives: use string representation with caching
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value !== 'object') {
    const primitiveKey = `${typeof value}:${String(value)}`;

    // Check primitive cache
    if (primitiveHashCache.has(primitiveKey)) {
      return primitiveHashCache.get(primitiveKey)!;
    }

    // Store in primitive cache (with size limit)
    if (primitiveHashCache.size >= MAX_PRIMITIVE_CACHE_SIZE) {
      // Clear oldest entry (simple FIFO)
      const firstKey = primitiveHashCache.keys().next().value;
      if (firstKey !== undefined) {
        primitiveHashCache.delete(firstKey);
      }
    }
    primitiveHashCache.set(primitiveKey, primitiveKey);

    return primitiveKey;
  }

  // Objects: use WeakMap cache
  if (hashCache.has(value)) {
    return hashCache.get(value)!;
  }

  // Compute hash (simple but fast)
  try {
    const hash = JSON.stringify(value);
    hashCache.set(value, hash);
    return hash;
  } catch {
    // Circular reference or non-serializable - use object identity
    const hash = `obj:${Math.random()}`;
    hashCache.set(value, hash);
    return hash;
  }
}

/**
 * Deep equality comparison with memoization
 *
 * Compares two values deeply, handling:
 * - Primitives (string, number, boolean, null, undefined)
 * - Arrays (order matters)
 * - Objects (key order doesn't matter)
 * - Nested structures
 *
 * Memoizes results for performance on large graphs.
 *
 * Note: Does not handle:
 * - Functions (always considered unequal)
 * - Symbols (always considered unequal)
 * - Circular references (will throw)
 * - Special objects (Date, RegExp, Map, Set) - uses JSON serialization
 *
 * @param a - First value
 * @param b - Second value
 * @param useMemoization - Enable memoization (default: true)
 * @returns True if values are deeply equal
 */
export function deepEqual(a: any, b: any, useMemoization: boolean = true): boolean {
  // Fast path: reference equality
  if (a === b) {
    return true;
  }

  // Fast path: type mismatch
  if (typeof a !== typeof b) {
    return false;
  }

  // Fast path: null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Check memoization cache
  if (useMemoization) {
    try {
      const hashA = fastHash(a);
      const hashB = fastHash(b);
      const cacheKey = `${hashA}::${hashB}`;

      if (equalityCache.has(cacheKey)) {
        cacheHits++;
        return equalityCache.get(cacheKey)!;
      }

      cacheMisses++;

      // Compute equality
      const result = deepEqualImpl(a, b);

      // Store in cache (with size limit)
      if (equalityCache.size >= MAX_CACHE_SIZE) {
        // Clear oldest entries (simple FIFO)
        const firstKey = equalityCache.keys().next().value;
        if (firstKey !== undefined) {
          equalityCache.delete(firstKey);
        }
      }
      equalityCache.set(cacheKey, result);

      return result;
    } catch {
      // If hashing fails, fall back to non-memoized
      cacheMisses++;
      return deepEqualImpl(a, b);
    }
  }

  return deepEqualImpl(a, b);
}

/**
 * Internal implementation of deep equality (without memoization)
 *
 * Optimized for performance:
 * - Short-circuits on primitives
 * - Fast path for common types
 * - Avoids redundant checks
 * - Handles circular references using WeakMap
 *
 * @param a - First value
 * @param b - Second value
 * @param visited - WeakMap tracking visited pairs to handle circular refs
 * @returns True if values are deeply equal
 */
function deepEqualImpl(a: any, b: any, visited: WeakMap<any, any> = new WeakMap()): boolean {
  // Fast path: primitives and null/undefined
  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== 'object' || typeB !== 'object') {
    return a === b;
  }

  if (a === null || b === null) {
    return a === b;
  }

  // Fast path: same reference
  if (a === b) {
    return true;
  }

  // Circular reference detection
  if (visited.has(a)) {
    return visited.get(a) === b;
  }
  visited.set(a, b);

  // Arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (!deepEqualImpl(a[i], b[i], visited)) {
        return false;
      }
    }

    return true;
  }

  // Array vs non-array
  if (Array.isArray(b)) {
    return false;
  }

  // Objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Convert keysB to Set for O(1) lookup
  const keysBSet = new Set(keysB);

  // Check all keys exist and values are equal
  for (const key of keysA) {
    if (!keysBSet.has(key)) {
      return false;
    }

    if (!deepEqualImpl(a[key], b[key], visited)) {
      return false;
    }
  }

  return true;
}

/**
 * Clear the memoization caches
 *
 * Useful for testing or when memory usage is a concern.
 */
export function clearEqualityCache(): void {
  equalityCache.clear();
  primitiveHashCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  // Note: hashCache (WeakMap) is automatically garbage collected
}

/**
 * Get cache statistics for monitoring and performance profiling
 *
 * @returns Cache size, hit rate, and performance metrics
 */
export function getEqualityCacheStats(): {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  primitiveSize: number;
} {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? cacheHits / total : 0;

  return {
    size: equalityCache.size,
    maxSize: MAX_CACHE_SIZE,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate,
    primitiveSize: primitiveHashCache.size,
  };
}
