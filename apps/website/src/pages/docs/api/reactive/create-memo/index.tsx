import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const CreateMemo: Component = () => {
  return (
    <>
      <h1>createMemo</h1>
      <p class="docs-description">
        Creates a cached derived value. Use when computing a value from other
        signals. Only recomputes when dependencies change.
      </p>

      <DocCodeBlock code={`const doubled = createMemo(() => count() * 2);`} />

      <ApiReference
        name="createMemo"
        signature="createMemo<T>(fn: (prev: T | undefined) => T, value?: T, options?: MemoOptions<T>): Accessor<T>"
        parameters={[
          [<><code>fn</code></>, <><code>(prev: T | undefined) =&gt; T</code></>, "Computation function. Receives previous value."],
          [<><code>value</code></>, <><code>T</code></>, "Optional initial seed value."],
          [<><code>options</code></>, <><code>MemoOptions&lt;T&gt;</code></>, <>Optional. <code>equals</code> for custom comparison.</>],
        ]}
        returns={
          <>
      <p>
        An <code>Accessor&lt;T&gt;</code> that returns the memoized value. Acts
        as both a signal reader (trackable) and a computation (auto-updates).
      </p>
          </>
        }
      />

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
