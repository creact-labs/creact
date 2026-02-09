import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const StateAndMemory: Component = () => {
  return (
    <>
      <h1>State and Memory</h1>
      <p class="docs-description">
        The Memory interface saves and restores deployment state between runs.
      </p>

      <DocHeading level={2} id="why-persistence">Why Persistence Matters</DocHeading>
      <p>
        CReact apps describe infrastructure and processes. When the app stops and restarts,
        you need to know what was already deployed. Otherwise every restart re-creates
        everything from scratch. The <code>Memory</code> interface solves this by saving
        and restoring deployment state.
      </p>

      <DocHeading level={2} id="memory-interface">The Memory Interface</DocHeading>
      <p>
        <code>render()</code> requires a <code>Memory</code> implementation.
        You implement two methods: <code>getState</code> and <code>saveState</code>.
        CReact does not ship a built-in implementation. You choose the storage backend.
      </p>
      <DocCodeBlock code={`import type { Memory, DeploymentState } from '@creact-labs/creact';

class MyMemory implements Memory {
  async getState(stackName: string): Promise<DeploymentState | null> {
    // Load previously saved state, or null on first run
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    // Persist state after each render cycle
  }
}`} filename="memory.ts" />

      <DocHeading level={2} id="file-memory">FileMemory Example</DocHeading>
      <p>
        The simplest implementation persists state as JSON files on disk:
      </p>
      <DocCodeBlock code={`import type { Memory, DeploymentState } from '@creact-labs/creact';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class FileMemory implements Memory {
  constructor(private dir: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      const data = await readFile(
        join(this.dir, \`\${stackName}.json\`), 'utf-8'
      );
      return JSON.parse(data);
    } catch {
      return null; // First run, no state yet
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(
      join(this.dir, \`\${stackName}.json\`),
      JSON.stringify(state, null, 2)
    );
  }
}`} filename="src/memory.ts" />

      <DocHeading level={2} id="using-memory">Passing Memory to render()</DocHeading>
      <DocCodeBlock code={`import { render } from '@creact-labs/creact';
import { FileMemory } from './src/memory';
import { App } from './src/app';

export default async function() {
  const memory = new FileMemory('./.state');
  return render(() => <App />, memory, 'my-app');
}`} filename="index.tsx" />

      <Callout type="tip">
        <p>
          The third argument to <code>render()</code> is the stack name. It identifies your app's
          state file. Different stack names allow multiple independent state stores.
        </p>
      </Callout>

      <DocHeading level={2} id="useAsyncOutput">Persisting Outputs with useAsyncOutput</DocHeading>
      <p>
        <code>useAsyncOutput</code> creates resources whose outputs CReact persists.
        On restart, the handler receives saved outputs via <code>setOutputs(prev =&gt; ...)</code>.
      </p>
      <DocCodeBlock code={`import { useAsyncOutput, createEffect } from '@creact-labs/creact';

function Counter() {
  const counter = useAsyncOutput({}, async (_props, setOutputs) => {
    // On restart, prev.count holds the last saved value
    setOutputs(prev => ({ count: prev?.count ?? 0 }));

    const interval = setInterval(() => {
      setOutputs(prev => ({ count: (prev?.count ?? 0) + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  });

  createEffect(() => {
    console.log('Count:', counter.count());
  });

  return <></>;
}`} filename="counter.tsx" />

      <DocHeading level={2} id="what-gets-persisted">What Gets Persisted</DocHeading>
      <p>
        Only values passed to <code>setOutputs()</code> are persisted. Regular signals, effects,
        and local variables are <strong>not</strong> saved. They reinitialize on each run.
      </p>

      <DocHeading level={2} id="reconciliation">Reconciliation on Restart</DocHeading>
      <p>
        When the app restarts, CReact compares the new component tree against the saved state.
        Outputs are hydrated from the saved state, but handlers re-run for all nodes
        to re-establish side effects (intervals, subscriptions, etc.). Handlers must be
        idempotent. They receive previously saved outputs and can skip work that's already done.
      </p>

      <Callout type="info">
        <p>
          Add the state directory (e.g. <code>.state/</code>) to your <code>.gitignore</code>.
        </p>
      </Callout>

      <p>
        For the full Memory interface including optional locking, audit logging, and
        the DeploymentState structure, see <a href="#/docs/architecture/memory-system">Architecture: Memory System</a>.
      </p>
    </>
  );
};

export default StateAndMemory;
