import { type Component } from "solid-js";
import type { InspectorState } from "../stream";
import NodeTree from "./node-tree";
import Timeline from "./timeline";
import Panel, { type PanelKind } from "./panels";

// The inspector shell: the foreground resource panel (per demo) on top, the
// resource tree and the event timeline below. All three read the same live
// stream state, so they update together as the app runs.
const Inspector: Component<{ state: InspectorState; panel: PanelKind }> = (props) => {
  return (
    <div class="cx-inspector">
      <div class="cx-panel-frame">
        <Panel kind={props.panel} state={props.state} />
      </div>
      <div class="cx-lower">
        <NodeTree nodes={props.state.nodes} />
        <Timeline events={props.state.events} />
      </div>
    </div>
  );
};

export default Inspector;
export type { PanelKind };
