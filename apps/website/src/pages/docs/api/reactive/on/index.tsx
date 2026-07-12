import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const On: Component = () => {
  return (
    <>
      <h1>on</h1>
      <p class="docs-description">
        Makes computation dependencies explicit. Track specific signals while
        reading others untracked.
      </p>

      <DocCodeBlock
        code={`createEffect(on(count, (value, prev) => {
  console.log(\`Changed from \${prev} to \${value}\`);
}));`}
      />

      <ApiReference
        name="on"
        signature="on<S, T>(deps: Accessor<S> | Accessor<any>[], fn: (input: S, prevInput: S | undefined, prevValue: T | undefined) => T, options?: { defer?: boolean }): (prevValue: T | undefined) => T"
        parameters={[
          [<><code>deps</code></>, <><code>Accessor&lt;S&gt; | Accessor[]</code></>, "Signal(s) to track explicitly."],
          [<><code>fn</code></>, <><code>(input, prevInput, prevValue) =&gt; T</code></>, <>Callback. Runs untracked; only <code>deps</code> are tracked.</>],
          [<><code>options.defer</code></>, <><code>boolean</code></>, <>If <code>true</code>, skips the first run.</>],
        ]}
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>

      <DocHeading level={3} id="single-dep">
        Single Dependency
      </DocHeading>
      <DocCodeBlock
        code={`createEffect(on(count, (value, prev) => {
  console.log(\`count: \${prev} → \${value}\`);
}));`}
      />

      <DocHeading level={3} id="multiple-deps">
        Multiple Dependencies
      </DocHeading>
      <DocCodeBlock
        code={`createEffect(on([firstName, lastName], ([first, last], prev) => {
  console.log(\`Name: \${first} \${last}\`);
}));`}
      />

      <DocHeading level={3} id="deferred">
        Deferred Execution
      </DocHeading>
      <DocCodeBlock
        code={`createEffect(on(count, (value) => {
  // Skips initial run, only fires on changes
  console.log('Changed to:', value);
}, { defer: true }));`}
      />
    </>
  );
};

export default On;
