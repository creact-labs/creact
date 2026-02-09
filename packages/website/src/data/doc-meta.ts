export interface DocPage {
  title: string;
  href: string;
}

/** Ordered list of all doc pages for prev/next navigation */
export const docPages: DocPage[] = [
  // Getting Started
  { title: "Installation", href: "/docs/getting-started/installation" },
  { title: "Components and JSX", href: "/docs/getting-started/components-jsx" },
  { title: "Reactive Primitives", href: "/docs/getting-started/reactive-primitives" },
  { title: "Flow Control", href: "/docs/getting-started/flow-control" },
  { title: "Context and Providers", href: "/docs/getting-started/context-providers" },
  { title: "Error Handling", href: "/docs/getting-started/error-handling" },
  { title: "State and Memory", href: "/docs/getting-started/state-and-memory" },
  { title: "Watch Mode", href: "/docs/guides/watch-mode" },
  { title: "TypeScript", href: "/docs/guides/typescript" },
  { title: "Environment Variables", href: "/docs/guides/environment-variables" },
  { title: "Testing", href: "/docs/guides/testing" },
  // Architecture
  { title: "Reactive System", href: "/docs/architecture/reactive-system" },
  { title: "Reconciliation", href: "/docs/architecture/reconciliation" },
  { title: "Fiber Model", href: "/docs/architecture/fiber-model" },
  { title: "State Machine", href: "/docs/architecture/state-machine" },
  { title: "Memory System", href: "/docs/architecture/memory-system" },
  // Example Integrations
  { title: "File System", href: "/docs/guides/file-system" },
  { title: "HTTP APIs and Channels", href: "/docs/guides/http-apis" },
  { title: "AI Integration", href: "/docs/guides/ai-integration" },
  { title: "AWS Integration", href: "/docs/guides/aws-integration" },
  // API - Reactive
  { title: "createSignal", href: "/docs/api/reactive/create-signal" },
  { title: "createEffect", href: "/docs/api/reactive/create-effect" },
  { title: "createMemo", href: "/docs/api/reactive/create-memo" },
  { title: "createComputed", href: "/docs/api/reactive/create-computed" },
  { title: "createRenderEffect", href: "/docs/api/reactive/create-render-effect" },
  { title: "createReaction", href: "/docs/api/reactive/create-reaction" },
  { title: "createRoot", href: "/docs/api/reactive/create-root" },
  { title: "createSelector", href: "/docs/api/reactive/create-selector" },
  { title: "batch", href: "/docs/api/reactive/batch" },
  { title: "untrack", href: "/docs/api/reactive/untrack" },
  { title: "on", href: "/docs/api/reactive/on" },
  // API - Components
  { title: "Show", href: "/docs/api/components/show" },
  { title: "For", href: "/docs/api/components/for" },
  { title: "Switch / Match", href: "/docs/api/components/switch-match" },
  { title: "ErrorBoundary", href: "/docs/api/components/error-boundary" },
  { title: "Index", href: "/docs/api/components/index-component" },
  // API - Store
  { title: "createStore", href: "/docs/api/store/create-store" },
  { title: "unwrap", href: "/docs/api/store/unwrap" },
  // API - Runtime
  { title: "render", href: "/docs/api/runtime/render" },
  { title: "useAsyncOutput", href: "/docs/api/runtime/use-async-output" },
  // API - Context
  { title: "createContext", href: "/docs/api/context/create-context" },
  { title: "useContext", href: "/docs/api/context/use-context" },
  // API - Lifecycle
  { title: "onMount", href: "/docs/api/lifecycle/on-mount" },
  { title: "onCleanup", href: "/docs/api/lifecycle/on-cleanup" },
  // API - Props
  { title: "mergeProps", href: "/docs/api/props/merge-props" },
  { title: "splitProps", href: "/docs/api/props/split-props" },
  { title: "children", href: "/docs/api/props/children" },
  { title: "access", href: "/docs/api/props/access" },
  // API - Arrays
  { title: "mapArray", href: "/docs/api/arrays/map-array" },
  { title: "indexArray", href: "/docs/api/arrays/index-array" },
  // API - Owner
  { title: "getOwner", href: "/docs/api/owner/get-owner" },
  { title: "runWithOwner", href: "/docs/api/owner/run-with-owner" },
  // API - Config
  { title: "tsconfig.json", href: "/docs/api/config/tsconfig" },
  { title: "package.json", href: "/docs/api/config/package-json" },
  // API - CLI
  { title: "creact", href: "/docs/api/cli/creact" },
  { title: "creact --watch", href: "/docs/api/cli/creact-watch" },
];
