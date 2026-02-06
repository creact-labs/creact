/**
 * For - list rendering component
 *
 * Efficiently renders a list of items with fine-grained updates.
 * Each item is keyed by reference identity for optimal reconciliation.
 *
 * For reactive arrays, pass an accessor function:
 * ```tsx
 * <For each={() => items()}>
 * ```
 */

import type { CReactNode, JSXElement } from "../../src/jsx/jsx-runtime";
import { mapArray } from "../../src/reactive/array";
import {
  type Accessor,
  access,
  createMemo,
  type MaybeAccessor,
} from "../../src/reactive/signal";

export interface ForProps<T, U extends CReactNode> {
  /**
   * Array to iterate over.
   * For reactive arrays, pass an accessor: `each={() => items()}`
   */
  each: MaybeAccessor<readonly T[] | undefined | null | false>;
  /**
   * Optional fallback when array is empty.
   * For reactive fallbacks, pass an accessor: `fallback={() => <Empty />}`
   */
  fallback?: MaybeAccessor<CReactNode>;
  /**
   * Optional key function to extract a unique key from each item.
   * When provided, items are matched by key instead of reference identity,
   * allowing efficient updates when item objects are replaced.
   */
  keyFn?: (item: T) => any;
  /** Render function for each item - receives item accessor and index accessor */
  children: (item: Accessor<T>, index: Accessor<number>) => U;
}

/**
 * Render a list of items efficiently
 *
 * Unlike `.map()`, For uses referential identity to key items,
 * allowing efficient updates when items are added, removed, or reordered.
 *
 * For reactive arrays, pass an accessor function:
 * ```tsx
 * <For each={() => users()} fallback={() => <NoUsers />}>
 *   {(user, index) => (
 *     <UserCard
 *       key={user().id}
 *       user={user()}
 *       position={index()}
 *     />
 *   )}
 * </For>
 * ```
 *
 * Or with static values:
 * ```tsx
 * <For each={staticUsers} fallback={<NoUsers />}>
 *   {(user) => <UserCard user={user()} />}
 * </For>
 * ```
 */
export function For<T, U extends CReactNode>(
  props: ForProps<T, U>,
): JSXElement {
  const options: { fallback?: () => any; keyFn?: (item: T) => any } = {};
  if ("fallback" in props) options.fallback = () => access(props.fallback);
  if ("keyFn" in props) options.keyFn = props.keyFn;
  return createMemo(
    mapArray(() => access(props.each), props.children, options),
  ) as unknown as JSXElement;
}
