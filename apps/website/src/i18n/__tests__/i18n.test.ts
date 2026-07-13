import { describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";

// The global setup mock turns t() into a key passthrough; this suite tests
// the real module.
const i18n = await vi.importActual<typeof import("@/i18n")>("@/i18n");

/** Every dot-joined path to a string leaf of a resource tree */
function leafKeys(tree: Record<string, unknown>, prefix: string): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [path]
      : leafKeys(value as Record<string, unknown>, path);
  });
}

describe("translation completeness", () => {
  // Component tests assert on keys (the mandatory passthrough mock, see
  // src/testing/mocks.ts) — this suite is what guards against a key
  // resolving to nothing in the real app. It walks the live resource
  // tree, so newly added domain files are covered automatically.
  const allKeys = leafKeys(i18n.resources.en, "");

  it("has at least the landing and docs domains", () => {
    expect(allKeys.some((key) => key.startsWith("landing."))).toBe(true);
    expect(allKeys.some((key) => key.startsWith("docs."))).toBe(true);
  });

  it.each(allKeys.map((key) => ({ key })))(
    "$key resolves to a non-empty translation",
    ({ key }) => {
      const translated = i18n.t(key as Parameters<typeof i18n.t>[0]);
      expect(translated).not.toBe(key); // resolved, not the fallback
      expect(translated.length).toBeGreaterThan(0);
    },
  );
});

describe("t", () => {
  it("unknown keys fall back to the key itself", () => {
    const key = `${faker.lorem.word()}.${faker.lorem.word()}`;
    expect(i18n.t(key as Parameters<typeof i18n.t>[0])).toBe(key);
  });

  it("keys that resolve to a branch, not a leaf, fall back to the key", () => {
    expect(i18n.t("docs.ui" as Parameters<typeof i18n.t>[0])).toBe("docs.ui");
  });
});

describe("locale", () => {
  it("defaults to english", () => {
    expect(i18n.locale()).toBe("en");
  });
});
