import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const ReactivePrimitives: Component = () => {
  return (
    <>
      <h1>Reactive Primitives</h1>
      <p class="docs-description">
        Signals, effects, and memos make components respond to change.
      </p>

      <DocHeading level={2} id="signals">Signals</DocHeading>
      <p>
        A signal is a reactive value. It returns a getter and setter pair. Reading the getter
        inside an effect registers a dependency. The effect re-runs when the signal changes.
      </p>
      <DocCodeBlock code={`import { createSignal, createEffect } from '@creact-labs/creact';

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log(count()); // Tracks count, re-runs on change
});

setCount(1);        // Logs: 1
setCount(c => c + 1); // Logs: 2 (functional update)`} />

      <DocHeading level={2} id="effects">Effects</DocHeading>
      <p>
        Effects run side effects when their dependencies change. CReact tracks
        which signals are read inside the effect function.
      </p>
      <DocCodeBlock code={`createEffect(() => {
  // Runs whenever name() or count() changes
  console.log(\`\${name()} has count: \${count()}\`);
});`} />

      <Callout type="info">
        <p>
          Effects are queued and batched. Multiple signal updates in a single synchronous
          block only trigger one effect re-run.
        </p>
      </Callout>

      <DocHeading level={2} id="memos">Memos</DocHeading>
      <p>
        A memo is a derived reactive value. It caches the result and only recomputes when
        its dependencies change.
      </p>
      <DocCodeBlock code={`import { createMemo } from '@creact-labs/creact';

const [count, setCount] = createSignal(0);
const doubled = createMemo(() => count() * 2);

console.log(doubled()); // 0
setCount(5);
console.log(doubled()); // 10`} />

      <DocHeading level={2} id="batching">Batching</DocHeading>
      <p>
        <code>batch()</code> groups multiple signal updates into a single re-evaluation pass:
      </p>
      <DocCodeBlock code={`import { batch } from '@creact-labs/creact';

batch(() => {
  setFirstName('John');
  setLastName('Doe');
  setAge(30);
});
// Effects depending on any of these run once, not three times`} />

      <DocHeading level={2} id="untrack">Untrack</DocHeading>
      <p>
        <code>untrack()</code> reads a signal without creating a dependency:
      </p>
      <DocCodeBlock code={`import { untrack } from '@creact-labs/creact';

createEffect(() => {
  // Only re-runs when a() changes, not b()
  console.log(a(), untrack(b));
});`} />
    </>
  );
};

export default ReactivePrimitives;
