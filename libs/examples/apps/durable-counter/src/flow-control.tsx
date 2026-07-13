/**
 * Samples for the flow-control page. Each region is displayed by the
 * website; stub components and signals keep every fragment compiling
 * for real.
 */
import {
  createSignal,
  type JSXElement,
  Match as CreactMatch,
  Switch as CreactSwitch,
} from "@creact-labs/creact";

// The library's Match returns a MatchResult marker object rather than a
// JSXElement — the runtime resolves it, but TypeScript's JSX checker cannot
// express that. Loosen the pair locally so the published sample compiles
// exactly as written on the page.
const Switch = CreactSwitch as unknown as (props: {
  fallback?: JSXElement;
  children: JSXElement | JSXElement[];
}) => JSXElement;
const Match = CreactMatch as unknown as (props: {
  when: () => unknown;
  children: JSXElement | JSXElement[];
}) => JSXElement;

const [isReady] = createSignal(false);
const [user] = createSignal<{ name: string } | null>(null);
const [sites] = createSignal<{ name: string; html: string }[]>([]);
const [env] = createSignal("production");

function Loading() {
  return <></>;
}

function App() {
  return <></>;
}

function Profile(props: { name: string }) {
  void props;
  return <></>;
}

function WebSite(props: { name: () => string; content: () => string }) {
  void props;
  return <></>;
}

function DefaultHandler() {
  return <></>;
}

function ProductionDeploy() {
  return <></>;
}

function StagingDeploy() {
  return <></>;
}

function ErrorReport(props: { error: Error }) {
  void props;
  return <></>;
}

function RiskyOperation() {
  return <></>;
}

// #region show
import { Show } from "@creact-labs/creact";

<Show when={() => isReady()} fallback={<Loading />}>
  <App />
</Show>;
// #endregion show

// #region show-value
<Show when={() => user()}>{(u) => <Profile name={u().name} />}</Show>;
// #endregion show-value

// #region for
import { For } from "@creact-labs/creact";

<For each={() => sites()}>
  {(site) => <WebSite name={() => site().name} content={() => site().html} />}
</For>;
// #endregion for

// #region switch
<Switch fallback={<DefaultHandler />}>
  <Match when={() => env() === "production"}>
    <ProductionDeploy />
  </Match>
  <Match when={() => env() === "staging"}>
    <StagingDeploy />
  </Match>
</Switch>;
// #endregion switch

// #region error-boundary
import { ErrorBoundary } from "@creact-labs/creact";

<ErrorBoundary fallback={(err, reset) => <ErrorReport error={err} />}>
  <RiskyOperation />
</ErrorBoundary>;
// #endregion error-boundary

export {};
