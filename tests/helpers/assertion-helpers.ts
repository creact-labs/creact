// Test helpers for common assertions

import { expect } from 'vitest';
import { ValidationError } from '@/core/Validator';

/**
 * Assert that a function throws a ValidationError with expected message
 */
export function expectValidationError(
  fn: () => void,
  expectedMessage?: string | RegExp
) {
  try {
    fn();
    expect.fail('Expected ValidationError to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect((error as Error).message).toContain(expectedMessage);
      } else {
        expect((error as Error).message).toMatch(expectedMessage);
      }
    }
  }
}

/**
 * Assert that a function does not throw
 */
export function expectNoThrow(fn: () => void) {
  expect(fn).not.toThrow();
}

/**
 * Assert that an async function throws a ValidationError
 */
export async function expectAsyncValidationError(
  fn: () => Promise<void>,
  expectedMessage?: string | RegExp
) {
  try {
    await fn();
    expect.fail('Expected ValidationError to be thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect((error as Error).message).toContain(expectedMessage);
      } else {
        expect((error as Error).message).toMatch(expectedMessage);
      }
    }
  }
}

/**
 * Assert that an async function does not throw
 */
export async function expectAsyncNoThrow(fn: () => Promise<void>) {
  await expect(fn()).resolves.not.toThrow();
}

/**
 * Assert that a ValidationError has expected component stack
 */
export function expectComponentStack(
  error: ValidationError,
  expectedComponents: string[]
) {
  expect(error.componentStack).toEqual(expectedComponents);
}

/**
 * Assert that a ValidationError has expected file info
 */
export function expectFileInfo(
  error: ValidationError,
  fileName: string,
  lineNumber?: number
) {
  expect(error.filePath).toBe(fileName);
  if (lineNumber !== undefined) {
    expect(error.lineNumber).toBe(lineNumber);
  }
}
