import { describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import common from "../resources/en/common.json";
import docs from "../resources/en/docs.json";
import landing from "../resources/en/landing.json";

// The global setup mock turns t() into a key passthrough; this suite tests
// the real module.
const i18n = await vi.importActual<typeof import("@/i18n")>("@/i18n");

/** Every dot-joined path to a string leaf of a resource tree */
function leafKeys(tree: Record<string, unknown>, prefix: string): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}.${key}`]
      : leafKeys(value as Record<string, unknown>, `${prefix}.${key}`),
  );
}

describe("translation completeness", () => {
  // Component tests assert on keys (the mandatory passthrough mock, see
  // src/testing/mocks.ts) — this test is what guards against a key
  // resolving to nothing in the real app.
  const allKeys = [
    ...leafKeys(common, "common"),
    ...leafKeys(landing, "landing"),
    ...leafKeys(docs, "docs"),
  ];

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
  it.each([
    { key: "common.brand", expected: common.brand },
    { key: "common.nav.docs", expected: common.nav.docs },
    { key: "landing.hero_subtitle", expected: landing.hero_subtitle },
    { key: "docs.param_table.type", expected: docs.param_table.type },
    { key: "docs.callout.tip", expected: docs.callout.tip },
  ] as const)(
    "$key resolves to its string in the resource files",
    ({ key, expected }) => {
      expect(i18n.t(key)).toBe(expected);
    },
  );

  it("unknown keys fall back to the key itself", () => {
    const key = `${faker.lorem.word()}.${faker.lorem.word()}`;
    expect(i18n.t(key as Parameters<typeof i18n.t>[0])).toBe(key);
  });

  it("keys that resolve to a branch, not a leaf, fall back to the key", () => {
    expect(i18n.t("docs.callout" as Parameters<typeof i18n.t>[0])).toBe(
      "docs.callout",
    );
  });
});

describe("locale", () => {
  it("defaults to english", () => {
    expect(i18n.locale()).toBe("en");
  });
});
