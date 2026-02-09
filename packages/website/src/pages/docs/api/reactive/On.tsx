import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const On: Component = () => {
  return (
    <>
      <h1>on</h1>
      <p class="docs-description">Makes computation dependencies explicit. Track specific signals while reading others untracked.</p>

      <DocCodeBlock code={`createEffect(on(count, (value, prev) => {
  console.log(\`Changed from \${prev} to \${value}\`);
}));`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="on"
        signature="on<S, T>(deps: Accessor<S> | Accessor<any>[], fn: (input: S, prevInput: S | undefined, prevValue: T | undefined) => T, options?: { defer?: boolean }): (prevValue: T | undefined) => T"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>deps</code></td><td><code>Accessor&lt;S&gt; | Accessor[]</code></td><td>Signal(s) to track explicitly.</td></tr>
          <tr><td><code>fn</code></td><td><code>(input, prevInput, prevValue) =&gt; T</code></td><td>Callback. Runs untracked; only <code>deps</code> are tracked.</td></tr>
          <tr><td><code>options.defer</code></td><td><code>boolean</code></td><td>If <code>true</code>, skips the first run.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">Usage</DocHeading>

      <DocHeading level={3} id="single-dep">Single Dependency</DocHeading>
      <DocCodeBlock code={`createEffect(on(count, (value, prev) => {
  console.log(\`count: \${prev} → \${value}\`);
}));`} />

      <DocHeading level={3} id="multiple-deps">Multiple Dependencies</DocHeading>
      <DocCodeBlock code={`createEffect(on([firstName, lastName], ([first, last], prev) => {
  console.log(\`Name: \${first} \${last}\`);
}));`} />

      <DocHeading level={3} id="deferred">Deferred Execution</DocHeading>
      <DocCodeBlock code={`createEffect(on(count, (value) => {
  // Skips initial run, only fires on changes
  console.log('Changed to:', value);
}, { defer: true }));`} />
    </>
  );
};

export default On;
