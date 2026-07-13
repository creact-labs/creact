/**
 * i18n setup: translation resources live in resources/<locale>/, scoped by
 * domain — one JSON per feature area and one per docs page, mirroring the
 * app's structure. Keys may repeat across domains by design; there is no
 * shared "common" bundle. Code samples are resources too: they live in the
 * page JSONs (their inline comments are copy like any other).
 *
 * In tests this module is replaced by the mandatory key-passthrough mock in
 * src/testing/mocks.ts — tests assert on keys, never on copy.
 */
import { createSignal } from "solid-js";
import docs_layout from "./resources/en/docs/layout.json";
import docs_ui from "./resources/en/docs/ui.json";
import landing from "./resources/en/landing.json";

const en = {
  landing,
  docs: {
    layout: docs_layout,
    ui: docs_ui,
  },
};

export type Locale = "en";
type Resources = typeof en;

/** Dot-joined path to every string leaf of the resource tree */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Leaves<Resources>;

/** The full resource tree per locale — exported for completeness tests */
export const resources: Record<Locale, Resources> = { en };

const [locale, setLocale] = createSignal<Locale>("en");
export { locale, setLocale };

/**
 * Resolve a translation key for the current locale. Reads the locale signal,
 * so translated text re-renders reactively when the locale changes.
 * Unresolvable keys fall back to the key itself.
 */
export function t(key: TranslationKey): string {
  let node: unknown = resources[locale()];
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}
