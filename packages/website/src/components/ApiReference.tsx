import type { Component } from "solid-js";

const hooks = [
  {
    name: "useAsyncOutput(props, handler)",
    description:
      "Create a resource with persisted outputs. Handler receives previous state and can return a cleanup function.",
  },
  {
    name: "createSignal(value)",
    description: "Create reactive state. Returns [getter, setter].",
  },
  {
    name: "createEffect(fn)",
    description: "Run side effects when reactive dependencies change.",
  },
  {
    name: "createMemo(fn)",
    description: "Create a derived reactive value that caches its result.",
  },
  {
    name: "createContext(default)",
    description: "Create a context for sharing data down the tree.",
  },
  {
    name: "useContext(ctx)",
    description: "Read the nearest context value from an ancestor Provider.",
  },
  {
    name: "onMount(fn)",
    description: "Run code when a component first renders.",
  },
  { name: "onCleanup(fn)", description: "Run code when a component unmounts." },
  {
    name: "untrack(fn)",
    description: "Read reactive values without creating a dependency.",
  },
  {
    name: "access(value)",
    description: "Unwrap a MaybeAccessor<T> to get the actual value.",
  },
  {
    name: "render(component, memory, name)",
    description: "Entry point. Render a component tree with a memory backend.",
  },
];

const flowComponents = [
  {
    name: "<Show when={...} fallback={...}>",
    description:
      "Conditional rendering. Renders children when condition is truthy, fallback otherwise.",
  },
  {
    name: "<For each={...} keyFn={...}>",
    description:
      "List rendering. Iterates over an array and renders children for each item.",
  },
  {
    name: "<Switch> / <Match when={...}>",
    description:
      "Multi-way conditional rendering. Renders the first matching branch.",
  },
  {
    name: "<Context.Provider value={...}>",
    description: "Provides a context value to all descendants in the tree.",
  },
];

const ApiReference: Component = () => {
  return (
    <section id="api" class="section">
      <h2 class="section-title">API Reference</h2>
      <p class="section-subtitle">
        Core primitives for building reactive execution engines.
      </p>
      <div class="api-grid">
        <div class="api-column">
          <h3 class="api-column-title">Hooks &amp; Functions</h3>
          <div class="api-list">
            {hooks.map((item) => (
              <div class="api-item">
                <code class="api-name">{item.name}</code>
                <p class="api-description">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div class="api-column">
          <h3 class="api-column-title">Flow Components</h3>
          <div class="api-list">
            {flowComponents.map((item) => (
              <div class="api-item">
                <code class="api-name">{item.name}</code>
                <p class="api-description">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApiReference;
