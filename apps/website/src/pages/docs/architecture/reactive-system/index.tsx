import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocSteps from "@/shared/components/doc-steps";
import DocCodeBlock from "@/shared/components/doc-code-block";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

const ReactiveSystem: Component = () => {
  return (
    <>
      <h1>Reactive System</h1>
      <p class="docs-description">
        CReact tracks dependencies at the signal level. Changes propagate
        synchronously through a DAG of signals and computations.
      </p>

      <DocHeading level={2} id="core-concepts">
        Core Concepts
      </DocHeading>

      <DocHeading level={3} id="signals">
        Signals
      </DocHeading>
      <p>
        A signal holds a value and maintains a list of observers (computations
        that depend on it). When the value changes, all observers are marked
        stale and scheduled for re-execution.
      </p>

      <DocHeading level={3} id="computations">
        Computations
      </DocHeading>
      <p>
        A computation is a function that reads signals. Any signal read during
        execution registers the computation as an observer. The dependency graph
        builds at runtime.
      </p>

      <DocHeading level={3} id="ownership">
        Ownership
      </DocHeading>
      <p>
        Every computation has an owner (the computation or root that created
        it). This forms a tree. When an owner is disposed, all its children are
        disposed too, including their effects and cleanup functions.
      </p>

      <DocHeading level={2} id="execution-model">
        Execution Model
      </DocHeading>
      <DocSteps
        steps={[
          { label: "Signal write", body: "marks all observers as STALE" },
          { label: "Schedule", body: "stale computations are added to the update queue" },
          { label: "Batch", body: "multiple writes in a synchronous block are batched" },
          { label: "Run queue", body: "pure computations (memos) run first, then effects" },
          { label: "Clean", body: "before a computation re-runs, its old dependencies are cleaned" },
          { label: "Re-track", body: "the computation re-runs, re-registering dependencies" },
        ]}
      />

      <DocHeading level={2} id="source-modules">
        Source Modules
      </DocHeading>
      <DocTable
        headers={["Module", "Responsibility"]}
        rows={[
          [<><code>tracking.ts</code></>, "Core scheduler: runUpdates, runQueue, runComputation, cleanComputation"],
          [<><code>signal.ts</code></>, "createSignal, createMemo, on, catchError"],
          [<><code>effect.ts</code></>, "createEffect, createComputed, createRenderEffect, createReaction, onCleanup, onMount"],
          [<><code>owner.ts</code></>, "createRoot, getOwner, runWithOwner, ownership chain"],
          [<><code>selector.ts</code></>, "createSelector, O(2) selection tracking"],
        ]}
      />

      <DocHeading level={2} id="glitch-free">
        Glitch-Free Propagation
      </DocHeading>
      <p>
        The system guarantees that no computation observes an inconsistent
        state. Memos (pure computations) run before effects, and dependencies
        are resolved upstream-first. This eliminates "glitches" where a
        computation sees partially-updated values.
      </p>

      <Callout type="info">
        <p>
          The reactive system is entirely synchronous within a batch. Async
          operations (like <code>useAsyncOutput</code> handlers) are managed by
          the runtime layer above.
        </p>
      </Callout>
    </>
  );
};

export default ReactiveSystem;
