import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const CreateStore: Component = () => {
  return (
    <>
      <h1>createStore</h1>
      <p class="docs-description">
        Creates a reactive store proxy for managing nested state.
      </p>

      <DocCodeBlock
        code={`const [store, setStore] = createStore({ count: 0, user: { name: 'Alice' } });`}
      />

      <ApiReference
        name="createStore"
        signature="createStore<T extends object>(value: T): [T, SetStoreFunction<T>]"
        parameters={[
          [<><code>value</code></>, <><code>T</code></>, "Initial store value. Must be an object."],
        ]}
        returns={
          <>
      <p>
        A tuple of <code>[store, setStore]</code>:
      </p>
      <ul>
        <li>
          <code>store</code>: a reactive proxy. Property access is tracked.
        </li>
        <li>
          <code>setStore</code>: setter that accepts path-based updates.
        </li>
      </ul>
          </>
        }
      />

      <UsageSection
        code={`const [state, setState] = createStore({
  todos: [{ text: 'Learn CReact', done: false }],
});

// Update nested properties
setState('todos', 0, 'done', true);

// Functional update
setState('todos', (todos) => [...todos, { text: 'Build app', done: false }]);`}
      />
    </>
  );
};

export default CreateStore;
