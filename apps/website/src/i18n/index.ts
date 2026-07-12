/**
 * i18n setup: translation resources live in resources/<locale>/<domain>.json,
 * scoped by domain (common, landing, docs).
 *
 * In tests this module is replaced by the mandatory key-passthrough mock in
 * src/testing/mocks.ts — tests assert on keys, never on copy.
 */
import { createSignal } from "solid-js";
import common from "./resources/en/common.json";
import docs from "./resources/en/docs.json";
import landing from "./resources/en/landing.json";

const en = { common, docs, landing };

export type Locale = "en";
type Resources = typeof en;

/** Dot-joined path to every string leaf of the resource tree */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Leaves<Resources>;

const resources: Record<Locale, Resources> = { en };

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
