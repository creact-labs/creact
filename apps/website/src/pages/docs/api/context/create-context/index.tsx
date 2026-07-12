import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const CreateContext: Component = () => {
  return (
    <>
      <h1>createContext</h1>
      <p class="docs-description">
        Creates a context for passing data through the component tree without
        props.
      </p>

      <DocCodeBlock
        code={`const ThemeContext = createContext<'light' | 'dark'>('dark');`}
      />

      <ApiReference
        name="createContext"
        signature="createContext<T>(defaultValue?: T): Context<T>"
        parameters={[
          [<><code>defaultValue</code></>, <><code>T</code></>, <>Optional. Value returned by <code>useContext</code> when no
              Provider exists above.</>],
        ]}
        returns={
          <>
      <p>
        A <code>Context&lt;T&gt;</code> object with a <code>Provider</code>{" "}
        component.
      </p>
          </>
        }
      />

      <UsageSection
        code={`const ConfigContext = createContext<{ region: string }>();

function App() {
  return (
    <ConfigContext.Provider value={{ region: 'us-east-1' }}>
      <Infrastructure />
    </ConfigContext.Provider>
  );
}`}
      />
    </>
  );
};

export default CreateContext;
