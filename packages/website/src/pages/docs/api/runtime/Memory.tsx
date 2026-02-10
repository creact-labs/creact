import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const MemoryApi: Component = () => {
  return (
    <>
      <h1>Memory</h1>
      <p class="docs-description">
        The Memory interface defines how CReact persists state between runs.
      </p>

      <DocHeading level={2} id="reference">
        Reference
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

      <DocHeading level={3} id="methods">
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
              Retrieve previously saved state. Return <code>null</code> for
              first run.
            </td>
          </tr>
          <tr>
            <td>
              <code>saveState(stackName, state)</code>
            </td>
            <td>Persist the current state after a render cycle.</td>
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
            <td>Acquire a deploy lock to prevent concurrent deploys.</td>
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

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`import type { Memory, DeploymentState } from '@creact-labs/creact';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

class FileMemory implements Memory {
  constructor(private dir: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      return JSON.parse(await readFile(join(this.dir, \`\${stackName}.json\`), 'utf-8'));
    } catch {
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, \`\${stackName}.json\`), JSON.stringify(state, null, 2));
  }
}`}
        filename="memory.ts"
      />
    </>
  );
};

export default MemoryApi;
