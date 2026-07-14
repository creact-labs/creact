import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("has the docs domain", () => {
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

describe("matchLocale", () => {
  it.each([
    { pref: "en-US", expected: "en" },
    { pref: "de", expected: "de" },
    { pref: "pt-BR", expected: "pt-BR" },
    { pref: "pt", expected: "pt-BR" },
    { pref: "PT-br", expected: "pt-BR" },
    { pref: "fr-CA", expected: "fr" },
    { pref: "zh", expected: "zh-Hans" },
    { pref: "zh-CN", expected: "zh-Hans" },
    { pref: "zh-TW", expected: "zh-Hant" },
    { pref: "zh-HK", expected: "zh-Hant" },
    { pref: "zh-Hant", expected: "zh-Hant" },
  ])("$pref → $expected", ({ pref, expected }) => {
    expect(i18n.matchLocale(pref)).toBe(expected);
  });

  it("returns undefined for an unsupported language", () => {
    expect(i18n.matchLocale("xx-YY")).toBeUndefined();
  });
});

describe("detectLocale", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("picks the first supported browser preference", () => {
    vi.stubGlobal("navigator", { languages: ["xx", "de-DE", "fr"] });
    expect(i18n.detectLocale()).toBe("de");
  });

  it("falls back to navigator.language when languages is empty", () => {
    vi.stubGlobal("navigator", { languages: [], language: "ja-JP" });
    expect(i18n.detectLocale()).toBe("ja");
  });

  it("falls back to english when nothing matches", () => {
    vi.stubGlobal("navigator", { languages: ["xx", "yy"] });
    expect(i18n.detectLocale()).toBe("en");
  });

  it("returns english when there is no navigator", () => {
    vi.stubGlobal("navigator", undefined);
    expect(i18n.detectLocale()).toBe("en");
  });
});
