/**
 * Samples for the Runtime Boundaries architecture page. Each region is
 * displayed by the website; the stubs around them keep every fragment
 * compiling against the real library.
 */
import {
  type CReactNode,
  createSignal,
  type DeploymentState,
  type Memory,
  Show,
  useAsyncOutput,
} from "@creact-labs/creact";

/** Stub root component for the tenant universes below */
function App(_props: { region?: string }) {
  return <></>;
}

// Minimal in-memory ledger used by the fleet and detach samples
import { createMemory } from "@creact-labs/example-memory";

const tenantBMemory = createMemory();

// #region fleet
import { createRuntime } from "@creact-labs/creact";

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
}
// #endregion fleet

/** Stub universes for the recursion sample */
function Region() {
  return <></>;
}
function Platform() {
  return <></>;
}

// #region recursion
const RegionRuntime = createRuntime(Region);
const FleetRuntime = createRuntime(Fleet); // Fleet mounts RegionRuntime
const PlatformRuntime = createRuntime(Platform); // Platform mounts FleetRuntime

// platform-runtime-prod → fleet-runtime-us → region-runtime-us-east-1
<PlatformRuntime key="prod" />;
// #endregion recursion

const [, setShowTenant] = createSignal(true);
const tenantMemory = createMemory();
const emptyState: DeploymentState = {
  nodes: [],
  status: "deployed",
  stackName: "app-runtime-tenant-a",
  lastDeployedAt: Date.now(),
};

export async function detachVsDestroy() {
  // #region detach-vs-destroy
  // Detach: stop managing, keep the ledger
  setShowTenant(false); // <Show> unmounts the wrapper → child disposes

  // Resume: re-mount and the child re-hydrates from its ledger
  setShowTenant(true);

  // Destroy: an explicit act against the child's own Memory.
  // TenantApp = createRuntime(App), so key="tenant-a" addresses the
  // ledger as app-runtime-tenant-a (kebab of "AppRuntime" plus the key).
  await tenantMemory.saveState("app-runtime-tenant-a", emptyState);
  // #endregion detach-vs-destroy
}

/** Stub server for the publishing-node sample */
async function listen(port: number): Promise<{ url: string; close(): void }> {
  return { url: `http://localhost:${port}`, close() {} };
}

// #region publishing-node
// The publisher: a node whose address is the contract
function Api() {
  useAsyncOutput({ port: 3000 }, async (p, setOutputs) => {
    const server = await listen(p.port);
    setOutputs({ url: server.url }); // published at "api-public"
    return () => server.close();
  });
  return <></>;
}
<Api key="public" />;
// #endregion publishing-node

/** Stub consumer for the cross-ledger sample */
function Consumer(_props: { endpoint: string }) {
  return <></>;
}

const sharedMemory = createMemory();

// #region cross-ledger
interface RemoteRefProps {
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
</RemoteRef>;
// #endregion cross-ledger

// #region remote-transport
class HttpMemory implements Memory {
  constructor(private baseUrl: string) {}
  async getState(stackName: string) {
    const res = await fetch(`${this.baseUrl}/state/${stackName}`);
    return res.ok ? res.json() : null;
  }
  async saveState(stackName: string, state: DeploymentState) {
    await fetch(`${this.baseUrl}/state/${stackName}`, {
      method: "PUT",
      body: JSON.stringify(state),
    });
  }
}

// A child universe whose ledger lives across the network
<TenantApp key="edge" memory={new HttpMemory("https://ledger.example.com")} />;
// #endregion remote-transport
