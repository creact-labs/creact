/**
 * A component's own address segment.
 *
 * Its own module because two callers need it and they cannot import each
 * other: `useAsyncOutput` builds a node id from it (`instance.ts`), and the
 * store attach hook needs the same segment to hydrate a component's store by
 * the path that node was persisted under (`render.ts`). Deriving it in one
 * place is what keeps those two from drifting.
 *
 * Deliberately takes no resource path: callers append it to whatever path is
 * current, so this module depends on nothing else in the runtime.
 */
import type { Fiber } from "./fiber";

/** Convert PascalCase to kebab-case */
export function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * `<kebab-name>-<key>`.
 *
 * A lone component needs no key — it addresses itself by its own name
 * (`name-name`). A key is only required to disambiguate siblings, and then it
 * replaces the second half.
 */
export function instanceName(fiber: Fiber): string {
  const componentType = fiber.type as (props: unknown) => unknown;
  const componentName = componentType.name || "Instance";
  const kebab = toKebabCase(componentName);
  const keySegment = fiber.key !== undefined ? String(fiber.key) : kebab;
  return `${kebab}-${keySegment}`;
}
