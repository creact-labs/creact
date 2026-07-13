/**
 * Samples for the Show API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createSignal, Show } from "@creact-labs/creact";

interface User {
  name: string;
  email: string;
}

interface SiteData {
  title: string;
}

const [isReady] = createSignal(false);
const [enabled] = createSignal(true);
const [user] = createSignal<User | undefined>(undefined);
const [data] = createSignal<SiteData | undefined>(undefined);

function Loading() {
  return <></>;
}

function App() {
  return <></>;
}

function Server(_props: { port: number }) {
  return <></>;
}

function Profile(_props: { name: string; email: string }) {
  return <></>;
}

function Placeholder() {
  return <></>;
}

function Display(_props: { data: SiteData }) {
  return <></>;
}

export function hero() {
  return (
    // #region hero
    <Show when={() => isReady()} fallback={<Loading />}>
      <App />
    </Show>
    // #endregion hero
  );
}

export function basicCondition() {
  return (
    // #region basic
    <Show when={() => enabled()}>
      <Server port={3000} />
    </Show>
    // #endregion basic
  );
}

export function callbackChildren() {
  return (
    // #region callback
    <Show when={() => user()}>
      {(u) => <Profile name={u().name} email={u().email} />}
    </Show>
    // #endregion callback
  );
}

export function withFallback() {
  return (
    // #region fallback
    <Show when={() => data()} fallback={<Placeholder />}>
      {(d) => <Display data={d()} />}
    </Show>
    // #endregion fallback
  );
}
