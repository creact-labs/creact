import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";

const CreateSignal: Component = () => {
  return (
    <>
      <h1>createSignal</h1>
      <p class="docs-description">
        Creates a reactive signal with a getter and setter.
      </p>

      <DocCodeBlock code={`const [count, setCount] = createSignal(0);`} />

      <ApiReference
        name="createSignal"
        signature={`createSignal<T>(): [Accessor<T | undefined>, Setter<T | undefined>]
createSignal<T>(value: T, options?: SignalOptions<T>): [Accessor<T>, Setter<T>]`}
        parameters={[
          [<><code>value</code></>, <><code>T</code></>, <>Initial value of the signal. Optional; omit for{" "}
              <code>T | undefined</code>.</>],
          [<><code>options</code></>, <><code>SignalOptions&lt;T&gt;</code></>, <>Optional. Set <code>equals</code> to <code>false</code> to disable
              equality checks, or provide a custom comparator.</>],
        ]}
        returns={
          <>
      <p>
        A tuple of <code>[getter, setter]</code>:
      </p>
      <ul>
        <li>
          <code>getter()</code>: reads the current value and registers a
          dependency when called inside a tracking scope
        </li>
        <li>
          <code>setter(value)</code>: updates the value. Accepts a direct value
          or a function <code>(prev) =&gt; next</code>.
        </li>
      </ul>
          </>
        }
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>

      <DocHeading level={3} id="basic">
        Basic Usage
      </DocHeading>
      <DocCodeBlock
        code={`import { createSignal, createEffect } from '@creact-labs/creact';

const [name, setName] = createSignal('world');

createEffect(() => {
  console.log(\`Hello, \${name()}!\`);
});

setName('CReact'); // Logs: Hello, CReact!`}
      />

      <DocHeading level={3} id="functional-updates">
        Functional Updates
      </DocHeading>
      <DocCodeBlock
        code={`const [count, setCount] = createSignal(0);

setCount(c => c + 1); // 1
setCount(c => c + 1); // 2`}
      />

      <DocHeading level={3} id="custom-equality">
        Custom Equality
      </DocHeading>
      <DocCodeBlock
        code={`// Never skip updates
const [data, setData] = createSignal(initialData, { equals: false });

// Custom comparator
const [pos, setPos] = createSignal({ x: 0, y: 0 }, {
  equals: (a, b) => a.x === b.x && a.y === b.y,
});`}
      />

      <Callout type="tip">
        <p>
          By default, signals use <code>===</code> comparison. Setting the same
          value again won't trigger re-computation.
        </p>
      </Callout>
    </>
  );
};

export default CreateSignal;
