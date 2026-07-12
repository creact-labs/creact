import { faker} from "@faker-js/faker";
import { describe, expect, it, vi} from "vitest";
import { generateInstanceNode, generateNodeAtPath} from "../__mocks__/generate-nodes";
import { buildDependencyGraph, computeParallelBatches, deepEqual, getReadyNodes, hasChanges, hasNewNodes, hasPropChanges, hasRemovedNodes, reconcile, topologicalSort} from "../reconcile";

describe("reconcile", () => {
  it("classifies added, changed, and removed resources", () => {
    const unchanged = generateInstanceNode();
    const changed = generateInstanceNode();
    const removed = generateInstanceNode();
    const added = generateInstanceNode();

    const changes = reconcile(
      [unchanged, changed, removed],
      [unchanged, { ...changed, props: { name: "different" } }, added],
    );

    expect(changes.creates.map((n) => n.id)).toEqual([added.id]);
    expect(changes.updates.map((n) => n.id)).toEqual([changed.id]);
    expect(changes.deletes.map((n) => n.id)).toEqual([removed.id]);
  });

  it("orders deployment parents before children", () => {
    const parent = generateNodeAtPath(["app"]);
    const child = generateNodeAtPath(["app", "db"]);
    const grandchild = generateNodeAtPath(["app", "db", "cache"]);

    const changes = reconcile([], [grandchild, child, parent]);

    expect(changes.deploymentOrder.indexOf(parent.id)).toBeLessThan(
      changes.deploymentOrder.indexOf(child.id),
    );
    expect(changes.deploymentOrder.indexOf(child.id)).toBeLessThan(
      changes.deploymentOrder.indexOf(grandchild.id),
    );
  });

  it("groups independent siblings into the same parallel batch", () => {
    const parent = generateNodeAtPath(["app"]);
    const dbChild = generateNodeAtPath(["app", "db"]);
    const apiChild = generateNodeAtPath(["app", "api"]);

    const changes = reconcile([], [parent, dbChild, apiChild]);

    expect(changes.parallelBatches[0]).toEqual([parent.id]);
    expect(changes.parallelBatches[1]).toEqual(
      expect.arrayContaining([dbChild.id, apiChild.id]),
    );
  });
});

describe("buildDependencyGraph", () => {
  it("links each node to its nearest ancestor that is also a resource", () => {
    const app = generateNodeAtPath(["app"]);
    // "app.middle" is not a resource — cache should skip to "app"
    const cache = generateNodeAtPath(["app", "middle", "cache"]);

    const graph = buildDependencyGraph([app, cache]);

    expect(graph.dependencies.get(cache.id)).toEqual([app.id]);
    expect(graph.dependents.get(app.id)).toEqual([cache.id]);
  });

  it("roots have no dependencies", () => {
    const root = generateNodeAtPath(["solo"]);

    const graph = buildDependencyGraph([root]);

    expect(graph.dependencies.get(root.id)).toEqual([]);
  });
});

