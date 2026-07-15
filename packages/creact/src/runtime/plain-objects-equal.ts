/**
 * Compare two plain objects key-by-key with a caller-supplied value
 * predicate. Shared by shallow (identity) and deep equality checks.
 */
export function plainObjectsEqualWith(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  valuesEqual: (aValue: unknown, bValue: unknown) => boolean,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!valuesEqual(a[key], b[key])) return false;
  }
  return true;
}
