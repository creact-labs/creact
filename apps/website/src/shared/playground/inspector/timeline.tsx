import { type Component, For, Show } from "solid-js";
import type { TimelineEvent } from "../stream";

const KIND_LABEL: Record<string, string> = {
  mount: "mount",
  output: "output",
  fs: "fs",
  http: "http",
  ai: "ai",
};

const Timeline: Component<{ events: TimelineEvent[] }> = (props) => {
  // Newest first, so the live edge is always in view.
  const recent = () => props.events.slice(-40).reverse();
  return (
    <div class="cx-timeline">
      <div class="cx-panel-title">Event timeline</div>
      <Show
        when={recent().length}
        fallback={<div class="cx-empty">No events yet.</div>}
      >
        <For each={recent()}>
          {(event) => (
            <div class="cx-event">
              <span class={`cx-event-kind cx-event-${event.kind}`}>
                {KIND_LABEL[event.kind] ?? event.kind}
              </span>
              <span class="cx-event-label">{event.label}</span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
};

export default Timeline;
