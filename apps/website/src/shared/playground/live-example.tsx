import {
  type Component,
  onMount,
  onCleanup,
  createSignal,
  Show,
} from "solid-js";
import type { EditorView } from "codemirror";
import { createEditor } from "./editor";
import { runSource, prefetchRuntime } from "./runner";
import { createInspectorStream } from "./stream";
import Inspector from "./inspector";
import { DEMOS } from "./demos";

// An inline, runnable CReact example embedded in the docs. It stays out of the
// way — a compact poster — until the reader chooses to interact. The runtime
// warms in the background as the example nears the viewport, so activating it
// is near-instant. Once live, the resource inspector shows the real app
// running in a browser Node runtime; only its leaf effects are mocked.
const LiveExample: Component<{ app: string; height?: string }> = (props) => {
  const demo = () => DEMOS[props.app]!;
  let rootEl!: HTMLDivElement;
  let editorEl: HTMLDivElement | undefined;
  let editor: EditorView | undefined;
  const [active, setActive] = createSignal(false);
  const [running, setRunning] = createSignal(false);
  const [showCode, setShowCode] = createSignal(false);
  const { state, feed, reset } = createInspectorStream();

  async function run() {
    if (running()) return;
    setRunning(true);
    reset();
    try {
      await runSource(props.app, editor?.state.doc.toString() ?? demo().source, feed);
    } catch (err) {
      feed(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      setRunning(false);
    }
  }

  // Activate on demand: reveal the inspector and start the app.
  function activate() {
    if (active()) return;
    setActive(true);
    void run();
  }

  function toggleCode() {
    const next = !showCode();
    setShowCode(next);
    if (next && editorEl && !editor) {
      editor = createEditor(editorEl, demo().source);
    }
  }

  onMount(() => {
    // Warm the runtime in the background when the example nears the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          prefetchRuntime();
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(rootEl);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="cx-live" ref={rootEl} classList={{ "cx-live-active": active() }}>
      <Show when={!active()}>
        <button class="cx-poster" onClick={activate}>
          <span class="cx-poster-play">▶</span>
          <span class="cx-poster-text">
            Run <strong>{demo().title}</strong> live
            <span class="cx-poster-sub">real Node, in your browser</span>
          </span>
        </button>
      </Show>

      <Show when={active()}>
        <div class="cx-live-bar">
          <span class="cx-live-title">{demo().title}</span>
          <div class="cx-live-actions">
            <button class="cx-toggle" onClick={toggleCode}>
              {showCode() ? "Hide code" : "Edit code"}
            </button>
            <button class="cx-run" onClick={run} disabled={running()}>
              {running() ? "Running…" : "▶ Run"}
            </button>
          </div>
        </div>
        <div
          class="cx-live-body"
          classList={{ "cx-code-hidden": !showCode() }}
          style={{ height: props.height ?? "380px" }}
        >
          <div
            class="cx-live-editor"
            ref={editorEl}
            classList={{ "cx-hidden": !showCode() }}
          />
          <div class="cx-live-inspector">
            <Inspector state={state} panel={demo().panel} />
            <Show when={state.console.trim()}>
              <pre class="cx-console">{state.console}</pre>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default LiveExample;
