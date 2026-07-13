import { type Component, For, Show } from "solid-js";
import type { InspectorState, NodeSnapshot } from "../stream";
import { statusOf } from "./status";

export type PanelKind = "counter" | "uptime" | "fs" | "ai" | "tenant";

function nodesWith(state: InspectorState, key: string): NodeSnapshot[] {
  return state.nodes.filter((node) => key in node.outputs);
}

const CounterPanel: Component<{ state: InspectorState }> = (props) => {
  const node = () => nodesWith(props.state, "count")[0];
  return (
    <div class="cx-panel cx-counter">
      <Show when={node()} fallback={<div class="cx-empty">Deploying…</div>}>
        <div class="cx-counter-value">{String(node()!.outputs.count)}</div>
        <div class="cx-counter-caption">
          {node()!.key} · persisted to Memory every tick
        </div>
      </Show>
    </div>
  );
};

const UptimePanel: Component<{ state: InspectorState }> = (props) => {
  const targets = () =>
    props.state.nodes.filter((n) => "status" in n.outputs && ("code" in n.outputs || "url" in n.outputs));
  return (
    <div class="cx-panel cx-grid">
      <Show when={targets().length} fallback={<div class="cx-empty">Probing targets…</div>}>
        <For each={targets()}>
          {(node) => (
            <div class={`cx-card cx-card-${statusOf(node)}`}>
              <div class="cx-card-key">{node.key}</div>
              <div class="cx-card-status">{String(node.outputs.status)}</div>
              <Show when={node.outputs.code}>
                <div class="cx-card-meta">HTTP {String(node.outputs.code)}</div>
              </Show>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

const FsPanel: Component<{ state: InspectorState }> = (props) => {
  const paths = () => Object.keys(props.state.files).sort();
  return (
    <div class="cx-panel cx-fs">
      <Show when={paths().length} fallback={<div class="cx-empty">No files written yet.</div>}>
        <For each={paths()}>
          {(path) => (
            <div class="cx-fs-file">
              <span class="cx-fs-icon">▪</span>
              {path}
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

const AiPanel: Component<{ state: InspectorState }> = (props) => {
  const streams = () => Object.values(props.state.ai);
  return (
    <div class="cx-panel cx-ai">
      <Show when={streams().length} fallback={<div class="cx-empty">Waiting for generation…</div>}>
        <For each={streams()}>
          {(stream) => (
            <div class="cx-ai-card">
              <div class="cx-ai-prompt">{stream.prompt}</div>
              <div class="cx-ai-text">
                {stream.text}
                <Show when={!stream.done}>
                  <span class="cx-ai-cursor">▋</span>
                </Show>
              </div>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

const TenantPanel: Component<{ state: InspectorState }> = (props) => {
  // Each tenant is a sovereign sub-runtime; its wrapper node carries the
  // runtime-provided status (deploying → ready), and the region is its key.
  const tenants = () => props.state.nodes;
  return (
    <div class="cx-panel cx-grid">
      <Show when={tenants().length} fallback={<div class="cx-empty">Spawning tenants…</div>}>
        <For each={tenants()}>
          {(node) => (
            <div class={`cx-card cx-card-${statusOf(node)}`}>
              <div class="cx-card-key">{node.key}</div>
              <div class="cx-card-status">{String(node.outputs.status ?? "…")}</div>
              <Show when={node.outputs.region}>
                <div class="cx-card-meta">{String(node.outputs.region)}</div>
              </Show>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

const PANELS: Record<PanelKind, Component<{ state: InspectorState }>> = {
  counter: CounterPanel,
  uptime: UptimePanel,
  fs: FsPanel,
  ai: AiPanel,
  tenant: TenantPanel,
};

const Panel: Component<{ kind: PanelKind; state: InspectorState }> = (props) => {
  const Chosen = PANELS[props.kind];
  return <Chosen state={props.state} />;
};

export default Panel;
