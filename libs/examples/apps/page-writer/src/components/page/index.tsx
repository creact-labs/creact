// #region states
import { createRenderEffect, getOwner, Match, onCleanup, runWithOwner, Switch, useAsyncOutput, type Handler, type OutputAccessors, type Owner } from "@creact-labs/creact";
import { mkdir, writeFile } from "node:fs/promises";
import { writeHtml } from "../../claude/html-writer";

export type PageState = "writing" | "ready" | "failed";
export interface PageOutputs { state: PageState; file: string | undefined; error: string | undefined }
interface PageRequest { slug: string; prompt: string }

export function Page(props: PageRequest & { onState: (slug: string, outputs: PageOutputs) => void }) {
  const owner = getOwner();
  const page = useAsyncOutput<PageOutputs, PageRequest>({ slug: props.slug, prompt: props.prompt }, writePage(owner));
  createRenderEffect(() => props.onState(props.slug, snapshot(page)));
  return (
    <Switch>
      <Match when={() => page.state() === "writing"}>{() => <StatusLine slug={props.slug} note="Claude is writing" />}</Match>
      <Match when={() => page.state() === "ready"}>{() => <StatusLine slug={props.slug} note={`live at ${page.file()}`} />}</Match>
      <Match when={() => page.state() === "failed"}>{() => <StatusLine slug={props.slug} note={page.error() ?? "generation failed"} />}</Match>
    </Switch>
  );
}
// #endregion states

// #region generate-handler
export function restoreOrWrite(prev: Partial<PageOutputs> | undefined): { restored: boolean; next: PageOutputs } {
  const restored = prev?.state === "ready" && Boolean(prev.file);
  return { restored, next: restored ? (prev as PageOutputs) : { state: "writing", file: undefined, error: undefined } };
}

type WriteSetOutputs = Parameters<Handler<PageRequest, PageOutputs>>[1];

export async function generatePage(owner: Owner | null, request: PageRequest, setOutputs: WriteSetOutputs): Promise<void> {
  let restored = false;
  setOutputs((prev) => {
    const decision = restoreOrWrite(prev);
    restored = decision.restored;
    return decision.next;
  });
  if (restored) return retainOnDetach(owner, request.slug);
  try {
    const html = await writeHtml(request.prompt);
    const file = await deployPage(request.slug, html);
    retainOnDetach(owner, request.slug);
    setOutputs({ state: "ready", file, error: undefined });
  } catch (error) {
    setOutputs({ state: "failed", file: undefined, error: error instanceof Error ? error.message : String(error) });
  }
}

function writePage(owner: Owner | null): Handler<PageRequest, PageOutputs> {
  return (request, setOutputs) => generatePage(owner, request, setOutputs);
}
// #endregion generate-handler

// #region deploy-write
async function deployPage(slug: string, html: string): Promise<string> {
  await mkdir("out", { recursive: true });
  const file = `out/${slug}.html`;
  await writeFile(file, html, "utf8");
  return file;
}

function retainOnDetach(owner: Owner | null, slug: string): void {
  const note = () => console.log(`[page-writer] ${slug} detached — out/${slug}.html stays on disk`);
  runWithOwner(owner, () => onCleanup(note));
}

function snapshot(page: OutputAccessors<PageOutputs>): PageOutputs {
  return { state: page.state() ?? "writing", file: page.file(), error: page.error() };
}

function StatusLine(props: { slug: string; note: string }) {
  console.log(`[page-writer] ${props.slug} — ${props.note}`);
  return <></>;
}
// #endregion deploy-write
