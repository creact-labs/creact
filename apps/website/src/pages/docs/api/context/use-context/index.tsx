import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const UseContext: Component = () => {
  return (
    <>
      <h1>useContext</h1>
      <p class="docs-description">
        Reads the value of the nearest context Provider above in the tree.
      </p>

      <DocCodeBlock code={`const config = useContext(ConfigContext);`} />

      <ApiReference
        name="useContext"
        signature="useContext<T>(context: Context<T>): T"
        parameters={[
          [<><code>context</code></>, <><code>Context&lt;T&gt;</code></>, <>The context object created by <code>createContext</code>.</>],
        ]}
        returns={
          <>
      <p>
        The value from the nearest <code>Provider</code> above. If no Provider
        exists, returns the default value passed to <code>createContext</code>.
      </p>
          </>
        }
      />

      <UsageSection
        code={`function Infrastructure() {
  const config = useContext(ConfigContext);
  console.log(config.region); // 'us-east-1'
  return <></>;
}`}
      />
    </>
  );
};

export default UseContext;
