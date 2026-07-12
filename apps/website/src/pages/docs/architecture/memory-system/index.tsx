import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

const MemorySystem: Component = () => {
  return (
    <>
      <h1>Memory System</h1>
      <p class="docs-description">
        The Memory interface persists deployment state to disk, a database, or
        any backend.
      </p>

      <DocHeading level={2} id="overview">
        Overview
      </DocHeading>
      <p>
        Every <code>render()</code> call requires a <code>Memory</code>{" "}
        implementation. The runtime calls <code>getState</code> at startup to
        restore previous state and <code>saveState</code> after each render
        cycle to persist changes. CReact does not provide a built-in
        implementation. You bring your own.
      </p>

      <DocHeading level={2} id="interface">
        The Memory Interface
      </DocHeading>
      <ApiSignature
        name="Memory"
        signature={`interface Memory {
  // Required
  getState(stackName: string): Promise<DeploymentState | null>;
  saveState(stackName: string, state: DeploymentState): Promise<void>;

  // Optional
  acquireLock?(stackName: string, holder: string, ttlSeconds: number): Promise<boolean>;
  releaseLock?(stackName: string): Promise<void>;
  appendAuditLog?(stackName: string, entry: AuditLogEntry): Promise<void>;
  getAuditLog?(stackName: string, limit?: number): Promise<AuditLogEntry[]>;
}`}
      />

      <DocHeading level={3} id="required-methods">
        Required Methods
      </DocHeading>
      <DocTable
        headers={["Method", "Description"]}
        rows={[
          [<><code>getState(stackName)</code></>, <>Retrieve previously saved state. Return <code>null</code> on first
              run.</>],
          [<><code>saveState(stackName, state)</code></>, "Persist the current state after each render cycle."],
        ]}
      />

      <DocHeading level={3} id="optional-methods">
        Optional Methods
      </DocHeading>
      <DocTable
        headers={["Method", "Description"]}
        rows={[
          [<><code>acquireLock(stackName, holder, ttlSeconds)</code></>, <>Acquire a deploy lock to prevent concurrent deploys. Returns{" "}
              <code>true</code> if acquired.</>],
          [<><code>releaseLock(stackName)</code></>, "Release a previously acquired lock."],
          [<><code>appendAuditLog(stackName, entry)</code></>, "Append an entry to the deployment audit trail."],
          [<><code>getAuditLog(stackName, limit?)</code></>, "Retrieve audit log entries for a stack."],
        ]}
      />

      <DocHeading level={2} id="deployment-state">
        DeploymentState
      </DocHeading>
      <p>
        The state object contains the full snapshot of all nodes, their props,
        outputs, and deployment status.
      </p>
      <DocCodeBlock
        code={`interface DeploymentState {
  nodes: SerializedNode[];
  status: "pending" | "applying" | "deployed" | "failed";
  applyingNodeId?: string;   // For crash recovery
  stackName: string;
  lastDeployedAt: number;
  user?: string;
  storeValues?: Record<string, any>; // For createStore hydration
}`}
        filename="Types"
      />

      <DocHeading level={3} id="serialized-node">
        SerializedNode
      </DocHeading>
      <DocCodeBlock
        code={`interface SerializedNode {
  id: string;
  path: string[];
  props: Record<string, any>;
  outputs?: Record<string, any>;
  state?: "pending" | "applying" | "deployed" | "failed";
  store?: any;
}`}
        filename="Types"
      />

      <DocHeading level={3} id="audit-log-entry">
        AuditLogEntry
      </DocHeading>
      <DocCodeBlock
        code={`interface AuditLogEntry {
  timestamp: number;
  action:
    | "deploy_start"
    | "deploy_complete"
    | "deploy_failed"
    | "resource_applied"
    | "resource_destroyed";
  nodeId?: string;
  details?: Record<string, any>;
  user?: string;
}`}
        filename="Types"
      />

      <DocHeading level={2} id="lifecycle">
        How Memory Fits the Lifecycle
      </DocHeading>
      <ol>
        <li>
          <code>render()</code> is called with your Memory implementation
        </li>
        <li>
          Runtime calls <code>memory.getState(stackName)</code> to load previous
          state
        </li>
        <li>
          Saved output values are hydrated into nodes (so child components can
          read them immediately)
        </li>
        <li>
          <code>createStore</code> values are hydrated from{" "}
          <code>storeValues</code>
        </li>
        <li>The reconciler diffs new JSX tree against saved nodes</li>
        <li>
          Handlers re-run for all nodes to re-establish side effects. They
          receive previously saved outputs and should be idempotent
        </li>
        <li>
          After the cycle, <code>memory.saveState(stackName, state)</code>{" "}
          persists the result
        </li>
      </ol>

      <DocHeading level={2} id="crash-recovery">
        Crash Recovery
      </DocHeading>
      <p>
        If the process crashes mid-deploy, <code>applyingNodeId</code> records
        which node was in progress. On restart, the runtime resumes from that
        node instead of starting over.
      </p>

      <DocHeading level={2} id="what-memory-enables">
        What Memory Enables
      </DocHeading>
      <ul>
        <li>
          <strong>Crash recovery:</strong> nodes with saved outputs are treated
          as deployed
        </li>
        <li>
          <strong>Incremental deploys:</strong> only changed resources are
          re-applied
        </li>
        <li>
          <strong>Store hydration:</strong> <code>createStore</code> values
          restored on restart
        </li>
        <li>
          <strong>Drift detection:</strong> compare expected state vs actual
        </li>
        <li>
          <strong>Concurrency protection:</strong> optional locking prevents
          parallel deploys
        </li>
        <li>
          <strong>Audit trail:</strong> optional logging tracks deployment
          history
        </li>
      </ul>

      <DocHeading level={2} id="backend-options">
        Backend Options
      </DocHeading>
      <p>
        The interface works with any storage backend. Common implementations:
      </p>
      <DocTable
        headers={["Backend", "Best For"]}
        rows={[
          [<><strong>Local files</strong></>, "Development, single-machine deploys"],
          [<><strong>DynamoDB</strong></>, "Serverless, low-latency, supports conditional writes for locking"],
          [<><strong>S3</strong></>, "Large state files, cheap storage"],
          [<><strong>PostgreSQL</strong></>, "Transactional, native audit log support"],
          [<><strong>Redis</strong></>, "Fast, TTL-based cleanup for short-lived stacks"],
        ]}
      />

      <Callout type="tip">
        <p>
          For a minimal working example, see{" "}
          <a href="#/docs/getting-started/state-and-memory">
            Getting Started: State and Memory
          </a>
          .
        </p>
      </Callout>
    </>
  );
};

export default MemorySystem;
