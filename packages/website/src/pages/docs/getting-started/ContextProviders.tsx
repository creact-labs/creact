import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const ContextProviders: Component = () => {
  return (
    <>
      <h1>Context and Providers</h1>
      <p class="docs-description">
        Contexts share data across the component tree without passing props
        through every level.
      </p>

      <DocHeading level={2} id="creating-context">
        Creating a Context
      </DocHeading>
      <p>
        <code>createContext</code> creates a context with an optional default
        value.
        <code>useContext</code> reads the nearest provider's value.
      </p>
      <DocCodeBlock
        code={`import { createContext, useContext } from '@creact-labs/creact';

const ConfigContext = createContext<{ region: string }>();

function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}`}
        filename="config-context.ts"
      />

      <DocHeading level={2} id="providing-values">
        Providing Values
      </DocHeading>
      <p>
        Wrap components with the context's <code>Provider</code>:
      </p>
      <DocCodeBlock
        code={`function App() {
  return (
    <ConfigContext.Provider value={{ region: 'us-east-1' }}>
      <Infrastructure />
    </ConfigContext.Provider>
  );
}

function Infrastructure() {
  const config = useConfig();
  console.log(config.region); // 'us-east-1'
  return <></>;
}`}
        filename="app.tsx"
      />

      <DocHeading level={2} id="nested-providers">
        Nested Providers
      </DocHeading>
      <p>Inner providers override outer ones for their subtree:</p>
      <DocCodeBlock
        code={`<ConfigContext.Provider value={{ region: 'us-east-1' }}>
  <UsEastResources />
  <ConfigContext.Provider value={{ region: 'eu-west-1' }}>
    <EuResources />
  </ConfigContext.Provider>
</ConfigContext.Provider>`}
      />

      <Callout type="tip">
        <p>
          Use contexts for cross-cutting concerns like AWS region, environment
          name, or shared credentials that many components need.
        </p>
      </Callout>
    </>
  );
};

export default ContextProviders;
