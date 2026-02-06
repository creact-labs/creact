/**
 * Props utilities for component composition
 *
 * Helpers for merging, splitting, and transforming component props.
 */

/**
 * Merge multiple props objects into one
 *
 * Later sources override earlier ones. Reactive getters are preserved.
 * Useful for setting default props or combining inherited props.
 *
 * @example
 * ```tsx
 * function Database(props) {
 *   const merged = mergeProps(
 *     { region: 'us-east-1', replicas: 1 }, // defaults
 *     props
 *   );
 *   return <PostgresInstance {...merged} />;
 * }
 * ```
 */
export function mergeProps<T extends object[]>(...sources: T): MergeProps<T> {
  const target = {} as Record<string, unknown>;

  for (const source of sources) {
    if (!source) continue;

    const descriptors = Object.getOwnPropertyDescriptors(source);

    for (const key of Object.keys(descriptors)) {
      const descriptor = descriptors[key];
      if (!descriptor) continue;

      // Preserve getters for reactivity
      if ("get" in descriptor && descriptor.get) {
        Object.defineProperty(target, key, {
          enumerable: true,
          configurable: true,
          get: descriptor.get,
        });
      } else {
        target[key] = descriptor.value;
      }
    }
  }

  return target as MergeProps<T>;
}

/**
 * Split props into multiple groups by key
 *
 * Useful for forwarding subsets of props to different components.
 * Returns tuple of props objects, one for each key array plus remaining.
 *
 * @example
 * ```tsx
 * function Stack(props) {
 *   const [dbProps, cacheProps, rest] = splitProps(
 *     props,
 *     ['dbName', 'dbSize', 'replicas'],
 *     ['cacheSize', 'ttl']
 *   );
 *
 *   return (
 *     <>
 *       <Database {...dbProps} {...rest} />
 *       <Cache {...cacheProps} />
 *     </>
 *   );
 * }
 * ```
 */
export function splitProps<T extends object, K extends (keyof T)[][]>(
  props: T,
  ...keys: K
): SplitProps<T, K> {
  const descriptors = Object.getOwnPropertyDescriptors(props);
  const result: Record<string, unknown>[] = [];
  const usedKeys = new Set<string | symbol>();

  // Create an object for each key group
  for (const keyGroup of keys) {
    const obj: Record<string, unknown> = {};

    for (const key of keyGroup) {
      const keyStr = key as string;
      if (keyStr in descriptors) {
        const descriptor = descriptors[keyStr];
        if (!descriptor) continue;

        // Preserve getters for reactivity
        if ("get" in descriptor && descriptor.get) {
          Object.defineProperty(obj, keyStr, {
            enumerable: true,
            configurable: true,
            get: descriptor.get,
          });
        } else {
          obj[keyStr] = descriptor.value;
        }

        usedKeys.add(keyStr);
      }
    }

    result.push(obj);
  }

  // Create object for remaining keys
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(descriptors)) {
    if (!usedKeys.has(key)) {
      const descriptor = descriptors[key];
      if (!descriptor) continue;

      if ("get" in descriptor && descriptor.get) {
        Object.defineProperty(rest, key, {
          enumerable: true,
          configurable: true,
          get: descriptor.get,
        });
      } else {
        rest[key] = descriptor.value;
      }
    }
  }
  result.push(rest);

  return result as SplitProps<T, K>;
}

// Type helpers

/** Merge multiple object types, later overriding earlier */
type MergeProps<T extends object[]> = T extends [infer First, ...infer Rest]
  ? First extends object
    ? Rest extends object[]
      ? Omit<First, keyof MergeProps<Rest>> & MergeProps<Rest>
      : First
    : {}
  : {};

/** Split props result type */
type SplitProps<T, K extends (keyof T)[][]> = [
  ...{
    [I in keyof K]: Pick<T, K[I] extends (keyof T)[] ? K[I][number] : never>;
  },
  Omit<T, K[number] extends (keyof T)[] ? K[number][number] : never>,
];
