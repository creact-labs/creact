import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";

const FiberModel: Component = () => {
  return (
    <>
      <h1>Fiber Model</h1>
      <p class="docs-description">
        Fibers are CReact's internal representation of the component tree. Each component instance maps to a fiber node.
      </p>

      <DocHeading level={2} id="what-is-fiber">What Is a Fiber?</DocHeading>
      <p>
        A fiber is a unit of work in the render tree. Each component instance in your JSX
        corresponds to a fiber node. Fibers form a tree that mirrors your component hierarchy.
      </p>

      <DocHeading level={2} id="fiber-structure">Fiber Structure</DocHeading>
      <DocCodeBlock code={`interface Fiber {
  type: any;                    // Component function or intrinsic element
  props: Record<string, any>;
  children: Fiber[];
  path: string[];               // Path segments from root to this fiber
  key?: string | number;        // User-provided key for stable identity

  // Instance bindings (from useAsyncOutput)
  instanceNodes: InstanceNode[];

  // Store (from createStore)
  store?: any;

  // Owner for reactive scope (effects, cleanups)
  owner?: Owner | null;
}`} filename="fiber.ts (simplified)" />

      <DocHeading level={2} id="lifecycle">Fiber Lifecycle</DocHeading>
      <ol>
        <li><strong>Creation:</strong> when JSX is evaluated, fibers are created for each component</li>
        <li><strong>Reconciliation:</strong> fibers are compared against the previous state</li>
        <li><strong>Execution:</strong> handlers run for new or changed fibers</li>
        <li><strong>Serialization:</strong> fiber outputs are saved to Memory</li>
        <li><strong>Cleanup:</strong> removed fibers have their cleanup handlers called</li>
      </ol>

      <DocHeading level={2} id="paths">Fiber Paths</DocHeading>
      <p>
        Each fiber has a <code>path</code>, an array of string segments from the root to
        that fiber. Instance nodes derive their ID by joining the path
        with <code>"."</code> (e.g., <code>app.aws.web-site-blog</code>). Paths are used
        to match nodes across runs for reconciliation.
      </p>
      <DocCodeBlock code={`// <App>
//   <AWS region="us-east-1">
//     <WebSite key="blog" name="blog" />
//     <WebSite key="docs" name="docs" />
//   </AWS>
// </App>

// Fiber paths (string[]):
// ["App"]
// ["App", "AWS"]
// ["App", "AWS", "WebSite"]   (key="blog")
// ["App", "AWS", "WebSite"]   (key="docs")

// Instance node IDs (path.join(".")):
// "app.aws.web-site-blog"
// "app.aws.web-site-docs"`} />

      <DocHeading level={2} id="instance-nodes">Fibers vs Instance Nodes</DocHeading>
      <p>
        Fibers represent the component tree structure. When a component
        calls <code>useAsyncOutput</code>, it creates an <code>InstanceNode</code> that
        is attached to the fiber via <code>instanceNodes</code>. Instance nodes are what
        the reconciler diffs and the runtime deploys. They carry the handler, outputs,
        and cleanup function.
      </p>

      <DocHeading level={2} id="source">Source</DocHeading>
      <p>
        The fiber interface and <code>createFiber</code> live in <code>runtime/src/fiber.ts</code>.
        Instance nodes are defined in <code>runtime/src/instance.ts</code>. Rendering
        logic is in <code>runtime/src/render.ts</code>.
      </p>
    </>
  );
};

export default FiberModel;
