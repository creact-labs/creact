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
/** Settle `value`, but reject if it hasn't done so by `deadline` (a timestamp). */
function beforeDeadline<T>(
  value: T | PromiseLike<T>,
  deadline: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("waitFor: the callback did not settle before the timeout"));
    }, Math.max(0, deadline - Date.now()));
    Promise.resolve(value).then(
      (settled) => {
        clearTimeout(timer);
        resolve(settled);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function waitFor<T>(
  callback: () => T | PromiseLike<T>,
  options: WaitOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? 1000;
  const interval = options.interval ?? 10;
  const deadline = Date.now() + timeout;
  let lastError: unknown = new Error(`waitFor timed out after ${timeout}ms`);
  for (;;) {
    try {
      // Race the callback against the deadline: await so an async callback
      // retries on its resolved value (not the always-truthy pending promise),
      // and a callback that hangs can't block the loop past the timeout.
      const result = await beforeDeadline(callback(), deadline);
      if (result) return result;
      lastError = new Error("waitFor: callback never returned a truthy value");
    } catch (error) {
      lastError = error;
    }
    // Sleep only up to the deadline, so a long interval can't overshoot it.
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw lastError;
    await delay(Math.min(interval, remaining));
  }
}
