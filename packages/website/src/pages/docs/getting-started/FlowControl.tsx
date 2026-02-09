import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const FlowControl: Component = () => {
  return (
    <>
      <h1>Flow Control</h1>
      <p class="docs-description">
        Show, For, Switch, and ErrorBoundary control which components run based on reactive conditions.
      </p>

      <DocHeading level={2} id="show">Conditional Rendering with Show</DocHeading>
      <p>
        <code>Show</code> renders its children only when the <code>when</code> condition is truthy.
        It can also provide a fallback.
      </p>
      <DocCodeBlock code={`import { Show } from '@creact-labs/creact';

<Show when={() => isReady()} fallback={<Loading />}>
  <App />
</Show>`} />

      <p>You can access the truthy value with a callback child:</p>
      <DocCodeBlock code={`<Show when={() => user()}>
  {(u) => <Profile name={u().name} />}
</Show>`} />

      <DocHeading level={2} id="for">Iterating with For</DocHeading>
      <p>
        <code>For</code> iterates over a reactive list. Each item is keyed by reference.
        When the list changes, only affected items update.
      </p>
      <DocCodeBlock code={`import { For } from '@creact-labs/creact';

<For each={() => sites()}>
  {(site) => (
    <WebSite name={() => site().name} content={() => site().html} />
  )}
</For>`} />

      <DocHeading level={2} id="switch">Multi-way Branching with Switch</DocHeading>
      <p>
        <code>Switch</code> with <code>Match</code> provides multi-branch conditional logic:
      </p>
      <DocCodeBlock code={`import { Switch, Match } from '@creact-labs/creact';

<Switch fallback={<DefaultHandler />}>
  <Match when={() => env() === 'production'}>
    <ProductionDeploy />
  </Match>
  <Match when={() => env() === 'staging'}>
    <StagingDeploy />
  </Match>
</Switch>`} />

      <DocHeading level={2} id="error-boundary">Error Handling with ErrorBoundary</DocHeading>
      <p>
        <code>ErrorBoundary</code> catches errors thrown in child components:
      </p>
      <DocCodeBlock code={`import { ErrorBoundary } from '@creact-labs/creact';

<ErrorBoundary fallback={(err, reset) => <ErrorReport error={err} />}>
  <RiskyOperation />
</ErrorBoundary>`} />

      <Callout type="info">
        <p>
          Flow components take accessor functions (<code>() =&gt; value</code>) for conditions.
          The condition re-evaluates without re-running the parent component.
        </p>
      </Callout>
    </>
  );
};

export default FlowControl;
