/**
 * Samples for the createStore API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createStore } from "@creact-labs/creact";

// #region hero
const [store, setStore] = createStore({ count: 0, user: { name: "Alice" } });
// #endregion hero

export function usage() {
  // #region usage
  const [state, setState] = createStore({
    todos: [{ text: "Learn CReact", done: false }],
  });

  // Update nested properties
  setState("todos", 0, "done", true);

  // Functional update
  setState("todos", (todos) => [...todos, { text: "Build app", done: false }]);
  // #endregion usage
  return state;
}

export function heroStore() {
  setStore("user", "name", "Bob");
  return store.count;
}
