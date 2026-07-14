import {
  type Component,
  onMount,
  onCleanup,
  createSignal,
  createEffect,
  Show,
  For,
} from "solid-js";
import { createCodeView, type CodeView } from "./code-view";
import { runSource } from "./runner";
import { createInspectorStream } from "./stream";
import Inspector from "./inspector";
import { DEMOS, stepForProgress } from "./demos";

// A scroll-driven, viewport-filling stage for one CReact example. The code is
// always on the left and the live resource inspector on the right — never a
// toggle. As the reader scrolls through the section the stage pins and steps
// through a narrated walkthrough: the active code lines spotlight while the
// real app (booted in a browser Node runtime) drives the visualization. A
// fullscreen button opens an immersive, editable workspace.
const LiveExample: Component<{ app: string }> = (props) => {
  const demo = () => DEMOS[props.app]!;
  const steps = () => demo().steps;
  let sectionEl!: HTMLElement;
  let stageEl!: HTMLDivElement;
  let codeEl!: HTMLDivElement;
  let code: CodeView | undefined;
  const [step, setStep] = createSignal(0);
  const [running, setRunning] = createSignal(false);
  const [error, setError] = createSignal("");
  const [fullscreen, setFullscreen] = createSignal(false);
  const { state, feed, reset } = createInspectorStream();

  async function run() {
    if (running()) return;
    setRunning(true);
    setError("");
    reset();
    try {
      await runSource(props.app, code?.doc() ?? demo().source, feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  // Map the section's scroll position to the active step.
  function updateStep() {
    const rect = sectionEl.getBoundingClientRect();
    const scrollable = sectionEl.offsetHeight - window.innerHeight;
    const progress = scrollable > 0 ? -rect.top / scrollable : 0;
    setStep(stepForProgress(progress, steps().length));
  }

  function spotlightStep() {
    const active = steps()[step()];
    if (!code || !active) return;
    const from = code.lineOf(active.from);
    code.spotlight(from, active.to ? code.lineOf(active.to) : from);
  }

  createEffect(() => {
    step();
    spotlightStep();
  });

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await stageEl.requestFullscreen().catch(() => {});
    }
  }

  onMount(() => {
    code = createCodeView(codeEl, demo().source);
    updateStep();
    spotlightStep();

    const onScroll = () => updateStep();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("fullscreenchange", syncFullscreen);
    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("fullscreenchange", syncFullscreen);
    });

    // Boot and run once the section nears the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void run();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(sectionEl);
    onCleanup(() => io.disconnect());
  });

  function syncFullscreen() {
    setFullscreen(Boolean(document.fullscreenElement));
  }

  const runLabel = () => (running() ? "Running…" : "▶ Run");
  const sectionHeight = () => `${steps().length * 85 + 30}vh`;

  return (
    <section class="cx-stage-section" ref={sectionEl} style={{ height: sectionHeight() }}>
      <div class="cx-stage" ref={stageEl} classList={{ "cx-stage-fs": fullscreen() }}>
        <div class="cx-stage-bar">
          <span class="cx-stage-title">{demo().title}</span>
          <div class="cx-stage-actions">
            <button class="cx-run" onClick={run} disabled={running()}>
              {runLabel()}
            </button>
            <button class="cx-fs" onClick={toggleFullscreen} title="Fullscreen" aria-label="Fullscreen">
              ⤢
            </button>
          </div>
        </div>
        <div class="cx-stage-body">
          <div class="cx-stage-code" ref={codeEl} />
          <div class="cx-stage-viz">
            <Show when={error()}>
              <div class="cx-error">{error()}</div>
            </Show>
            <Inspector state={state} panel={demo().panel} />
            <Show when={state.console.trim()}>
              <pre class="cx-console">{state.console}</pre>
            </Show>
          </div>
        </div>
        <div class="cx-stage-caption">
          <span class="cx-step-dots">
            <For each={steps()}>
              {(_, i) => <span classList={{ on: i() === step() }} />}
            </For>
          </span>
          <span class="cx-step-text">{steps()[step()]?.caption}</span>
        </div>
      </div>
    </section>
  );
};

export default LiveExample;