describe("topologicalSort", () => {
  it("emits dependencies before dependents", () => {
    const a = generateNodeAtPath(["a"]);
    const b = generateNodeAtPath(["a", "b"]);
    const c = generateNodeAtPath(["a", "b", "c"]);
    const graph = buildDependencyGraph([a, b, c]);

    const order = topologicalSort([c.id, b.id, a.id], graph);

    expect(order).toEqual([a.id, b.id, c.id]);
  });

  it("warns about cycles but still returns every node", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const graph = {
        dependencies: new Map([
          ["x", ["y"]],
          ["y", ["x"]],
        ]),
        dependents: new Map([
          ["x", ["y"]],
          ["y", ["x"]],
        ]),
      };

      const order = topologicalSort(["x", "y"], graph);

      expect(order.sort()).toEqual(["x", "y"]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("Circular dependency"),
        expect.anything(),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("computeParallelBatches", () => {
  it("puts a dependency chain into sequential batches", () => {
    const a = generateNodeAtPath(["a"]);
    const b = generateNodeAtPath(["a", "b"]);
    const graph = buildDependencyGraph([a, b]);

    const batches = computeParallelBatches([a.id, b.id], graph);

    expect(batches).toEqual([[a.id], [b.id]]);
  });

  it("keeps unrelated nodes in one concurrent batch", () => {
    const a = generateNodeAtPath(["a"]);
    const b = generateNodeAtPath(["b"]);
    const graph = buildDependencyGraph([a, b]);

    const batches = computeParallelBatches([a.id, b.id], graph);

    expect(batches).toEqual([[a.id, b.id]]);
  });
});

describe("getReadyNodes", () => {
  it("holds back nodes whose dependency is still pending or running", () => {
    const parent = generateNodeAtPath(["p"]);
    const child = generateNodeAtPath(["p", "c"]);
    const graph = buildDependencyGraph([parent, child]);

    expect(
      getReadyNodes(
        new Set([parent.id, child.id]),
        new Set(),
        graph,
        new Set(),
      ),
    ).toEqual([parent.id]);

    expect(
      getReadyNodes(new Set([child.id]), new Set([parent.id]), graph, new Set()),
    ).toEqual([]);
  });

  it("treats nodes absent from the graph as dependency-free", () => {
    const emptyGraph = { dependencies: new Map(), dependents: new Map() };

    const ready = getReadyNodes(
      new Set(["ghost"]),
      new Set(),
      emptyGraph,
      new Set(),
    );

    expect(ready).toEqual(["ghost"]);
  });

  it("treats dependencies from an earlier pass (unknown here) as satisfied", () => {
    const parent = generateNodeAtPath(["p"]);
    const child = generateNodeAtPath(["p", "c"]);
    const graph = buildDependencyGraph([parent, child]);

    // parent deployed in a previous pass: not pending, not running, not in
    // this pass's deployed set
    const ready = getReadyNodes(
      new Set([child.id]),
      new Set(),
      graph,
      new Set(),
    );

    expect(ready).toEqual([child.id]);
  });

  it("releases a node once its dependency deployed", () => {
    const parent = generateNodeAtPath(["p"]);
    const child = generateNodeAtPath(["p", "c"]);
    const graph = buildDependencyGraph([parent, child]);

    const ready = getReadyNodes(
      new Set([child.id]),
      new Set(),
      graph,
      new Set([parent.id]),
    );

    expect(ready).toEqual([child.id]);
  });
});

describe("graph queries with ids outside the graph", () => {
  it("topologicalSort treats unknown ids as dependency-free", () => {
    const emptyGraph = { dependencies: new Map(), dependents: new Map() };

    expect(topologicalSort(["ghost-1", "ghost-2"], emptyGraph)).toEqual([
      "ghost-1",
      "ghost-2",
    ]);
  });

  it("topologicalSort ignores dependents that are outside the sorted set", () => {
    const parent = generateNodeAtPath(["p"]);
    const child = generateNodeAtPath(["p", "c"]);
    const graph = buildDependencyGraph([parent, child]);

    // Sorting only the parent — its dependent (child) is not in the set
    expect(topologicalSort([parent.id], graph)).toEqual([parent.id]);
  });

  it("computeParallelBatches treats unknown ids as batch zero", () => {
    const emptyGraph = { dependencies: new Map(), dependents: new Map() };

    expect(computeParallelBatches(["ghost"], emptyGraph)).toEqual([["ghost"]]);
  });
});

describe("change detection helpers", () => {
  const base = generateInstanceNode();

  it.each([
    {
      label: "a new node appears",
      prev: [base],
      curr: [base, generateInstanceNode()],
      expected: true,
    },
    {
      label: "a node disappears",
      prev: [base, generateInstanceNode()],
      curr: [base],
      expected: true,
    },
    {
      label: "props change on an existing node",
      prev: [base],
      curr: [{ ...base, props: { changed: true } }],
      expected: true,
    },
    { label: "nothing changed", prev: [base], curr: [base], expected: false },
  ])("hasChanges: $label → $expected", ({ prev, curr, expected }) => {
    expect(hasChanges(prev, curr)).toBe(expected);
  });

  it("individual detectors agree with their specific change type", () => {
    const added = generateInstanceNode();

    expect(hasNewNodes([base], [base, added])).toBe(true);
    expect(hasNewNodes([base], [base])).toBe(false);
    expect(hasRemovedNodes([base, added], [base])).toBe(true);
    expect(hasRemovedNodes([base], [base])).toBe(false);
    expect(hasPropChanges([base], [{ ...base, props: { x: 1 } }])).toBe(true);
    expect(hasPropChanges([base], [base])).toBe(false);
    // brand-new nodes are creates, not prop changes
    expect(hasPropChanges([base], [base, generateInstanceNode()])).toBe(false);
  });
});

describe("deepEqual (prop diffing)", () => {
  const now = faker.date.recent();

  it.each([
    { label: "identical primitives", a: 7, b: 7, expected: true },
    { label: "different primitives", a: 7, b: 8, expected: false },
    { label: "string vs number", a: "7", b: 7, expected: false },
    { label: "null vs value", a: null, b: 1, expected: false },
    { label: "NaN equals NaN", a: NaN, b: NaN, expected: true },
    { label: "NaN vs number", a: NaN, b: 0, expected: false },
    { label: "equal nested objects", a: { x: { y: 1 } }, b: { x: { y: 1 } }, expected: true },
    { label: "nested value differs", a: { x: { y: 1 } }, b: { x: { y: 2 } }, expected: false },
    { label: "extra key", a: { x: 1 }, b: { x: 1, y: 2 }, expected: false },
    { label: "different key sets", a: { x: 1 }, b: { y: 1 }, expected: false },
    { label: "equal arrays", a: [1, [2]], b: [1, [2]], expected: true },
    { label: "different array length", a: [1], b: [1, 2], expected: false },
    { label: "different array item", a: [1, 2], b: [1, 3], expected: false },
    { label: "array vs object", a: [1], b: { 0: 1 }, expected: false },
    { label: "same Date value", a: new Date(now), b: new Date(now), expected: true },
    { label: "different Date value", a: new Date(now), b: new Date(now.getTime() + 1000), expected: false },
    { label: "Date vs plain object", a: new Date(now), b: {}, expected: false },
    { label: "plain object vs Date", a: {}, b: new Date(now), expected: false },
    { label: "same RegExp", a: /ab+c/gi, b: /ab+c/gi, expected: true },
    { label: "different RegExp flags", a: /ab+c/g, b: /ab+c/i, expected: false },
    { label: "different RegExp source", a: /abc/, b: /abd/, expected: false },
    { label: "RegExp vs plain object", a: /x/, b: {}, expected: false },
    { label: "plain object vs RegExp", a: {}, b: /x/, expected: false },
    { label: "equal Maps", a: new Map([["k", { v: 1 }]]), b: new Map([["k", { v: 1 }]]), expected: true },
    { label: "Map value differs", a: new Map([["k", 1]]), b: new Map([["k", 2]]), expected: false },
    { label: "Map size differs", a: new Map([["k", 1]]), b: new Map(), expected: false },
    { label: "Map vs plain object", a: new Map(), b: {}, expected: false },
    { label: "plain object vs Map", a: {}, b: new Map(), expected: false },
    { label: "equal Sets", a: new Set([1, 2]), b: new Set([2, 1]), expected: true },
    { label: "Set membership differs", a: new Set([1]), b: new Set([2]), expected: false },
    { label: "Set size differs", a: new Set([1]), b: new Set([1, 2]), expected: false },
    { label: "Set vs plain object", a: new Set(), b: {}, expected: false },
    { label: "plain object vs Set", a: {}, b: new Set(), expected: false },
    { label: "object vs array", a: { 0: 1 }, b: [1], expected: false },
    { label: "distinct function instances", a: () => 1, b: () => 1, expected: false },
    // Class instances are not plain objects: a key walk would call unequal
    // instances equal (Errors have no enumerable keys) and skip an update
    { label: "distinct Error instances", a: new Error("a"), b: new Error("b"), expected: false },
    { label: "Errors with the same message", a: new Error("same"), b: new Error("same"), expected: false },
    { label: "class instance vs plain object", a: new (class {})(), b: {}, expected: false },
    { label: "distinct class instances with equal fields", a: Object.assign(new (class {})(), { v: 1 }), b: Object.assign(new (class {})(), { v: 1 }), expected: false },
    { label: "null-prototype objects with equal keys", a: Object.assign(Object.create(null), { v: 1 }), b: Object.assign(Object.create(null), { v: 1 }), expected: true },
    // Map keys and Set members compare by identity (SameValueZero): the
    // safe direction — recreated objects count as changed props
    { label: "Maps keyed by recreated objects", a: new Map([[{ k: 1 }, "v"]]), b: new Map([[{ k: 1 }, "v"]]), expected: false },
    { label: "Sets of recreated objects", a: new Set([{ v: 1 }]), b: new Set([{ v: 1 }]), expected: false },
  ])("$label → $expected", ({ a, b, expected }) => {
    expect(deepEqual(a, b)).toBe(expected);
  });

  it("treats the same reference as equal regardless of content", () => {
    const fn = () => 1;
    const obj = { deep: { nested: [new Map()] } };
    const errorRef = new Error("shared");

    expect(deepEqual(fn, fn)).toBe(true);
    expect(deepEqual(obj, obj)).toBe(true);
    expect(deepEqual(errorRef, errorRef)).toBe(true);
  });

  it("Maps and Sets sharing key/member references compare their contents", () => {
    const key = { k: 1 };
    const member = { v: 1 };

    expect(deepEqual(new Map([[key, { v: 1 }]]), new Map([[key, { v: 1 }]]))).toBe(true);
    expect(deepEqual(new Map([[key, 1]]), new Map([[key, 2]]))).toBe(false);
    expect(deepEqual(new Set([member]), new Set([member]))).toBe(true);
  });
});
