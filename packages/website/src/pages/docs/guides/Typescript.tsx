import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const Typescript: Component = () => {
  return (
    <>
      <h1>TypeScript</h1>
      <p class="docs-description">
        CReact is written in TypeScript. Here's how to get the most out of the type system for signals, props, and components.
      </p>

      <DocHeading level={2} id="tsconfig">TypeScript Configuration</DocHeading>
      <p>
        The key setting is <code>jsxImportSource</code>. This tells TypeScript to use CReact's
        JSX types:
      </p>
      <DocCodeBlock lang="json" code={`{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@creact-labs/creact",
    "strict": true,
    "outDir": "dist"
  }
}`} filename="tsconfig.json" />

      <DocHeading level={2} id="typed-signals">Typed Signals</DocHeading>
      <p>Signals infer their type from the initial value, or you can specify it explicitly:</p>
      <DocCodeBlock code={`// Inferred as Signal<number>
const [count, setCount] = createSignal(0);

// Explicit generic
const [items, setItems] = createSignal<string[]>([]);

// Optional initial value
const [user, setUser] = createSignal<User>();
// user() returns User | undefined`} />

      <DocHeading level={2} id="typed-props">Typed Props</DocHeading>
      <DocCodeBlock code={`interface WebSiteProps {
  name: () => string;
  content: () => string;
  region?: string;
}

function WebSite(props: WebSiteProps) {
  const site = useAsyncOutput(props, async (p, setOutputs) => {
    // p is typed as WebSiteProps
    const name = p.name(); // string
    setOutputs({ url: \`https://\${name}.example.com\` });
  });

  return <></>;
}`} />

      <DocHeading level={2} id="accessor-types">Accessor and MaybeAccessor</DocHeading>
      <DocCodeBlock code={`import type { Accessor, MaybeAccessor } from '@creact-labs/creact';
import { access } from '@creact-labs/creact';

// Accessor<T> = () => T
const getter: Accessor<number> = () => 42;

// MaybeAccessor<T> = T | () => T
function useValue(v: MaybeAccessor<string>) {
  return access(v); // unwraps to string
}`} />

      <Callout type="info">
        <p>
          CReact re-exports key types: <code>Accessor</code>, <code>Setter</code>,
          <code>MaybeAccessor</code>, <code>SignalOptions</code>, <code>MemoOptions</code>,
          <code>Owner</code>, <code>Context</code>, and all runtime types.
        </p>
      </Callout>
    </>
  );
};

export default Typescript;
