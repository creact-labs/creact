/**
 * Samples for the getOwner API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { getOwner } from "@creact-labs/creact";

export function captureOwner() {
  // #region usage
  const owner = getOwner();
  // Use with runWithOwner to restore ownership context
  // in async callbacks or event handlers
  // #endregion usage
  return owner;
}
