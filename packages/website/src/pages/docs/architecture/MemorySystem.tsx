import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../components/docs/ApiSignature";
import Callout from "../../../components/docs/Callout";

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
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>getState(stackName)</code>
            </td>
            <td>
              Retrieve previously saved state. Return <code>null</code> on first
              run.
            </td>
          </tr>
          <tr>
            <td>
              <code>saveState(stackName, state)</code>
            </td>
            <td>Persist the current state after each render cycle.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="optional-methods">
        Optional Methods
      </DocHeading>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>acquireLock(stackName, holder, ttlSeconds)</code>
            </td>
            <td>
              Acquire a deploy lock to prevent concurrent deploys. Returns{" "}
              <code>true</code> if acquired.
            </td>
          </tr>
          <tr>
            <td>
              <code>releaseLock(stackName)</code>
            </td>
            <td>Release a previously acquired lock.</td>
          </tr>
          <tr>
            <td>
              <code>appendAuditLog(stackName, entry)</code>
            </td>
            <td>Append an entry to the deployment audit trail.</td>
          </tr>
          <tr>
            <td>
              <code>getAuditLog(stackName, limit?)</code>
            </td>
            <td>Retrieve audit log entries for a stack.</td>
          </tr>
        </tbody>
      </table>

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
      <table>
        <thead>
          <tr>
            <th>Backend</th>
            <th>Best For</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Local files</strong>
            </td>
            <td>Development, single-machine deploys</td>
          </tr>
          <tr>
            <td>
              <strong>DynamoDB</strong>
            </td>
            <td>
              Serverless, low-latency, supports conditional writes for locking
            </td>
          </tr>
          <tr>
            <td>
              <strong>S3</strong>
            </td>
            <td>Large state files, cheap storage</td>
          </tr>
          <tr>
            <td>
              <strong>PostgreSQL</strong>
            </td>
            <td>Transactional, native audit log support</td>
          </tr>
          <tr>
            <td>
              <strong>Redis</strong>
            </td>
            <td>Fast, TTL-based cleanup for short-lived stacks</td>
          </tr>
        </tbody>
      </table>

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
