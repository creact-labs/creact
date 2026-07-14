import { describe, expect, it } from "vitest";
import config from "../../../i18n.json";

// resources/en is the only hand-edited locale; every other locale dir is a
// generated artifact of the localization pipeline (config:
// apps/website/i18n.json, workflow: .github/workflows/localize.yml). This
// suite is the structural gate that keeps generated copy safe: identical
// file sets and key trees, no empty strings, locked keys carried verbatim,
// and {placeholders} preserved. en passes trivially; each generated locale
// is covered automatically the moment its directory lands.

type Tree = Record<string, unknown>;

const modules = import.meta.glob("../resources/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Tree>;

/** locale → resource file path relative to the locale dir → parsed tree */
const byLocale = new Map<string, Map<string, Tree>>();
for (const [path, tree] of Object.entries(modules)) {
  const relative = path.replace("../resources/", "");
  const locale = relative.slice(0, relative.indexOf("/"));
  const file = relative.slice(relative.indexOf("/") + 1);
  const files = byLocale.get(locale) ?? new Map<string, Tree>();
  files.set(file, tree);
  byLocale.set(locale, files);
}

const en = byLocale.get("en") as Map<string, Tree>;

/** Every [dot-joined path, value] pair at the string leaves of a tree */
function leafEntries(tree: Tree, prefix: string): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[path, value] as [string, string]]
      : leafEntries(value as Tree, path);
  });
}

describe.each([...byLocale.keys()].map((locale) => ({ locale })))(
  "$locale resources",
  ({ locale }) => {
    const files = byLocale.get(locale) as Map<string, Tree>;

    it("has exactly the same resource files as en", () => {
      expect([...files.keys()].sort()).toEqual([...en.keys()].sort());
    });

    it.each([...en.keys()].map((file) => ({ file })))(
      "$file mirrors the en key tree",
      ({ file }) => {
        const source = new Map(leafEntries(en.get(file) as Tree, ""));
        const translated = new Map(leafEntries(files.get(file) ?? {}, ""));

        // same keys — a missing or extra key means the generated locale
        // drifted from the en source
        expect([...translated.keys()].sort()).toEqual(
          [...source.keys()].sort(),
        );

        for (const [key, value] of translated) {
          expect(value, `${key} is empty`).not.toBe("");
          // {placeholders} in the en string must survive translation.
          // Identifier-only tokens: resource values also carry code
          // samples whose brace blocks are legitimately translated
          // (their comments are copy), so `{ anything }` is too broad.
          for (const token of source.get(key)?.match(/\{[a-zA-Z0-9_]+\}/g) ??
            []) {
            expect(value, `${key} lost ${token}`).toContain(token);
          }
        }

        // locked keys (brand terms, filenames) must never be rewritten —
        // the list is read from the pipeline config so the gate and the
        // generator cannot disagree about what stays untranslated
        for (const locked of config.buckets.json.lockedKeys) {
          if (source.has(locked)) {
            expect(translated.get(locked)).toBe(source.get(locked));
          }
        }
      },
    );
  },
);
