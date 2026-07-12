import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const ErrorBoundaryApi: Component = () => {
  return (
    <>
      <h1>ErrorBoundary</h1>
      <p class="docs-description">
        Catches errors thrown in child components and renders a fallback.
      </p>

      <DocCodeBlock
        code={`<ErrorBoundary fallback={(err, reset) => <p>Error: {err.message}</p>}>
  <RiskyComponent />
</ErrorBoundary>`}
      />

      <ApiReference
        name="ErrorBoundary"
        signature="ErrorBoundary(props: { fallback: MaybeAccessor<CReactNode> | ((err: any, reset: () => void) => CReactNode); children: MaybeAccessor<CReactNode> }): JSXElement"
      />

      <DocHeading level={3} id="props">
        Props
      </DocHeading>
      <DocTable
        headers={["Prop", "Type", "Description"]}
        rows={[
          [<><code>fallback</code></>, <><code>
                MaybeAccessor&lt;CReactNode&gt; | ((err: any, reset: () =&gt;
                void) =&gt; CReactNode)
              </code></>, "Static fallback or render function called with the caught error and a reset function."],
          [<><code>children</code></>, <><code>MaybeAccessor&lt;CReactNode&gt;</code></>, "Content to render. Errors in this subtree are caught."],
        ]}
      />

      <UsageSection
        code={`<ErrorBoundary fallback={(err, reset) => {
  console.error('Deployment failed:', err);
  // Call reset() to clear the error and re-render children
  return <></>;
}}>
  <WebSite name="blog" content={generateContent} />
</ErrorBoundary>`}
      />
    </>
  );
};

export default ErrorBoundaryApi;
