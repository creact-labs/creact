import { createStore, produce } from "solid-js/store";

const MARKER = "CX";

export interface NodeSnapshot {
  id: string;
  path: string[];
  key: string;
  outputs: Record<string, unknown>;
}

export interface TimelineEvent {
  kind: string;
  node?: string;
  label: string;
  ts: number;
}

export interface HttpCall {
  method: string;
  url: string;
  status: number;
  ms: number;
  ts: number;
}

export interface AiState {
  node: string;
  prompt: string;
  text: string;
  done: boolean;
}

export interface InspectorState {
  nodes: NodeSnapshot[];
  events: TimelineEvent[];
  files: Record<string, string>;
  http: HttpCall[];
  ai: Record<string, AiState>;
  console: string;
}

const EMPTY: InspectorState = {
  nodes: [],
  events: [],
  files: {},
  http: [],
  ai: {},
  console: "",
};

// The container streams output through a PTY, which frames writes with ANSI
// escapes and control bytes. Strip them (keeping newlines) so our marker lands
// at the start of a clean line. ESC-introduced CSI sequences go first, before
// the bare control-byte pass that would otherwise leave the trailing "[…m".
const ANSI = new RegExp("\\u001b\\[[0-9;?]*[a-zA-Z]", "g");
const CONTROL = new RegExp("[\\u0000-\\u0009\\u000b-\\u001f\\u007f]", "g");

function sanitize(chunk: string): string {
  return chunk.replace(ANSI, "").replace(CONTROL, "");
}

/**
 * A reactive sink for the container's stdout. Feed it raw chunks; it splits
 * lines, routes MARKER-prefixed JSON records into structured state, and
 * accumulates everything else as console text.
 */
export function createInspectorStream() {
  const [state, setState] = createStore<InspectorState>({ ...EMPTY });
  let buffer = "";

  function reset() {
    setState({ ...EMPTY, ai: {}, files: {}, http: [], events: [], nodes: [] });
    buffer = "";
  }

  function handleRecord(record: Record<string, unknown>) {
    switch (record.t) {
      case "tree":
        setState("nodes", record.nodes as NodeSnapshot[]);
        break;
      case "event":
        setState(
          "events",
          produce((events: TimelineEvent[]) => {
            events.push(record as unknown as TimelineEvent);
            if (events.length > 200) events.shift();
          }),
        );
        break;
      case "fs":
        if (record.op === "write") {
          setState("files", record.path as string, "");
        }
        break;
      case "http":
        setState(
          "http",
          produce((calls: HttpCall[]) => {
            calls.push(record as unknown as HttpCall);
            if (calls.length > 100) calls.shift();
          }),
        );
        break;
      case "ai":
        handleAi(record);
        break;
    }
  }

  function handleAi(record: Record<string, unknown>) {
    const node = (record.node as string) ?? "ai";
    if (record.op === "start") {
      setState("ai", node, {
        node,
        prompt: record.prompt as string,
        text: "",
        done: false,
      });
    } else if (record.op === "token") {
      setState("ai", node, "text", (t) => t + (record.token as string));
    } else if (record.op === "done") {
      setState(
        "ai",
        node,
        produce((ai: AiState) => {
          ai.text = record.text as string;
          ai.done = true;
        }),
      );
    }
  }

  function feed(rawChunk: string) {
    buffer += sanitize(rawChunk);
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith(MARKER)) {
        try {
          handleRecord(JSON.parse(line.slice(MARKER.length)));
          continue;
        } catch {
          // fall through — treat as console text
        }
      }
      if (line.length) setState("console", (c) => c + line + "\n");
    }
  }

  return { state, feed, reset };
}
