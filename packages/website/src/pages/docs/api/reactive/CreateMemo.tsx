import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const CreateMemo: Component = () => {
  return (
    <>
      <h1>createMemo</h1>
      <p class="docs-description">
        Creates a cached derived value. Use when computing a value from other
        signals. Only recomputes when dependencies change.
      </p>

      <DocCodeBlock code={`const doubled = createMemo(() => count() * 2);`} />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="createMemo"
        signature="createMemo<T>(fn: (prev: T | undefined) => T, value?: T, options?: MemoOptions<T>): Accessor<T>"
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
              <code>fn</code>
            </td>
            <td>
              <code>(prev: T | undefined) =&gt; T</code>
            </td>
            <td>Computation function. Receives previous value.</td>
          </tr>
          <tr>
            <td>
              <code>value</code>
            </td>
            <td>
              <code>T</code>
            </td>
            <td>Optional initial seed value.</td>
          </tr>
          <tr>
            <td>
              <code>options</code>
            </td>
            <td>
              <code>MemoOptions&lt;T&gt;</code>
            </td>
            <td>
              Optional. <code>equals</code> for custom comparison.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
      <p>
        An <code>Accessor&lt;T&gt;</code> that returns the memoized value. Acts
        as both a signal reader (trackable) and a computation (auto-updates).
      </p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>

      <DocHeading level={3} id="derived-values">
        Derived Values
      </DocHeading>
      <DocCodeBlock
        code={`const [items, setItems] = createSignal([1, 2, 3]);
const total = createMemo(() => items().reduce((a, b) => a + b, 0));

console.log(total()); // 6
setItems([10, 20]);
console.log(total()); // 30`}
      />

      <DocHeading level={3} id="chaining">
        Chaining Memos
      </DocHeading>
      <DocCodeBlock
        code={`const [count, setCount] = createSignal(1);
const doubled = createMemo(() => count() * 2);
const quadrupled = createMemo(() => doubled() * 2);

console.log(quadrupled()); // 4`}
      />

      <DocHeading level={3} id="equality">
        Custom Equality
      </DocHeading>
      <DocCodeBlock
        code={`const filtered = createMemo(
  () => items().filter(i => i.active),
  [],
  { equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]) }
);`}
      />
    </>
  );
};

export default CreateMemo;
