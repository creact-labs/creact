/**
 * Samples for the TypeScript guide. Each region is displayed by the
 * website; wrapping declarations keep every fragment compiling for real.
 */
import { createSignal, useAsyncOutput } from "@creact-labs/creact";

interface User {
  name: string;
}

export function typedSignals() {
  // #region typed-signals
  // Inferred as Signal<number>
  const [count, setCount] = createSignal(0);

  // Explicit generic
  const [items, setItems] = createSignal<string[]>([]);

  // Optional initial value
  const [user, setUser] = createSignal<User>();
  // user() returns User | undefined
  // #endregion typed-signals
  return { count, setCount, items, setItems, user, setUser };
}

// #region typed-props
interface WebSiteProps {
  name: () => string;
  content: () => string;
  region?: string;
}

function WebSite(props: WebSiteProps) {
  const site = useAsyncOutput(props, async (p, setOutputs) => {
    // p is typed as WebSiteProps
    const name = p.name(); // string
    setOutputs({ url: `https://${name}.example.com` });
  });

  return <></>;
}
// #endregion typed-props

// #region accessor-types
import type { Accessor, MaybeAccessor } from "@creact-labs/creact";
import { access } from "@creact-labs/creact";

// Accessor<T> = () => T
const getter: Accessor<number> = () => 42;

// MaybeAccessor<T> = T | () => T
function useValue(v: MaybeAccessor<string>) {
  return access(v); // unwraps to string
}
// #endregion accessor-types

export { WebSite, getter, useValue };
