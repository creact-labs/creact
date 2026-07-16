import { type Component, onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { createEditor, type Editor } from "@/shared/playground/editor";
import { runApp } from "@/shared/playground/runner";
import { appSources } from "@/shared/playground/sources";
import { DEMOS } from "@/shared/playground/apps";

const ENTRY = "index.tsx";

function isEditable(path: string): boolean {
  return path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".json");
}

function orderFiles(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    if (a === ENTRY) return -1;
    if (b === ENTRY) return 1;
    return a.localeCompare(b);
  });
}

const Playground: Component = () => {
  const params = useParams();
  const app = () => params.app ?? "";
  const meta = () => DEMOS[app()];
  const contents: Record<string, string> = { ...appSources(app()).files };

  let editorEl!: HTMLDivElement;
  let termEl!: HTMLDivElement;
  let editor: Editor | undefined;
  let term: Terminal | undefined;
  const [active, setActive] = createSignal(ENTRY);
  const [running, setRunning] = createSignal(false);

  function saveActive() {
    if (editor) contents[active()] = editor.getValue();
  }

  function openFile(name: string) {
    saveActive();
    setActive(name);
    editor?.dispose();
    editor = undefined;
    if (isEditable(name)) editor = createEditor(editorEl, contents[name] ?? "", name);
  }

  async function run() {
    if (running() || !meta()) return;
    saveActive();
    setRunning(true);
    term?.clear();
    term?.writeln("$ node index.mjs\r");
    try {
      await runApp(app(), contents, (chunk) => term?.write(chunk));
    } catch (err) {
      term?.writeln(`\r\nBuild error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  onMount(() => {
    if (!meta()) return;
    editor = createEditor(editorEl, contents[ENTRY] ?? "", ENTRY);
    term = new Terminal({
      convertEol: true,
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      theme: { background: "#0a0a0a" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termEl);
    fit.fit();
    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
    void run();
  });

  return (
    <Show when={meta()} fallback={<UnknownApp />}>
      <div class="pg">
        <div class="pg-header">
          <a class="pg-back" href={`#/docs/examples/${app()}`}>
            ← Docs
          </a>
          <span class="pg-title">{meta()!.title}</span>
          <button class="pg-run" onClick={run} disabled={running()}>
            {running() ? "Running…" : "▶ Run"}
          </button>
        </div>
        <div class="pg-body">
          <div class="pg-files">
            <For each={orderFiles(Object.keys(contents))}>
              {(name) => (
                <button
                  class="pg-file"
                  classList={{ active: active() === name }}
                  onClick={() => openFile(name)}
                >
                  {name}
                </button>
              )}
            </For>
          </div>
          <div class="pg-main">
            <div class="pg-editor-area">
              <div ref={editorEl} class="pg-editor" classList={{ hidden: !isEditable(active()) }} />
              <Show when={!isEditable(active())}>
                <pre class="pg-readonly">{contents[active()]}</pre>
              </Show>
            </div>
            <div class="pg-terminal-wrap">
              <div class="pg-pane-label">Terminal</div>
              <div ref={termEl} class="pg-terminal" />
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

const UnknownApp: Component = () => (
  <div class="pg-unknown">
    <p>Unknown example.</p>
    <a href="#/docs">← Back to docs</a>
  </div>
);

export default Playground;
