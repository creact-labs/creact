import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../components/docs/ApiSignature";
import Callout from "../../../components/docs/Callout";

const MemoryOverview: Component = () => {
  return (
    <>
      <h1>Memory</h1>
      <p class="docs-description">
        CReact requires a Memory implementation to persist state between runs. You provide your own.
      </p>

      <DocHeading level={2} id="why-memory">Why Memory?</DocHeading>
      <p>
        CReact components manage long-running resources (servers, databases, cloud infrastructure).
        When the process restarts, the runtime needs to know what was previously deployed so it can
        reconcile the difference rather than re-create everything.
      </p>
      <p>
        The <code>Memory</code> interface is how CReact reads and writes this state. CReact does not
        ship a built-in implementation. You choose the storage backend that fits your use case.
      </p>

      <Callout type="warning">
        <p>
          Memory is <strong>required</strong>. The <code>render()</code> function expects a
          Memory implementation as its second argument.
        </p>
      </Callout>

      <DocHeading level={2} id="interface">Interface</DocHeading>
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

      <DocHeading level={3} id="required-methods">Required Methods</DocHeading>
      <table>
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr>
            <td><code>getState(stackName)</code></td>
            <td>Load previously saved state. Return <code>null</code> on first run.</td>
          </tr>
          <tr>
            <td><code>saveState(stackName, state)</code></td>
            <td>Persist state after each render cycle.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="optional-methods">Optional Methods</DocHeading>
      <table>
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr>
            <td><code>acquireLock</code></td>
            <td>Prevent concurrent deploys to the same stack. Returns <code>true</code> if acquired.</td>
          </tr>
          <tr>
            <td><code>releaseLock</code></td>
            <td>Release a previously acquired lock.</td>
          </tr>
          <tr>
            <td><code>appendAuditLog</code></td>
            <td>Record deployment events (start, complete, failed, resource changes).</td>
          </tr>
          <tr>
            <td><code>getAuditLog</code></td>
            <td>Retrieve audit log entries for a stack.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <p>
        Pass your implementation as the second argument to <code>render()</code>:
      </p>
      <DocCodeBlock code={`import { render } from '@creact-labs/creact';
import { FileMemory } from './memory';
import { App } from './app';

export default async function() {
  const memory = new FileMemory('./.state');
  return render(() => <App />, memory, 'my-app');
}`} filename="index.tsx" />

      <DocHeading level={2} id="implementations">Implementation Ideas</DocHeading>
      <ul>
        <li><strong>File system:</strong> JSON files on disk. Good for local development.</li>
        <li><strong>DynamoDB:</strong> supports locking via conditional writes.</li>
        <li><strong>S3:</strong> works well for single-deploy pipelines.</li>
        <li><strong>PostgreSQL:</strong> transactional, good for teams with existing databases.</li>
      </ul>
    </>
  );
};

export default MemoryOverview;
