import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const Testing: Component = () => {
  return (
    <>
      <h1>Testing</h1>
      <p class="docs-description">
        Test CReact components and reactive logic with Vitest and createRoot.
      </p>

      <DocHeading level={2} id="setup">
        Setup
      </DocHeading>
      <p>Install Vitest:</p>
      <DocCodeBlock
        lang="bash"
        code={`npm install -D vitest`}
        filename="Terminal"
      />

      <DocHeading level={2} id="testing-signals">
        Testing Signals
      </DocHeading>
      <p>
        Test reactive primitives by wrapping them in <code>createRoot</code>:
      </p>
      <DocCodeBlock
        code={`import { describe, it, expect } from 'vitest';
import { createSignal, createEffect, createRoot } from '@creact-labs/creact';

describe('signals', () => {
  it('tracks changes', () => {
    createRoot(() => {
      const [count, setCount] = createSignal(0);
      let observed = 0;

      createEffect(() => {
        observed = count();
      });

      expect(observed).toBe(0);
      setCount(5);
      expect(observed).toBe(5);
    });
  });
});`}
        filename="signals.spec.ts"
      />

      <DocHeading level={2} id="testing-components">
        Testing Components
      </DocHeading>
      <p>
        Test components by calling them directly and inspecting their handler
        outputs:
      </p>
      <DocCodeBlock
        code={`import { createRoot, createSignal } from '@creact-labs/creact';

it('counter persists state', async () => {
  await createRoot(async () => {
    const counter = Counter({ initial: 10 });
    // Assert handler outputs via the returned accessors
  });
});`}
        filename="counter.spec.ts"
      />

      <DocHeading level={2} id="testing-flow">
        Testing Flow Components
      </DocHeading>
      <DocCodeBlock
        code={`import { Show, createSignal, createRoot, createMemo } from '@creact-labs/creact';

it('Show renders when truthy', () => {
  createRoot(() => {
    const [show, setShow] = createSignal(false);

    const result = createMemo(() => {
      const r = (Show as any)({
        when: show,
        children: () => 'visible'
      });
      return typeof r === 'function' ? r() : r;
    });

    expect(result()).toBeFalsy();
    setShow(true);
    expect(result()).toBe('visible');
  });
});`}
        filename="flow.spec.ts"
      />

      <Callout type="tip">
        <p>
          Wrap tests in <code>createRoot</code> so effects, cleanups, and
          ownership tracking work.
        </p>
      </Callout>
    </>
  );
};

export default Testing;
