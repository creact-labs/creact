import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

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

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="createContext"
        signature="createContext<T>(defaultValue?: T): Context<T>"
      />

      <DocHeading level={3} id="parameters">
        Parameters
      </DocHeading>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>defaultValue</code>
            </td>
            <td>
              <code>T</code>
            </td>
            <td>
              Optional. Value returned by <code>useContext</code> when no
              Provider exists above.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
      <p>
        A <code>Context&lt;T&gt;</code> object with a <code>Provider</code>{" "}
        component.
      </p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
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
