export interface WaitOptions {
  /** Give up after this many milliseconds (default 1000). */
  timeout?: number;
  /** Re-check this often while waiting (default 10ms). */
  interval?: number;
}

/** Resolve after a real timer — for stepping past a handler's async work. */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry `callback` until it returns a truthy value, then resolve with it.
 * A thrown error or a falsy return means "not yet" and is retried until the
 * timeout, at which point the last error (or a timeout error) is thrown. This
 * is what `findBy*` builds on, and it reads cleanly for outputs too:
 *
 *   await waitFor(() => counter.output("count") === 5);
 */
export async function waitFor<T>(
  callback: () => T | PromiseLike<T>,
  options: WaitOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? 1000;
  const interval = options.interval ?? 10;
  const start = Date.now();
  let lastError: unknown = new Error("waitFor timed out");
  for (;;) {
    try {
      // await so an async callback retries on its resolved value, not on the
      // (always-truthy) pending promise it would otherwise return.
      const result = await callback();
      if (result) return result;
      lastError = new Error("waitFor: callback never returned a truthy value");
    } catch (error) {
      lastError = error;
    }
    if (Date.now() - start >= timeout) throw lastError;
    await delay(interval);
  }
}
