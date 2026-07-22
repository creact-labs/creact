import {
  render as coreRender,
  type InstanceNode,
  type Memory,
  type RenderOptions,
} from "@creact-labs/creact";
import { NoopMemory } from "./memory";
import { waitFor, type WaitOptions } from "./wait-for";

/** A queried node, with ergonomic accessors over its runtime outputs. */
export interface TestNode {
  /** The underlying runtime node — an escape hatch for advanced assertions. */
  readonly node: InstanceNode;
  readonly id: string;
  /** The element key that addressed it, if it was keyed. */
  readonly key: string | number | undefined;
  /** The `testId` prop it was rendered with, if any. */
  readonly testId: string | undefined;
  /** Read one output by name — undefined until the handler sets it. */
  output(name: string): unknown;
  /** All current outputs as a plain object. */
  outputs(): Record<string, unknown>;
}

export interface RenderTestOptions extends RenderOptions {
  /** Backend to persist against; defaults to a no-op (nothing is saved). */
  memory?: Memory;
  /** Stack name; defaults to "test". */
  id?: string;
}

/** The result of `render` — deployed nodes plus RTL-style queries over them. */
export interface TestView {
  readonly ready: Promise<void>;
  settled(): Promise<void>;
  dispose(): void;
  /** Every deployed node — the creact analogue of RTL's container. */
  nodes(): TestNode[];
  getByTestId(testId: string): TestNode;
  queryByTestId(testId: string): TestNode | null;
  findByTestId(testId: string, options?: WaitOptions): Promise<TestNode>;
  getByKey(key: string | number): TestNode;
  queryByKey(key: string | number): TestNode | null;
  findByKey(key: string | number, options?: WaitOptions): Promise<TestNode>;
  getByType(type: unknown): TestNode;
  queryByType(type: unknown): TestNode | null;
  getAllByType(type: unknown): TestNode[];
  findByType(type: unknown, options?: WaitOptions): Promise<TestNode>;
  /** Retry until the callback returns truthy (see the standalone `waitFor`). */
  waitFor<T>(
    callback: () => T | PromiseLike<T>,
    options?: WaitOptions,
  ): Promise<T>;
}

function wrap(node: InstanceNode): TestNode {
  return {
    node,
    id: node.id,
    key: node.key,
    testId: node.testId,
    output: (name) => node.outputSignals.get(name)?.[0](),
    outputs: () => {
      const all: Record<string, unknown> = {};
      for (const [name, [read]] of node.outputSignals) all[name] = read();
      return all;
    },
  };
}

// RTL's get/query/getAll/find trichotomy, factored once over a predicate.
function queryAll(
  getNodes: () => InstanceNode[],
  predicate: (n: InstanceNode) => boolean,
): TestNode[] {
  return getNodes().filter(predicate).map(wrap);
}

function getAll(
  getNodes: () => InstanceNode[],
  predicate: (n: InstanceNode) => boolean,
  what: string,
): TestNode[] {
  const found = queryAll(getNodes, predicate);
  if (found.length === 0) throw new Error(`No node found for ${what}`);
  return found;
}

function query(
  getNodes: () => InstanceNode[],
  predicate: (n: InstanceNode) => boolean,
  what: string,
): TestNode | null {
  const found = queryAll(getNodes, predicate);
  if (found.length > 1) throw new Error(`Multiple nodes found for ${what}`);
  return found[0] ?? null;
}

function getOne(
  getNodes: () => InstanceNode[],
  predicate: (n: InstanceNode) => boolean,
  what: string,
): TestNode {
  const found = getAll(getNodes, predicate, what);
  if (found.length > 1) throw new Error(`Multiple nodes found for ${what}`);
  return found[0]!;
}

const byTestId = (testId: string) => (n: InstanceNode) => n.testId === testId;
const byKey = (key: string | number) => (n: InstanceNode) => n.key === key;
const byType = (type: unknown) => (n: InstanceNode) => n.type === type;

function typeLabel(type: unknown): string {
  const name = typeof type === "function" ? type.name : String(type);
  return `type ${name || "(anonymous)"}`;
}

/**
 * Render a component tree for a test and get back deployed nodes plus queries.
 * Like React Testing Library's `render`, but you observe nodes/outputs instead
 * of DOM. `get*` throws unless exactly one node matches, `query*` returns null
 * when none match, and `find*` waits for a match to appear.
 */
export function render(
  ui: () => unknown,
  options: RenderTestOptions = {},
): TestView {
  const memory = options.memory ?? new NoopMemory();
  const result = coreRender(ui, memory, options.id ?? "test", options);
  const getNodes = () => result.getNodes();

  return {
    ready: result.ready,
    settled: () => result.settled(),
    dispose: () => result.dispose(),
    nodes: () => getNodes().map(wrap),
    getByTestId: (testId) =>
      getOne(getNodes, byTestId(testId), `testId "${testId}"`),
    queryByTestId: (testId) =>
      query(getNodes, byTestId(testId), `testId "${testId}"`),
    findByTestId: (testId, opts) =>
      waitFor(
        () => getOne(getNodes, byTestId(testId), `testId "${testId}"`),
        opts,
      ),
    getByKey: (key) => getOne(getNodes, byKey(key), `key "${key}"`),
    queryByKey: (key) => query(getNodes, byKey(key), `key "${key}"`),
    findByKey: (key, opts) =>
      waitFor(() => getOne(getNodes, byKey(key), `key "${key}"`), opts),
    getByType: (type) => getOne(getNodes, byType(type), typeLabel(type)),
    queryByType: (type) => query(getNodes, byType(type), typeLabel(type)),
    getAllByType: (type) => getAll(getNodes, byType(type), typeLabel(type)),
    findByType: (type, opts) =>
      waitFor(() => getOne(getNodes, byType(type), typeLabel(type)), opts),
    waitFor: (callback, opts) => waitFor(callback, opts),
  };
}
