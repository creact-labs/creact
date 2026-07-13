/**
 * Samples for the onCleanup API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createEffect, onCleanup } from "@creact-labs/creact";

export function heroSample(interval: ReturnType<typeof setInterval>) {
  // #region hero
  onCleanup(() => {
    clearInterval(interval);
  });
  // #endregion hero
}

export function usage(tick: () => void) {
  // #region usage
  createEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    onCleanup(() => clearInterval(interval));
    // interval is cleared before the next run, or when disposed
  });
  // #endregion usage
}
