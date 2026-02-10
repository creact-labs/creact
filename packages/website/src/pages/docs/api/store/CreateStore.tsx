import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

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

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="createStore"
        signature="createStore<T extends object>(value: T): [T, SetStoreFunction<T>]"
      />

      <DocHeading level={3} id="parameters">
        Parameters
      </DocHeading>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>value</code>
            </td>
            <td>
              <code>T</code>
            </td>
            <td>Initial store value. Must be an object.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
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

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
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
