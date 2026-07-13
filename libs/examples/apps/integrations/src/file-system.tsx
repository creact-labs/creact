/**
 * Samples for the File System guide: reactive Read/Write components and a
 * file-backed Memory implementation, built on real Node.js APIs.
 */
import {
  type Accessor,
  access,
  type CReactNode,
  createEffect,
  createSignal,
  type DeploymentState,
  type MaybeAccessor,
  type Memory,
  Show,
  untrack,
} from "@creact-labs/creact";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
// Local stand-in for the AI guide's GenerateHtml — importing it from
// ai-integration.tsx would close an import cycle (that module composes
// its pipeline from Read/Write below)
function GenerateHtml(_props: {
  existingContent: Accessor<string>;
  prompt: MaybeAccessor<string>;
  onGenerated: (content: string) => void;
}) {
  return <></>;
}

// #region read-component
interface ReadProps {
  path: string;
  file: string;
  children: (content: Accessor<string>) => CReactNode;
}

export function Read(props: ReadProps) {
  const [content, setContent] = createSignal("");
  const fullPath = join(props.path, props.file);

  if (existsSync(fullPath)) {
    setContent(readFileSync(fullPath, "utf-8"));
  }

  return <>{props.children(content)}</>;
}
// #endregion read-component

// #region write-component
interface WriteProps {
  path: string;
  file: string;
  content: MaybeAccessor<string>;
  onWritten?: (filePath: string) => void;
}

/** Only write real content, and only when it actually changed */
function shouldWrite(content: string, lastWritten: string): boolean {
  if (!content) return false;
  return content !== lastWritten;
}

export function Write(props: WriteProps) {
  const [lastWritten, setLastWritten] = createSignal("");

  createEffect(() => {
    const content = access(props.content);
    const last = untrack(() => lastWritten());
    if (!shouldWrite(content, last)) return;

    setLastWritten(content);

    const fullPath = join(props.path, props.file);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);

    props.onWritten?.(fullPath);
  });

  return <></>;
}
// #endregion write-component

// #region usage
function App() {
  const [content, setContent] = createSignal("");

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
            onWritten={(path) => console.log("Wrote", path)}
          />
        )}
      </Show>
    </>
  );
}
// #endregion usage

// #region file-memory
export class FileMemory implements Memory {
  constructor(private directory: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      const path = join(this.directory, `${stackName}.json`);
      return JSON.parse(await readFile(path, "utf-8"));
    } catch {
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, `${stackName}.json`);
    await writeFile(path, JSON.stringify(state, null, 2));
  }
}
// #endregion file-memory

export { App };
