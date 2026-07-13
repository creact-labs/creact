// #region requests-store
import {
  createEffect, createMemo, createRoot, createSelector, createSignal, For, useAsyncOutput,
  type Accessor, type Handler,
} from "@creact-labs/creact";
import { slugify } from "./claude/html-writer";
import { HttpChannel } from "./components/http-channel";
import { Page, type PageOutputs } from "./components/page";

interface PageRequest { slug: string; prompt: string; requestedAt: string }
interface RequestLedger { requests: PageRequest[] }

function useRequestLedger() {
  let persist!: Parameters<Handler<unknown, RequestLedger>>[1];
  const ledger = useAsyncOutput<RequestLedger>({}, (_, setOutputs) => {
    persist = setOutputs;
    setOutputs((prev) => ({ requests: prev?.requests ?? [] }));
  });
  const append = (entry: PageRequest) =>
    persist((prev) => ({ requests: [...(prev?.requests ?? []), entry] }));
  return { requests: () => ledger.requests() ?? [], append };
}
// #endregion requests-store

// #region hero
export function App() {
  const pages = usePageRequests();
  const port = Number(process.env.PORT ?? "3000");
  return (
    <>
      <HttpChannel key="api" port={port} onCreatePage={pages.add} onListPages={pages.list} />
      <For each={pages.requests} keyFn={(request) => request.slug}>
        {(request) => (
          <Page
            key={request().slug}
            slug={request().slug}
            prompt={request().prompt}
            onState={pages.recordState}
          />
        )}
      </For>
    </>
  );
}
// #endregion hero

// #region wiring
type StatesBySlug = Record<string, PageOutputs>;

function usePageRequests() {
  const ledger = useRequestLedger();
  const [states, setStates] = createSignal<StatesBySlug>({});
  const isLatest = createSelector(createMemo(
    () => [...ledger.requests()].reverse().find((request) => states()[request.slug]?.state === "ready")?.slug,
  ));
  const add = (prompt: string) => {
    const slug = slugify(prompt);
    if (!ledger.requests().some((request) => request.slug === slug)) {
      ledger.append({ slug, prompt, requestedAt: new Date().toISOString() });
      watchUntilSettled(slug, states);
    }
    return { slug, state: states()[slug]?.state ?? "writing" };
  };
  const recordState = (slug: string, next: PageOutputs) => setStates((prev) => ({ ...prev, [slug]: next }));
  const list = () =>
    ledger.requests().map((request) => ({ ...request, ...(states()[request.slug] ?? { state: "writing" }), latest: isLatest(request.slug) }));
  return { requests: ledger.requests, add, recordState, list };
}
// #endregion wiring

// #region settled-watch
function watchUntilSettled(slug: string, states: Accessor<StatesBySlug>): void {
  createRoot((dispose) => {
    createEffect((settled: boolean | undefined) => {
      if (settled) return true;
      const state = states()[slug]?.state;
      if (state !== "ready" && state !== "failed") return false;
      console.log(`[page-writer] request ${slug} settled: ${state}`);
      dispose();
      return true;
    });
  });
}
// #endregion settled-watch
