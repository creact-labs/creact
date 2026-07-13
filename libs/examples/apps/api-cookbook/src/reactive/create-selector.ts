/**
 * Samples for the createSelector API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createEffect, createSelector, createSignal } from "@creact-labs/creact";

export function usage(items: { id: string }[]) {
  // #region usage
  const [selected, setSelected] = createSignal('a');
  const isSelected = createSelector(selected);

  // In a loop: only 2 items update when selection changes
  items.forEach(item => {
    createEffect(() => {
      if (isSelected(item.id)) {
        console.log(item.id, 'is now selected');
      }
    });
  });

  setSelected('b'); // Only 'a' and 'b' effects re-run
  // #endregion usage
}
