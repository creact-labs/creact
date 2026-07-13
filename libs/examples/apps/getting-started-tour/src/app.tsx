/**
 * Root component of the tour app: renders the durable Counter from the
 * state-and-memory samples, so running the app exercises persistence.
 */
import { Counter } from "./state-and-memory";

export function App() {
  return <Counter key="counter" />;
}
