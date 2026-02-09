import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const ComponentsJsx: Component = () => {
  return (
    <>
      <h1>Components and JSX</h1>
      <p class="docs-description">
        CReact components are functions that return JSX. JSX describes resources and processes, not DOM elements.
      </p>

      <DocHeading level={2} id="what-is-jsx">JSX in CReact</DocHeading>
      <p>
        CReact uses JSX to describe <strong>resources and processes</strong>,
        not DOM elements. <code>&lt;WebSite name="blog" /&gt;</code>
        declares that a website named "blog" should exist.
      </p>
      <DocCodeBlock code={`function App() {
  return (
    <>
      <S3Bucket name="my-bucket" />
      <CloudFront origin="my-bucket" />
    </>
  );
}`} filename="app.tsx" />

      <DocHeading level={2} id="component-functions">Component Functions</DocHeading>
      <p>
        Components are plain functions that return JSX. They receive props as their first argument
        and run once. Reactivity is handled by signals, not re-renders.
      </p>
      <DocCodeBlock code={`function Counter(props: { initial: number }) {
  const [count, setCount] = createSignal(props.initial);

  createEffect(() => {
    console.log('Count is:', count());
  });

  return <></>;
}`} filename="counter.tsx" />

      <DocHeading level={2} id="fragments">Fragments</DocHeading>
      <p>
        Use <code>&lt;&gt;...&lt;/&gt;</code> to return multiple elements without a wrapper:
      </p>
      <DocCodeBlock code={`function Infrastructure() {
  return (
    <>
      <Database type="postgres" />
      <Cache type="redis" />
      <Server handler={app} />
    </>
  );
}`} filename="infra.tsx" />

      <DocHeading level={2} id="reactive-props">Reactive Props</DocHeading>
      <p>
        Props in CReact are often <strong>accessors</strong> (getter functions) to preserve reactivity.
        Components run once; effects re-run when their dependencies change.
      </p>
      <DocCodeBlock code={`function Display(props: { value: () => number }) {
  createEffect(() => {
    // Re-runs whenever props.value() changes
    console.log('Value:', props.value());
  });

  return <></>;
}

// Usage:
const [count, setCount] = createSignal(0);
<Display value={count} />`} filename="reactive-props.tsx" />

      <Callout type="tip">
        <p>
          Use the <code>access()</code> helper to unwrap values that may or may not be accessors:
          <code>access(props.value)</code> works whether <code>value</code> is <code>5</code> or <code>() =&gt; 5</code>.
        </p>
      </Callout>

      <DocHeading level={2} id="children">Children</DocHeading>
      <p>
        Components can receive children through JSX nesting. Use the <code>children()</code> helper
        to resolve them reactively.
      </p>
      <DocCodeBlock code={`import { children } from '@creact-labs/creact';

function Wrapper(props: { children: any }) {
  const resolved = children(() => props.children);

  createEffect(() => {
    console.log('Children:', resolved());
  });

  return <></>;
}`} filename="children.tsx" />
    </>
  );
};

export default ComponentsJsx;
