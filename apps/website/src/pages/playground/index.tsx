import { type Component, onMount, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { embed } from "@/shared/playground/stackblitz";
import { DEMOS } from "@/shared/playground/apps";

// The playground is the real thing: a StackBlitz WebContainer IDE running the
// actual example — editor, terminal, npm install, `creact` CLI, live output.
const Playground: Component = () => {
  const params = useParams();
  const app = () => params.app ?? "";
  const meta = () => DEMOS[app()];

  let host!: HTMLDivElement;
  onMount(() => {
    const m = meta();
    if (m) void embed(host, m.id, m.title);
  });

  return (
    <Show when={meta()} fallback={<UnknownApp />}>
      <div class="pg">
        <div class="pg-header">
          <a class="pg-back" href={`#/docs/examples/${app()}`}>
            ← Docs
          </a>
          <span class="pg-title">{meta()!.title}</span>
          <span class="pg-sub">the real example, running on @creact-labs/creact</span>
        </div>
        <div class="pg-embed">
          <div ref={host} class="pg-embed-slot" />
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
