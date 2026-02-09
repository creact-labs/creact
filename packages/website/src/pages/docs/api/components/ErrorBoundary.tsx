import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const ErrorBoundaryApi: Component = () => {
  return (
    <>
      <h1>ErrorBoundary</h1>
      <p class="docs-description">Catches errors thrown in child components and renders a fallback.</p>

      <DocCodeBlock code={`<ErrorBoundary fallback={(err, reset) => <p>Error: {err.message}</p>}>
  <RiskyComponent />
</ErrorBoundary>`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="ErrorBoundary"
        signature="ErrorBoundary(props: { fallback: MaybeAccessor<CReactNode> | ((err: any, reset: () => void) => CReactNode); children: MaybeAccessor<CReactNode> }): JSXElement"
      />

      <DocHeading level={3} id="props">Props</DocHeading>
      <table>
        <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>fallback</code></td><td><code>MaybeAccessor&lt;CReactNode&gt; | ((err: any, reset: () =&gt; void) =&gt; CReactNode)</code></td><td>Static fallback or render function called with the caught error and a reset function.</td></tr>
          <tr><td><code>children</code></td><td><code>MaybeAccessor&lt;CReactNode&gt;</code></td><td>Content to render. Errors in this subtree are caught.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`<ErrorBoundary fallback={(err, reset) => {
  console.error('Deployment failed:', err);
  // Call reset() to clear the error and re-render children
  return <></>;
}}>
  <WebSite name="blog" content={generateContent} />
</ErrorBoundary>`} />
    </>
  );
};

export default ErrorBoundaryApi;
