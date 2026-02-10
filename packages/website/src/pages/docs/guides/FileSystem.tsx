import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";

const FileSystem: Component = () => {
  return (
    <>
      <h1>File System Operations</h1>
      <p class="docs-description">
        Build reactive file read and write components using Node.js APIs.
      </p>

      <DocHeading level={2} id="read-component">
        Read Component
      </DocHeading>
      <p>
        The <code>Read</code> component loads a file and passes its content as
        an accessor to a render callback. Children receive the content
        reactively.
      </p>
      <DocCodeBlock
        code={`import { createSignal, type Accessor, type CReactNode } from '@creact-labs/creact';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ReadProps {
  path: string;
  file: string;
  children: (content: Accessor<string>) => CReactNode;
}

export function Read(props: ReadProps) {
  const [content, setContent] = createSignal('');
  const fullPath = join(props.path, props.file);

  if (existsSync(fullPath)) {
    setContent(readFileSync(fullPath, 'utf-8'));
  }

  return <>{props.children(content)}</>;
}`}
        filename="shared/read.tsx"
      />

      <DocHeading level={2} id="write-component">
        Write Component
      </DocHeading>
      <p>
        The <code>Write</code> component watches a content accessor with{" "}
        <code>createEffect</code>. When the content changes, it writes to disk.
        The <code>untrack</code> guard prevents re-writing the same content.
      </p>
      <DocCodeBlock
        code={`import { createEffect, createSignal, untrack, access, type MaybeAccessor } from '@creact-labs/creact';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface WriteProps {
  path: string;
  file: string;
  content: MaybeAccessor<string>;
  onWritten?: (filePath: string) => void;
}

export function Write(props: WriteProps) {
  const [lastWritten, setLastWritten] = createSignal('');

  createEffect(() => {
    const content = access(props.content);
    if (!content) return;

    const last = untrack(() => lastWritten());
    if (content === last) return;

    setLastWritten(content);

    const fullPath = join(props.path, props.file);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);

    props.onWritten?.(fullPath);
  });

  return <></>;
}`}
        filename="shared/write.tsx"
      />

      <DocHeading level={2} id="usage">
        Using Read and Write Together
      </DocHeading>
      <p>
        Compose <code>Read</code> and <code>Write</code> to build pipelines that
        transform file content reactively:
      </p>
      <DocCodeBlock
        code={`import { Show, createSignal } from '@creact-labs/creact';

function App() {
  const [content, setContent] = createSignal('');

  return (
    <>
      <Read path="./input" file="index.html">
        {(existingContent) => (
          <GenerateHtml
            existingContent={existingContent}
            prompt="Add a navigation bar"
            onGenerated={setContent}
          />
        )}
      </Read>
      <Show when={() => content()}>
        {() => (
          <Write
            path="./output"
            file="index.html"
            content={() => content()}
            onWritten={(path) => console.log('Wrote', path)}
          />
        )}
      </Show>
    </>
  );
}`}
        filename="app.tsx"
      />

      <DocHeading level={2} id="file-memory">
        File-Based Memory
      </DocHeading>
      <p>
        The most common file system pattern in CReact is the{" "}
        <code>FileMemory</code> implementation for state persistence:
      </p>
      <DocCodeBlock
        code={`import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Memory, DeploymentState } from '@creact-labs/creact';

export class FileMemory implements Memory {
  constructor(private directory: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      const path = join(this.directory, \`\${stackName}.json\`);
      return JSON.parse(await readFile(path, 'utf-8'));
    } catch {
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, \`\${stackName}.json\`);
    await writeFile(path, JSON.stringify(state, null, 2));
  }
}`}
        filename="src/memory.ts"
      />
    </>
  );
};

export default FileSystem;
