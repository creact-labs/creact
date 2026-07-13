// Runs INSIDE the browser Node runtime (WebContainer), alongside a demo app.
// It observes the real CReact runtime and the mocked effects, and emits
// newline-delimited JSON records to stdout. The host page parses lines that
// start with the MARKER and drives the visual inspector from them; every
// other line is ordinary console output shown in a console pane.
//
// This file is plain JS on purpose: it is mounted verbatim into the container
// (no compile step) and imported by the compiled demo entry via "./inspector".

const MARKER = "CX";

function emit(record) {
  process.stdout.write(MARKER + JSON.stringify(record) + "\n");
}

let clock = 0;
// Date.now() is monotonic enough, but a per-record counter keeps the host
// timeline stable and independent of the container's wall clock.
function tick() {
  return ++clock;
}

// ---------------------------------------------------------------------------
// Tree reporter — polls the live node list and emits a snapshot whenever it
// changes, plus a discrete "output" event for each field that changed.
// ---------------------------------------------------------------------------

function safe(value) {
  // Reduce arbitrary output values to something JSON-serialisable and small.
  if (value === null || value === undefined) return value;
  if (typeof value === "function") return "ƒ";
  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
  return value;
}

function serializeNode(node) {
  const outputs = {};
  for (const [key, value] of Object.entries(node.outputs ?? {})) {
    outputs[key] = safe(value);
  }
  const key = node.path[node.path.length - 1] ?? node.id;
  return { id: node.id, path: node.path, key, outputs };
}

function outputsChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

// Begin streaming the tree of a render() result. Diffs each poll against the
// last snapshot so the host receives both a full tree and granular events.
export function inspect(result, options = {}) {
  const interval = options.interval ?? 120;
  const previous = new Map();
  let lastTreeJson = "";

  function poll() {
    let nodes;
    try {
      nodes = result.getNodes();
    } catch {
      return;
    }
    const serialized = nodes.map(serializeNode);

    for (const node of serialized) {
      const before = previous.get(node.id);
      if (!before) {
        emit({ t: "event", kind: "mount", node: node.id, label: node.key, ts: tick() });
      } else if (outputsChanged(before.outputs, node.outputs)) {
        for (const [field, value] of Object.entries(node.outputs)) {
          if (JSON.stringify(before.outputs[field]) !== JSON.stringify(value)) {
            emit({
              t: "event",
              kind: "output",
              node: node.id,
              label: `${node.key}.${field} → ${format(value)}`,
              ts: tick(),
            });
          }
        }
      }
      previous.set(node.id, node);
    }

    const treeJson = JSON.stringify(serialized);
    if (treeJson !== lastTreeJson) {
      lastTreeJson = treeJson;
      emit({ t: "tree", nodes: serialized });
    }
  }

  void result.ready?.then?.(poll).catch(() => {});
  poll();
  const timer = setInterval(poll, interval);
  // Keep the process alive for the duration of the demo.
  if (timer.unref) timer.unref();
  return () => clearInterval(timer);
}

function format(value) {
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return s.length > 40 ? s.slice(0, 39) + "…" : s;
}

// ---------------------------------------------------------------------------
// Mock effect adapters — the only things swapped out from a production app.
// Each records what it did so the effect becomes visible in the inspector.
// ---------------------------------------------------------------------------

// A durable Memory kept in RAM. Real apps swap in FileMemory/DynamoDB; the
// runtime code path is identical.
export class InspectMemory {
  constructor() {
    this.store = new Map();
  }
  async getState(stack) {
    return this.store.get(stack) ?? null;
  }
  async saveState(stack, state) {
    this.store.set(stack, state);
  }
}

// A virtual filesystem. Writing a file emits an "fs" event so the host can
// grow a live file tree and preview contents.
export class VirtualFs {
  constructor() {
    this.files = new Map();
  }
  write(path, contents) {
    this.files.set(path, contents);
    emit({ t: "fs", op: "write", path, size: contents.length, ts: tick() });
    emit({ t: "event", kind: "fs", label: `wrote ${path}`, ts: tick() });
  }
  read(path) {
    return this.files.get(path);
  }
  snapshot() {
    return Object.fromEntries(this.files);
  }
}

// A mock HTTP client. Routes map URL → { status, delay, body }. Each call is
// logged so the host can render a request table.
export function mockFetch(routes = {}) {
  return async function fetchLike(url, init = {}) {
    const route = routes[url] ?? { status: 200, body: "" };
    if (route.delay) await new Promise((r) => setTimeout(r, route.delay));
    emit({
      t: "http",
      method: (init.method ?? "GET").toUpperCase(),
      url,
      status: route.status,
      ms: route.delay ?? 0,
      ts: tick(),
    });
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      async text() {
        return route.body ?? "";
      },
      async json() {
        return route.body ? JSON.parse(route.body) : null;
      },
    };
  };
}

// A mock AI client that streams canned tokens with a typewriter cadence,
// emitting each token so the host can show generation happening live.
export function mockAI(script = {}) {
  return {
    async generate(prompt, opts = {}) {
      const text = script[prompt] ?? script.default ?? "Generated content.";
      const node = opts.node ?? "ai";
      emit({ t: "ai", op: "start", node, prompt: format(prompt), ts: tick() });
      let out = "";
      for (const token of text.split(/(\s+)/)) {
        out += token;
        emit({ t: "ai", op: "token", node, token, ts: tick() });
        await new Promise((r) => setTimeout(r, 45));
      }
      emit({ t: "ai", op: "done", node, text: out, ts: tick() });
      return out;
    },
  };
}
