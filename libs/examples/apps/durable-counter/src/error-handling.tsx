/**
 * Samples for the error-handling page. Each region is displayed by the
 * website; stub components and helpers keep every fragment compiling
 * for real.
 */
import { catchError, createEffect, useAsyncOutput } from "@creact-labs/creact";

function Deploy() {
  return <></>;
}

function riskyOperation() {}

async function generateHtml(prompt: string): Promise<string> {
  return `<html>${prompt}</html>`;
}

// #region error-boundary
import { ErrorBoundary } from "@creact-labs/creact";

function App() {
  return (
    <ErrorBoundary
      fallback={(err, reset) => {
        console.error("Failed:", err.message);
        // Call reset() to clear the error and re-render children
        return <></>;
      }}
    >
      <Deploy />
    </ErrorBoundary>
  );
}
// #endregion error-boundary

export function catchErrors() {
  // #region catch-error
  catchError(
    () => {
      createEffect(() => {
        // If this throws, the handler catches it
        riskyOperation();
      });
    },
    (err) => {
      console.error("Caught:", err.message);
    },
  );
  // #endregion catch-error
}

function Site(props: { prompt: () => string }) {
  // #region handler-errors
  const site = useAsyncOutput(props, async (p, setOutputs) => {
    try {
      const html = await generateHtml(p.prompt());
      setOutputs({ html });
    } catch (err) {
      console.error("Handler failed:", err);
      setOutputs({ html: null, error: String(err) });
    }
  });
  // #endregion handler-errors
  void site;
  return <></>;
}

export { App, Site };
