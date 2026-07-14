import { vi } from "vitest";

/** jsdom has no navigator.clipboard — install a spyable writeText */
export function installMockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return { writeText };
}
