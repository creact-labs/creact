import type { Component } from "solid-js";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

const RuntimeBoundaries: Component = () => {
  return (
    <>
      <h1>Runtime Boundaries</h1>
      <p class="docs-description">
        <code>createRuntime</code> mounts a component tree as its own
        sovereign runtime: its own ledger, its own lock, its own failure
        domain. Stacks spawn stacks — the deployer and the deployed are the
        same substance.
      </p>

      <DocHeading level={2} id="the-sovereignty-model">
        The Sovereignty Model
      </DocHeading>
      <p>
        A runtime boundary is a line in the component tree with precise
        semantics. Everything inside it belongs to a child universe;
        everything outside sees only a single node.
      </p>
      <DocTable
        headers={["Aspect", "Semantics"]}
        rows={[
          [
            <>
              <strong>Own ledger</strong>
            </>,
            <>
              The child persists to its own stack, named by the wrapper
              node's path+key address. Omit <code>memory</code> to inherit
              the parent's backend; supply one for a fully sovereign ledger.
            </>,
          ],
          [
            <>
              <strong>Own lock</strong>
            </>,
            <>
              The child runtime acquires its own deployment lock on its own
              stack name — concurrent deploys of the same child universe are
              excluded independently of the parent.
            </>,
          ],
          [
            <>
              <strong>Own failure domain</strong>
            </>,
            <>
              Child deployment failure and lock-acquisition failure surface
              on the wrapper node's outputs (<code>status</code>,{" "}
              <code>error</code>, <code>ready</code>) as data. A child
              universe can never throw through the parent's executor.
            </>,
          ],
          [
            <>
              <strong>Sealed: context</strong>
            </>,
            <>
              Parent providers are invisible inside the boundary. The root
              component's props are the entire boundary contract, statically
              typed.
            </>,
          ],
          [
            <>
              <strong>Crosses: props</strong>
            </>,
            <>
              Props pass through verbatim — values, callbacks, accessors —
              exactly as at any component boundary. Receiver contracts
              govern; there is no introspection, per-prop tracking, or
              snapshotting.
            </>,
          ],
        ]}
      />
      <DocCodeBlock
        code={`import { createRuntime } from '@creact-labs/creact';

const TenantApp = createRuntime(App);

function Fleet() {
  return (
    <>
      {/* Inherits the parent's Memory backend */}
      <TenantApp key="tenant-a" region="us-east-1" />
      {/* Keeps a sovereign ledger */}
      <TenantApp key="tenant-b" region="eu-west-1" memory={tenantBMemory} />
    </>
  );
}`}
        filename="fleet.tsx"
      />
      <p>
        In-process reactivity crosses the boundary through the shared
        tracking graph: pass an accessor as a prop and the child's resources
        re-run when it changes, while each runtime's flush reconciles only
        its own tree. Values a child resource consumes persist in the
        child's ledger through the same point-of-use serialization as
        everywhere else — there is no boundary-level persistence mechanism.
      </p>

      <DocHeading level={2} id="recursion">
        Stacks Spawn Stacks
      </DocHeading>
      <p>
        The deployer and the deployed are the same substance. A CReact app
        is a runtime managing resources; <code>createRuntime</code> makes a
        runtime one of those resources. The wrapper is an ordinary
        component in the <code>Show</code>/<code>For</code> family, built
        entirely on <code>useAsyncOutput</code> and <code>render()</code> —
        no renderer intrinsics. Nesting composes to arbitrary depth, and one
        identity scheme addresses every level: the wrapper node's path+key
        address is the child's stack name.
      </p>
      <DocCodeBlock
        code={`const RegionRuntime = createRuntime(Region);
const FleetRuntime = createRuntime(Fleet);       // Fleet mounts RegionRuntime
const PlatformRuntime = createRuntime(Platform); // Platform mounts FleetRuntime

// platform-runtime-prod → fleet-runtime-us → region-runtime-us-east-1
<PlatformRuntime key="prod" />`}
      />

      <DocHeading level={2} id="detach-vs-destroy">
        Detach vs. Destroy
      </DocHeading>
      <p>
        Removing the JSX (or disposing the parent) <em>detaches</em> the
        child: its cleanup functions run, its runtime stops, and its ledger
        persists untouched. Re-mounting re-hydrates from that ledger and
        re-converges. Destroying a child universe is only ever an explicit
        act against its own Memory — never a side effect of removing JSX.
      </p>
      <DocCodeBlock
        code={`// Detach: stop managing, keep the ledger
setShowTenant(false); // <Show> unmounts the wrapper → child disposes

// Resume: re-mount and the child re-hydrates from its ledger
setShowTenant(true);

// Destroy: an explicit act against the child's own Memory.
// TenantApp = createRuntime(App), so key="tenant-a" addresses the
// ledger as app-runtime-tenant-a (kebab of "AppRuntime" plus the key).
await tenantMemory.saveState('app-runtime-tenant-a', emptyState);`}
      />
      <Callout type="warning">
        <p>
          Deleting a wrapper node tears down the wrapper's handler — not the
          child's resources. If a child universe should release real
          infrastructure, drive that from inside the child (or against its
          Memory) before detaching.
        </p>
      </Callout>

      <DocHeading level={2} id="publishing-node">
        Recipe: the Publishing Node
      </DocHeading>
      <p>
        A node with a stable address is a public interface. Because
        addresses are deterministic (resource path + key), another app — or
        a later boot of the same app — can read a node's outputs straight
        from the ledger without sharing any code.
      </p>
      <DocCodeBlock
        code={`// The publisher: a node whose address is the contract
function Api() {
  useAsyncOutput({ port: 3000 }, async (p, setOutputs) => {
    const server = await listen(p.port);
    setOutputs({ url: server.url }); // published at "api-public"
    return () => server.close();
  });
  return <></>;
}
<Api key="public" />`}
        filename="publisher.tsx"
      />

      <DocHeading level={2} id="cross-ledger-reference">
        Recipe: Cross-Ledger Reference
      </DocHeading>
      <p>
        Two apps that don't share code can still share state: one reads the
        other's ledger through the Memory interface and serves the values it
        finds as reactive outputs.
      </p>
      <DocCodeBlock
        code={`interface RemoteRefProps {
  memory: Memory;
  stack: string;
  node: string;
  children: (url: () => string) => CReactNode;
}

function RemoteRef(props: RemoteRefProps) {
  const ref = useAsyncOutput(props, async (p, setOutputs) => {
    const poll = async () => {
      const state = await p.memory.getState(p.stack);
      const node = state?.nodes.find((n) => n.id === p.node);
      if (node?.outputs) setOutputs(node.outputs);
    };
    await poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  });
  return <Show when={() => ref.url()}>{(url) => props.children(url)}</Show>;
}

// Reference the publisher's node from a different app
<RemoteRef key="api" memory={sharedMemory} stack="prod-api" node="api-public">
  {(url) => <Consumer key="c" endpoint={url()} />}
</RemoteRef>`}
        filename="cross-ledger.tsx"
      />

      <DocHeading level={2} id="remote-transport">
        Recipe: Remote Transport
      </DocHeading>
      <p>
        The Memory interface is the wire format. Implement it over any
        transport — HTTP, a queue, a database — and a runtime on one machine
        can host the ledger of a universe running on another. The runtime
        never knows the difference.
      </p>
      <DocCodeBlock
        code={`class HttpMemory implements Memory {
  constructor(private baseUrl: string) {}
  async getState(stackName: string) {
    const res = await fetch(\`\${this.baseUrl}/state/\${stackName}\`);
    return res.ok ? res.json() : null;
  }
  async saveState(stackName: string, state: DeploymentState) {
    await fetch(\`\${this.baseUrl}/state/\${stackName}\`, {
      method: 'PUT',
      body: JSON.stringify(state),
    });
  }
}

// A child universe whose ledger lives across the network
<TenantApp key="edge" memory={new HttpMemory('https://ledger.example.com')} />`}
        filename="http-memory.ts"
      />
    </>
  );
};

export default RuntimeBoundaries;
