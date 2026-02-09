import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const UseContext: Component = () => {
  return (
    <>
      <h1>useContext</h1>
      <p class="docs-description">Reads the value of the nearest context Provider above in the tree.</p>

      <DocCodeBlock code={`const config = useContext(ConfigContext);`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="useContext"
        signature="useContext<T>(context: Context<T>): T"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>context</code></td><td><code>Context&lt;T&gt;</code></td><td>The context object created by <code>createContext</code>.</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>
        The value from the nearest <code>Provider</code> above. If no Provider exists,
        returns the default value passed to <code>createContext</code>.
      </p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`function Infrastructure() {
  const config = useContext(ConfigContext);
  console.log(config.region); // 'us-east-1'
  return <></>;
}`} />
    </>
  );
};

export default UseContext;
