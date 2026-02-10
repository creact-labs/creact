import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const FileMemory: Component = () => {
  return (
    <>
      <h1>File Memory</h1>
      <p class="docs-description">
        A reference Memory implementation that persists state as JSON files on
        disk.
      </p>

      <DocHeading level={2} id="implementation">
        Implementation
      </DocHeading>
      <DocCodeBlock
        code={`import type { Memory, DeploymentState } from '@creact-labs/creact';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class FileMemory implements Memory {
  constructor(private dir: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      const data = await readFile(
        join(this.dir, \`\${stackName}.json\`),
        'utf-8'
      );
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      join(this.dir, \`\${stackName}.json\`),
      JSON.stringify(state, null, 2)
    );
  }
}`}
        filename="src/memory.ts"
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`import { render } from '@creact-labs/creact';
import { FileMemory } from './src/memory';
import { App } from './src/app';

export default async function() {
  const memory = new FileMemory('./.state');
  return render(() => <App />, memory, 'my-app');
}`}
        filename="index.tsx"
      />

      <DocHeading level={2} id="state-directory">
        State Directory
      </DocHeading>
      <p>
        State files are saved as <code>{`<stackName>.json`}</code> in the
        directory you specify. Add this directory to <code>.gitignore</code>:
      </p>
      <DocCodeBlock lang="bash" code={`.state/`} filename=".gitignore" />

      <DocHeading level={2} id="with-locking">
        Adding Lock Support
      </DocHeading>
      <p>
        For single-machine deploys, file-based locking prevents concurrent runs
        from corrupting state:
      </p>
      <DocCodeBlock
        code={`import { writeFile, unlink, stat } from 'fs/promises';
import { join } from 'path';

export class FileMemoryWithLock extends FileMemory {
  async acquireLock(
    stackName: string,
    holder: string,
    ttlSeconds: number
  ): Promise<boolean> {
    const lockPath = join(this.dir, \`\${stackName}.lock\`);
    try {
      const info = await stat(lockPath);
      const age = (Date.now() - info.mtimeMs) / 1000;
      if (age < ttlSeconds) return false; // still locked
    } catch {
      // no lock file, proceed
    }
    await writeFile(lockPath, JSON.stringify({ holder, at: Date.now() }));
    return true;
  }

  async releaseLock(stackName: string): Promise<void> {
    try {
      await unlink(join(this.dir, \`\${stackName}.lock\`));
    } catch {
      // already released
    }
  }
}`}
        filename="src/memory.ts"
      />

      <Callout type="info">
        <p>
          File-based locking is advisory. It won't prevent a second process that
          ignores locks. For production, use DynamoDB conditional writes or
          database row locking.
        </p>
      </Callout>
    </>
  );
};

export default FileMemory;
