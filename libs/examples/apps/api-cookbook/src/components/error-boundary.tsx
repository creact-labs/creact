/**
 * Samples for the ErrorBoundary API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { ErrorBoundary, useAsyncOutput } from "@creact-labs/creact";

function ErrorMessage(_props: { message: string }) {
  return <></>;
}

function RiskyComponent() {
  return <></>;
}

function generateContent(): string {
  return "<h1>Blog</h1>";
}

/** One deployed static site; its handler may throw during deployment */
function WebSite(props: { name: string; content: () => string }) {
  useAsyncOutput(props, async (p, setOutputs) => {
    setOutputs({ url: `https://${p.name}.example.com`, html: p.content() });
  });
  return <></>;
}

export function hero() {
  return (
    // #region hero
    <ErrorBoundary fallback={(err, reset) => <ErrorMessage message={err.message} />}>
      <RiskyComponent />
    </ErrorBoundary>
    // #endregion hero
  );
}

export function usage() {
  return (
    // #region usage
    <ErrorBoundary
      fallback={(err, reset) => {
        console.error("Deployment failed:", err);
        // Call reset() to clear the error and re-render children
        return <></>;
      }}
    >
      <WebSite key="blog" name="blog" content={generateContent} />
    </ErrorBoundary>
    // #endregion usage
  );
}
