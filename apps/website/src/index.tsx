/* @refresh reload */
import { render } from "solid-js/web";
import { HashRouter, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import "./styles.css";
import "./docs.css";

import LandingPage from "@/pages/landing";
import DocsLayout from "@/pages/docs/layout";

// Getting Started
const Installation = lazy(
  () => import("@/pages/docs/getting-started/installation"),
);
const ComponentsJsx = lazy(
  () => import("@/pages/docs/getting-started/components-jsx"),
);
const ReactivePrimitives = lazy(
  () => import("@/pages/docs/getting-started/reactive-primitives"),
);
const FlowControl = lazy(
  () => import("@/pages/docs/getting-started/flow-control"),
);
const ContextProviders = lazy(
  () => import("@/pages/docs/getting-started/context-providers"),
);
const ErrorHandling = lazy(
  () => import("@/pages/docs/getting-started/error-handling"),
);
const StateAndMemory = lazy(
  () => import("@/pages/docs/getting-started/state-and-memory"),
);
const Deploying = lazy(() => import("@/pages/docs/getting-started/deploying"));

// Guides
const AwsIntegration = lazy(() => import("@/pages/docs/guides/aws-integration"));
const AiIntegration = lazy(() => import("@/pages/docs/guides/ai-integration"));
const HttpApis = lazy(() => import("@/pages/docs/guides/http-apis"));
const FileSystem = lazy(() => import("@/pages/docs/guides/file-system"));
const Testing = lazy(() => import("@/pages/docs/guides/testing"));
const TypescriptGuide = lazy(() => import("@/pages/docs/guides/typescript"));
const EnvironmentVariables = lazy(
  () => import("@/pages/docs/guides/environment-variables"),
);
const WatchMode = lazy(() => import("@/pages/docs/guides/watch-mode"));

// API Reference - Reactive
const CreateSignal = lazy(
  () => import("@/pages/docs/api/reactive/create-signal"),
);
const CreateEffect = lazy(
  () => import("@/pages/docs/api/reactive/create-effect"),
);
const CreateMemo = lazy(() => import("@/pages/docs/api/reactive/create-memo"));
const CreateComputed = lazy(
  () => import("@/pages/docs/api/reactive/create-computed"),
);
const CreateRenderEffect = lazy(
  () => import("@/pages/docs/api/reactive/create-render-effect"),
);
const CreateReaction = lazy(
  () => import("@/pages/docs/api/reactive/create-reaction"),
);
const CreateRoot = lazy(() => import("@/pages/docs/api/reactive/create-root"));
const CreateSelector = lazy(
  () => import("@/pages/docs/api/reactive/create-selector"),
);
const Batch = lazy(() => import("@/pages/docs/api/reactive/batch"));
const Untrack = lazy(() => import("@/pages/docs/api/reactive/untrack"));
const On = lazy(() => import("@/pages/docs/api/reactive/on"));

// API Reference - Flow Components
const ShowApi = lazy(() => import("@/pages/docs/api/components/show"));
const ForApi = lazy(() => import("@/pages/docs/api/components/for"));
const SwitchMatch = lazy(
  () => import("@/pages/docs/api/components/switch-match"),
);
const ErrorBoundaryApi = lazy(
  () => import("@/pages/docs/api/components/error-boundary"),
);

// API Reference - Store
const CreateStore = lazy(() => import("@/pages/docs/api/store/create-store"));
const Unwrap = lazy(() => import("@/pages/docs/api/store/unwrap"));

// API Reference - Runtime
const Render = lazy(() => import("@/pages/docs/api/runtime/render"));
const CreateRuntime = lazy(
  () => import("@/pages/docs/api/runtime/create-runtime"),
);
const UseAsyncOutput = lazy(
  () => import("@/pages/docs/api/runtime/use-async-output"),
);

// API Reference - Context
const CreateContext = lazy(
  () => import("@/pages/docs/api/context/create-context"),
);
const UseContext = lazy(() => import("@/pages/docs/api/context/use-context"));

// API Reference - Lifecycle
const OnMount = lazy(() => import("@/pages/docs/api/lifecycle/on-mount"));
const OnCleanup = lazy(() => import("@/pages/docs/api/lifecycle/on-cleanup"));

// API Reference - Props
const MergeProps = lazy(() => import("@/pages/docs/api/props/merge-props"));
const SplitProps = lazy(() => import("@/pages/docs/api/props/split-props"));
const Children = lazy(() => import("@/pages/docs/api/props/children"));
const Access = lazy(() => import("@/pages/docs/api/props/access"));

// API Reference - Arrays
const MapArray = lazy(() => import("@/pages/docs/api/arrays/map-array"));
const IndexArray = lazy(() => import("@/pages/docs/api/arrays/index-array"));

// API Reference - Owner
const GetOwner = lazy(() => import("@/pages/docs/api/owner/get-owner"));
const RunWithOwner = lazy(() => import("@/pages/docs/api/owner/run-with-owner"));

// API Reference - Config
const Tsconfig = lazy(() => import("@/pages/docs/api/config/tsconfig"));
const PackageJson = lazy(() => import("@/pages/docs/api/config/package-json"));

// API Reference - CLI
const CreactCli = lazy(() => import("@/pages/docs/api/cli/creact"));
const CreactWatch = lazy(() => import("@/pages/docs/api/cli/creact-watch"));

// Architecture
const ReactiveSystem = lazy(
  () => import("@/pages/docs/architecture/reactive-system"),
);
const Reconciliation = lazy(
  () => import("@/pages/docs/architecture/reconciliation"),
);
const FiberModel = lazy(() => import("@/pages/docs/architecture/fiber-model"));
const StateMachine = lazy(
  () => import("@/pages/docs/architecture/state-machine"),
);
const MemorySystem = lazy(
  () => import("@/pages/docs/architecture/memory-system"),
);
const RuntimeBoundaries = lazy(
  () => import("@/pages/docs/architecture/runtime-boundaries"),
);

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Clear static SEO shell before SPA mounts
root.innerHTML = "";

render(
  () => (
    <HashRouter>
      <Route path="/" component={LandingPage} />
      <Route path="/docs" component={DocsLayout}>
        <Route path="/" component={Installation} />
        {/* Getting Started */}
        <Route path="/getting-started/installation" component={Installation} />
        <Route
          path="/getting-started/components-jsx"
          component={ComponentsJsx}
        />
        <Route
          path="/getting-started/reactive-primitives"
          component={ReactivePrimitives}
        />
        <Route path="/getting-started/flow-control" component={FlowControl} />
        <Route
          path="/getting-started/context-providers"
          component={ContextProviders}
        />
        <Route
          path="/getting-started/error-handling"
          component={ErrorHandling}
        />
        <Route
          path="/getting-started/state-and-memory"
          component={StateAndMemory}
        />
        <Route path="/getting-started/deploying" component={Deploying} />
        {/* Guides */}
        <Route path="/guides/aws-integration" component={AwsIntegration} />
        <Route path="/guides/ai-integration" component={AiIntegration} />
        <Route path="/guides/http-apis" component={HttpApis} />
        <Route path="/guides/file-system" component={FileSystem} />
        <Route path="/guides/testing" component={Testing} />
        <Route path="/guides/typescript" component={TypescriptGuide} />
        <Route
          path="/guides/environment-variables"
          component={EnvironmentVariables}
        />
        <Route path="/guides/watch-mode" component={WatchMode} />
        {/* API - Reactive */}
        <Route path="/api/reactive/create-signal" component={CreateSignal} />
        <Route path="/api/reactive/create-effect" component={CreateEffect} />
        <Route path="/api/reactive/create-memo" component={CreateMemo} />
        <Route
          path="/api/reactive/create-computed"
          component={CreateComputed}
        />
        <Route
          path="/api/reactive/create-render-effect"
          component={CreateRenderEffect}
        />
        <Route
          path="/api/reactive/create-reaction"
          component={CreateReaction}
        />
        <Route path="/api/reactive/create-root" component={CreateRoot} />
        <Route
          path="/api/reactive/create-selector"
          component={CreateSelector}
        />
        <Route path="/api/reactive/batch" component={Batch} />
        <Route path="/api/reactive/untrack" component={Untrack} />
        <Route path="/api/reactive/on" component={On} />
        {/* API - Components */}
        <Route path="/api/components/show" component={ShowApi} />
        <Route path="/api/components/for" component={ForApi} />
        <Route path="/api/components/switch-match" component={SwitchMatch} />
        <Route
          path="/api/components/error-boundary"
          component={ErrorBoundaryApi}
        />
        {/* API - Store */}
        <Route path="/api/store/create-store" component={CreateStore} />
        <Route path="/api/store/unwrap" component={Unwrap} />
        {/* API - Runtime */}
        <Route path="/api/runtime/render" component={Render} />
        <Route
          path="/api/runtime/create-runtime"
          component={CreateRuntime}
        />
        <Route
          path="/api/runtime/use-async-output"
          component={UseAsyncOutput}
        />
        {/* API - Context */}
        <Route path="/api/context/create-context" component={CreateContext} />
        <Route path="/api/context/use-context" component={UseContext} />
        {/* API - Lifecycle */}
        <Route path="/api/lifecycle/on-mount" component={OnMount} />
        <Route path="/api/lifecycle/on-cleanup" component={OnCleanup} />
        {/* API - Props */}
        <Route path="/api/props/merge-props" component={MergeProps} />
        <Route path="/api/props/split-props" component={SplitProps} />
        <Route path="/api/props/children" component={Children} />
        <Route path="/api/props/access" component={Access} />
        {/* API - Arrays */}
        <Route path="/api/arrays/map-array" component={MapArray} />
        <Route path="/api/arrays/index-array" component={IndexArray} />
        {/* API - Owner */}
        <Route path="/api/owner/get-owner" component={GetOwner} />
        <Route path="/api/owner/run-with-owner" component={RunWithOwner} />
        {/* API - Config */}
        <Route path="/api/config/tsconfig" component={Tsconfig} />
        <Route path="/api/config/package-json" component={PackageJson} />
        {/* API - CLI */}
        <Route path="/api/cli/creact" component={CreactCli} />
        <Route path="/api/cli/creact-watch" component={CreactWatch} />
        {/* Architecture */}
        <Route
          path="/architecture/reactive-system"
          component={ReactiveSystem}
        />
        <Route path="/architecture/reconciliation" component={Reconciliation} />
        <Route path="/architecture/fiber-model" component={FiberModel} />
        <Route path="/architecture/state-machine" component={StateMachine} />
        <Route path="/architecture/memory-system" component={MemorySystem} />
        <Route
          path="/architecture/runtime-boundaries"
          component={RuntimeBoundaries}
        />
      </Route>
    </HashRouter>
  ),
  root,
);
