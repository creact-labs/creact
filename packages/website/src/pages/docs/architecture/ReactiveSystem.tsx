import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const ReactiveSystem: Component = () => {
  return (
    <>
      <h1>Reactive System</h1>
      <p class="docs-description">
        CReact tracks dependencies at the signal level. Changes propagate synchronously through a DAG of signals and computations.
      </p>

      <DocHeading level={2} id="core-concepts">Core Concepts</DocHeading>

      <DocHeading level={3} id="signals">Signals</DocHeading>
      <p>
        A signal holds a value and maintains a list of observers (computations that depend on it).
        When the value changes, all observers are marked stale and scheduled for re-execution.
      </p>

      <DocHeading level={3} id="computations">Computations</DocHeading>
      <p>
        A computation is a function that reads signals. Any signal read during execution
        registers the computation as an observer. The dependency graph builds at runtime.
      </p>

      <DocHeading level={3} id="ownership">Ownership</DocHeading>
      <p>
        Every computation has an owner (the computation or root that created it). This forms a tree.
        When an owner is disposed, all its children are disposed too, including their effects
        and cleanup functions.
      </p>

      <DocHeading level={2} id="execution-model">Execution Model</DocHeading>
      <ol>
        <li><strong>Signal write:</strong> marks all observers as STALE</li>
        <li><strong>Schedule:</strong> stale computations are added to the update queue</li>
        <li><strong>Batch:</strong> multiple writes in a synchronous block are batched</li>
        <li><strong>Run queue:</strong> pure computations (memos) run first, then effects</li>
        <li><strong>Clean:</strong> before a computation re-runs, its old dependencies are cleaned</li>
        <li><strong>Re-track:</strong> the computation re-runs, re-registering dependencies</li>
      </ol>

      <DocHeading level={2} id="source-modules">Source Modules</DocHeading>
      <table>
        <thead><tr><th>Module</th><th>Responsibility</th></tr></thead>
        <tbody>
          <tr><td><code>tracking.ts</code></td><td>Core scheduler: runUpdates, runQueue, runComputation, cleanComputation</td></tr>
          <tr><td><code>signal.ts</code></td><td>createSignal, createMemo, on, catchError</td></tr>
          <tr><td><code>effect.ts</code></td><td>createEffect, createComputed, createRenderEffect, createReaction, onCleanup, onMount</td></tr>
          <tr><td><code>owner.ts</code></td><td>createRoot, getOwner, runWithOwner, ownership chain</td></tr>
          <tr><td><code>selector.ts</code></td><td>createSelector, O(2) selection tracking</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="glitch-free">Glitch-Free Propagation</DocHeading>
      <p>
        The system guarantees that no computation observes an inconsistent state. Memos
        (pure computations) run before effects, and dependencies are resolved upstream-first.
        This eliminates "glitches" where a computation sees partially-updated values.
      </p>

      <Callout type="info">
        <p>
          The reactive system is entirely synchronous within a batch. Async operations
          (like <code>useAsyncOutput</code> handlers) are managed by the runtime layer above.
        </p>
      </Callout>
    </>
  );
};

export default ReactiveSystem;
