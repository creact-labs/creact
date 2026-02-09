/* @refresh reload */
import { render } from "solid-js/web";
import { HashRouter, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import "./styles.css";
import "./styles/docs.css";

import LandingPage from "./pages/LandingPage";
import DocsLayout from "./layouts/DocsLayout";

// Getting Started
const Installation = lazy(() => import("./pages/docs/getting-started/Installation"));
const ComponentsJsx = lazy(() => import("./pages/docs/getting-started/ComponentsJsx"));
const ReactivePrimitives = lazy(() => import("./pages/docs/getting-started/ReactivePrimitives"));
const FlowControl = lazy(() => import("./pages/docs/getting-started/FlowControl"));
const ContextProviders = lazy(() => import("./pages/docs/getting-started/ContextProviders"));
const ErrorHandling = lazy(() => import("./pages/docs/getting-started/ErrorHandling"));
const StateAndMemory = lazy(() => import("./pages/docs/getting-started/StateAndMemory"));
const Deploying = lazy(() => import("./pages/docs/getting-started/Deploying"));

// Guides
const AwsIntegration = lazy(() => import("./pages/docs/guides/AwsIntegration"));
const AiIntegration = lazy(() => import("./pages/docs/guides/AiIntegration"));
const HttpApis = lazy(() => import("./pages/docs/guides/HttpApis"));
const FileSystem = lazy(() => import("./pages/docs/guides/FileSystem"));
const Testing = lazy(() => import("./pages/docs/guides/Testing"));
const TypescriptGuide = lazy(() => import("./pages/docs/guides/Typescript"));
const EnvironmentVariables = lazy(() => import("./pages/docs/guides/EnvironmentVariables"));
const WatchMode = lazy(() => import("./pages/docs/guides/WatchMode"));

// API Reference - Reactive
const CreateSignal = lazy(() => import("./pages/docs/api/reactive/CreateSignal"));
const CreateEffect = lazy(() => import("./pages/docs/api/reactive/CreateEffect"));
const CreateMemo = lazy(() => import("./pages/docs/api/reactive/CreateMemo"));
const CreateComputed = lazy(() => import("./pages/docs/api/reactive/CreateComputed"));
const CreateRenderEffect = lazy(() => import("./pages/docs/api/reactive/CreateRenderEffect"));
const CreateReaction = lazy(() => import("./pages/docs/api/reactive/CreateReaction"));
const CreateRoot = lazy(() => import("./pages/docs/api/reactive/CreateRoot"));
const CreateSelector = lazy(() => import("./pages/docs/api/reactive/CreateSelector"));
const Batch = lazy(() => import("./pages/docs/api/reactive/Batch"));
const Untrack = lazy(() => import("./pages/docs/api/reactive/Untrack"));
const On = lazy(() => import("./pages/docs/api/reactive/On"));

// API Reference - Flow Components
const ShowApi = lazy(() => import("./pages/docs/api/components/Show"));
const ForApi = lazy(() => import("./pages/docs/api/components/For"));
const SwitchMatch = lazy(() => import("./pages/docs/api/components/SwitchMatch"));
const ErrorBoundaryApi = lazy(() => import("./pages/docs/api/components/ErrorBoundary"));
const IndexApi = lazy(() => import("./pages/docs/api/components/Index"));

// API Reference - Store
const CreateStore = lazy(() => import("./pages/docs/api/store/CreateStore"));
const Unwrap = lazy(() => import("./pages/docs/api/store/Unwrap"));

// API Reference - Runtime
const Render = lazy(() => import("./pages/docs/api/runtime/Render"));
const UseAsyncOutput = lazy(() => import("./pages/docs/api/runtime/UseAsyncOutput"));

// API Reference - Context
const CreateContext = lazy(() => import("./pages/docs/api/context/CreateContext"));
const UseContext = lazy(() => import("./pages/docs/api/context/UseContext"));

// API Reference - Lifecycle
const OnMount = lazy(() => import("./pages/docs/api/lifecycle/OnMount"));
const OnCleanup = lazy(() => import("./pages/docs/api/lifecycle/OnCleanup"));

// API Reference - Props
const MergeProps = lazy(() => import("./pages/docs/api/props/MergeProps"));
const SplitProps = lazy(() => import("./pages/docs/api/props/SplitProps"));
const Children = lazy(() => import("./pages/docs/api/props/Children"));
const Access = lazy(() => import("./pages/docs/api/props/Access"));

// API Reference - Arrays
const MapArray = lazy(() => import("./pages/docs/api/arrays/MapArray"));
const IndexArray = lazy(() => import("./pages/docs/api/arrays/IndexArray"));

// API Reference - Owner
const GetOwner = lazy(() => import("./pages/docs/api/owner/GetOwner"));
const RunWithOwner = lazy(() => import("./pages/docs/api/owner/RunWithOwner"));

// API Reference - Config
const Tsconfig = lazy(() => import("./pages/docs/api/config/Tsconfig"));
const PackageJson = lazy(() => import("./pages/docs/api/config/PackageJson"));

// API Reference - CLI
const CreactCli = lazy(() => import("./pages/docs/api/cli/Creact"));
const CreactWatch = lazy(() => import("./pages/docs/api/cli/CreactWatch"));

// Architecture
const ReactiveSystem = lazy(() => import("./pages/docs/architecture/ReactiveSystem"));
const Reconciliation = lazy(() => import("./pages/docs/architecture/Reconciliation"));
const FiberModel = lazy(() => import("./pages/docs/architecture/FiberModel"));
const StateMachine = lazy(() => import("./pages/docs/architecture/StateMachine"));
const MemorySystem = lazy(() => import("./pages/docs/architecture/MemorySystem"));


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
        <Route path="/getting-started/components-jsx" component={ComponentsJsx} />
        <Route path="/getting-started/reactive-primitives" component={ReactivePrimitives} />
        <Route path="/getting-started/flow-control" component={FlowControl} />
        <Route path="/getting-started/context-providers" component={ContextProviders} />
        <Route path="/getting-started/error-handling" component={ErrorHandling} />
        <Route path="/getting-started/state-and-memory" component={StateAndMemory} />
        <Route path="/getting-started/deploying" component={Deploying} />
        {/* Guides */}
        <Route path="/guides/aws-integration" component={AwsIntegration} />
        <Route path="/guides/ai-integration" component={AiIntegration} />
        <Route path="/guides/http-apis" component={HttpApis} />
        <Route path="/guides/file-system" component={FileSystem} />
        <Route path="/guides/testing" component={Testing} />
        <Route path="/guides/typescript" component={TypescriptGuide} />
        <Route path="/guides/environment-variables" component={EnvironmentVariables} />
        <Route path="/guides/watch-mode" component={WatchMode} />
        {/* API - Reactive */}
        <Route path="/api/reactive/create-signal" component={CreateSignal} />
        <Route path="/api/reactive/create-effect" component={CreateEffect} />
        <Route path="/api/reactive/create-memo" component={CreateMemo} />
        <Route path="/api/reactive/create-computed" component={CreateComputed} />
        <Route path="/api/reactive/create-render-effect" component={CreateRenderEffect} />
        <Route path="/api/reactive/create-reaction" component={CreateReaction} />
        <Route path="/api/reactive/create-root" component={CreateRoot} />
        <Route path="/api/reactive/create-selector" component={CreateSelector} />
        <Route path="/api/reactive/batch" component={Batch} />
        <Route path="/api/reactive/untrack" component={Untrack} />
        <Route path="/api/reactive/on" component={On} />
        {/* API - Components */}
        <Route path="/api/components/show" component={ShowApi} />
        <Route path="/api/components/for" component={ForApi} />
        <Route path="/api/components/switch-match" component={SwitchMatch} />
        <Route path="/api/components/error-boundary" component={ErrorBoundaryApi} />
        <Route path="/api/components/index-component" component={IndexApi} />
        {/* API - Store */}
        <Route path="/api/store/create-store" component={CreateStore} />
        <Route path="/api/store/unwrap" component={Unwrap} />
        {/* API - Runtime */}
        <Route path="/api/runtime/render" component={Render} />
        <Route path="/api/runtime/use-async-output" component={UseAsyncOutput} />
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
        <Route path="/architecture/reactive-system" component={ReactiveSystem} />
        <Route path="/architecture/reconciliation" component={Reconciliation} />
        <Route path="/architecture/fiber-model" component={FiberModel} />
        <Route path="/architecture/state-machine" component={StateMachine} />
        <Route path="/architecture/memory-system" component={MemorySystem} />
      </Route>
    </HashRouter>
  ),
  root
);
