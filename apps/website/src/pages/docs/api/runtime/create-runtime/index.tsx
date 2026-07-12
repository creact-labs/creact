import type { Component } from "solid-js";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocTable from "@/shared/components/doc-table";
import UsageSection from "@/shared/components/usage-section";

const CreateRuntime: Component = () => {
  return (
    <>
      <h1>createRuntime</h1>
      <p class="docs-description">
        Wraps a root component so that mounting it boots a child runtime
        with its own ledger, its own lock, and its own failure domain.
      </p>

      <DocCodeBlock
        code={`import { createRuntime } from '@creact-labs/creact';

const TenantApp = createRuntime(App);

<TenantApp key="tenant-a" region="us-east-1" />`}
      />

      <ApiReference
        name="createRuntime"
        signature="createRuntime<P>(Root: (props: P) => CReactNode): (props: P & { memory?: Memory }) => CReactNode"
        parameters={[
          [
            <>
              <code>Root</code>
            </>,
            <>
              <code>(props: P) =&gt; CReactNode</code>
            </>,
            "Required. The child universe's root component. Its props are the entire boundary contract.",
          ],
        ]}
        returns={
          <p>
            A component accepting <code>Root</code>'s props plus an optional{" "}
            <code>memory</code>. A <code>key</code> is required, as for any
            resource component — the wrapper node's path+key address becomes
            the child's stack name and ledger name.
          </p>
        }
      />

      <UsageSection
        code={`const TenantApp = createRuntime(App);

function Fleet() {
  return (
    <>
      {/* memory omitted → inherits the parent runtime's backend */}
      <TenantApp key="tenant-a" region="us-east-1" />
      {/* memory supplied → sovereign ledger */}
      <TenantApp key="tenant-b" region="eu-west-1" memory={tenantBMemory} />
    </>
  );
}`}
        filename="fleet.tsx"
      >
        <p>
          All other <code>RenderOptions</code> (<code>user</code>,{" "}
          <code>enableAuditLog</code>, <code>lockTtlSeconds</code>,{" "}
          <code>maxHandlerExecutions</code>) inherit from the parent
          runtime. The wrapper node's outputs are runtime-provided only:
        </p>
        <DocTable
          headers={["Output", "Type", "Meaning"]}
          rows={[
            [
              <>
                <code>status</code>
              </>,
              <>
                <code>"deploying" | "ready" | "failed"</code>
              </>,
              "The child universe's deployment state.",
            ],
            [
              <>
                <code>ready</code>
              </>,
              <>
                <code>boolean</code>
              </>,
              "True once the child's initial deployment completed.",
            ],
            [
              <>
                <code>error</code>
              </>,
              <>
                <code>string | undefined</code>
              </>,
              "Set when the child failed — deployment errors and lock-acquisition failures surface here as data; they never throw through the parent's executor.",
            ],
          ]}
        />
        <Callout type="info">
          <p>
            Unmounting the wrapper (or disposing the parent){" "}
            <em>detaches</em> the child: its ledger persists, and
            re-mounting re-hydrates and re-converges. Parent context does
            not cross the boundary; props cross verbatim, exactly as at any
            component boundary. See{" "}
            <a href="#/docs/architecture/runtime-boundaries">
              Runtime Boundaries
            </a>{" "}
            for the full sovereignty model.
          </p>
        </Callout>
      </UsageSection>
    </>
  );
};

export default CreateRuntime;
