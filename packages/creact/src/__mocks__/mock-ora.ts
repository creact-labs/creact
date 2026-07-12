/**
 * ora spinner mock — ora renders to a TTY, so CLI tests replace it with an
 * inspectable fake. Consumed by the cli-logger and cli-main suites (their
 * only shared ancestor is src/, hence this __mocks__ folder).
 *
 * Usage:
 *   vi.mock("ora", async () => (await import("../__mocks__/mock-ora")).mockOraModule());
 *   import { spinnerMock } from "../__mocks__/mock-ora";
 */

import { vi } from "vitest";

export const spinnerMock = {
  start: vi.fn(),
  stop: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
  info: vi.fn(),
};

export function mockOraModule() {
  return {
    default: vi.fn(() => ({ ...spinnerMock, start: () => spinnerMock })),
  };
}
