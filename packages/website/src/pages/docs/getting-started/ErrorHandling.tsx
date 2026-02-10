import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const ErrorHandling: Component = () => {
  return (
    <>
      <h1>Error Handling</h1>
      <p class="docs-description">
        ErrorBoundary and catchError catch errors in reactive computations and
        child components.
      </p>

      <DocHeading level={2} id="error-boundary">
        ErrorBoundary Component
      </DocHeading>
      <p>
        <code>ErrorBoundary</code> catches errors thrown in its children and
        renders a fallback:
      </p>
      <DocCodeBlock
        code={`import { ErrorBoundary } from '@creact-labs/creact';

function App() {
  return (
    <ErrorBoundary fallback={(err, reset) => {
      console.error('Failed:', err.message);
      // Call reset() to clear the error and re-render children
      return <></>;
    }}>
      <Deploy />
    </ErrorBoundary>
  );
}`}
      />

      <DocHeading level={2} id="catch-error">
        catchError Primitive
      </DocHeading>
      <p>
        For lower-level control, <code>catchError</code> wraps a function and
        catches errors in child computations:
      </p>
      <DocCodeBlock
        code={`import { catchError, createEffect } from '@creact-labs/creact';

catchError(
  () => {
    createEffect(() => {
      // If this throws, the handler catches it
      riskyOperation();
    });
  },
  (err) => {
    console.error('Caught:', err.message);
  }
);`}
      />

      <DocHeading level={2} id="error-propagation">
        Error Propagation
      </DocHeading>
      <p>
        Errors propagate up the owner chain. If no error boundary catches an
        error, it bubbles to the root and throws. Nested error boundaries catch
        errors from their subtree only.
      </p>

      <DocHeading level={2} id="handler-errors">
        Errors in Handlers
      </DocHeading>
      <p>
        <code>useAsyncOutput</code> handlers run in the runtime's async
        deployment loop, not inside reactive computations. Errors thrown in
        handlers cause the deployment to fail. They are <strong>not</strong>{" "}
        caught by <code>ErrorBoundary</code>. Handle errors inside your handler
        with try/catch:
      </p>
      <DocCodeBlock
        code={`const site = useAsyncOutput(props, async (p, setOutputs) => {
  try {
    const html = await generateHtml(p.prompt());
    setOutputs({ html });
  } catch (err) {
    console.error('Handler failed:', err);
    setOutputs({ html: null, error: err.message });
  }
});`}
      />

      <Callout type="warning">
        <p>
          Cleanup functions registered with <code>onCleanup</code> still run
          when an error boundary catches an error. Resources are released.
        </p>
      </Callout>
    </>
  );
};

export default ErrorHandling;
