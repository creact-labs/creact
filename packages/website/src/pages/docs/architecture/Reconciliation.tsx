import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";

const Reconciliation: Component = () => {
  return (
    <>
      <h1>Reconciliation</h1>
      <p class="docs-description">
        The reconciler compares the current component tree against saved state and computes the minimal diff.
      </p>

      <DocHeading level={2} id="how-it-works">How It Works</DocHeading>
      <ol>
        <li><strong>Render:</strong> the component tree is evaluated, producing a fiber tree with instance nodes</li>
        <li><strong>Load state:</strong> the previous state is loaded from Memory</li>
        <li><strong>Diff:</strong> the reconciler compares previous and current instance nodes by ID (path-based)</li>
        <li><strong>Change set:</strong> produces creates, updates, and deletes</li>
        <li><strong>Dependency graph:</strong> builds a parent-child dependency graph from node paths</li>
        <li><strong>Topological sort:</strong> orders nodes so parents deploy before children</li>
        <li><strong>Apply:</strong> handlers run for created and updated nodes, cleanup runs for deleted nodes</li>
        <li><strong>Save state:</strong> the new state is persisted to Memory</li>
      </ol>

      <DocHeading level={2} id="change-detection">Change Detection</DocHeading>
      <p>The reconciler detects three types of changes:</p>
      <ul>
        <li><strong>Creates:</strong> nodes in the current tree whose ID wasn't in the previous state</li>
        <li><strong>Deletes:</strong> nodes in the previous state whose ID isn't in the current tree</li>
        <li><strong>Updates:</strong> nodes present in both, whose props differ (deep equality check)</li>
      </ul>
      <p>
        Nodes are matched by their <code>id</code>, which is derived from the
        path (e.g., <code>app.aws.web-site-blog</code>). There is no type-based matching.
      </p>

      <DocHeading level={2} id="deep-equal">Deep Equality</DocHeading>
      <p>
        Props are compared using deep equality (<code>deepEqual</code>). Identical
        props, even new object references, won't trigger a handler re-run.
      </p>
      <DocCodeBlock code={`// These produce the same result, no handler re-run:
// Run 1: <WebSite name="blog" content="<h1>Hello</h1>" />
// Run 2: <WebSite name="blog" content="<h1>Hello</h1>" />

// This triggers a re-run, content changed:
// Run 1: <WebSite name="blog" content="<h1>Hello</h1>" />
// Run 2: <WebSite name="blog" content="<h1>Updated</h1>" />`} />

      <DocHeading level={2} id="parallel-deployment">Parallel Deployment</DocHeading>
      <p>
        After computing the change set, the reconciler builds a dependency graph from
        path hierarchy (parents must deploy before children) and groups independent nodes
        into parallel batches. The <code>ChangeSet</code> includes:
      </p>
      <ul>
        <li><code>deploymentOrder</code>: topologically sorted node IDs</li>
        <li><code>parallelBatches</code>: groups of nodes that can be deployed concurrently</li>
      </ul>

      <DocHeading level={2} id="source">Source</DocHeading>
      <p>
        The reconciliation logic lives in <code>runtime/src/reconcile.ts</code>. Key exports:
      </p>
      <ul>
        <li><code>reconcile()</code>: main reconciliation function, returns a <code>ChangeSet</code></li>
        <li><code>deepEqual()</code>: deep equality comparison</li>
        <li><code>buildDependencyGraph()</code>: builds parent-child dependency graph from node paths</li>
        <li><code>topologicalSort()</code>: Kahn's algorithm for deployment ordering</li>
        <li><code>computeParallelBatches()</code>: groups independent nodes for concurrent deployment</li>
        <li><code>hasChanges()</code>, <code>hasNewNodes()</code>, <code>hasRemovedNodes()</code>, <code>hasPropChanges()</code>: change detectors</li>
      </ul>
    </>
  );
};

export default Reconciliation;
