/**
 * Global mock overrides — loaded for every test file via vitest setupFiles.
 */
import { vi } from "vitest";

// Mandatory i18n mock: every translation call renders its key path, so tests
// assert on keys instead of copy. Tests for the i18n module itself opt back
// in with vi.importActual.
vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return {
    ...actual,
    t: (key: string) => key,
    // Trans renders its key too — rich values assert on keys like plain ones
    Trans: (props: { k: string }) => props.k,
  };
});

// Shiki loads WASM + grammars; tests only need deterministic markup that
// mirrors the real shape (a <pre> block of the source text).
vi.mock("@/shared/shiki", () => ({
  getHighlighter: async () => ({
    codeToHtml: (code: string) => `<pre>${code}</pre>`,
  }),
}));

// jsdom has no IntersectionObserver; the TOC provider constructs one when
// headings register. Observation callbacks are irrelevant to these tests.
class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
