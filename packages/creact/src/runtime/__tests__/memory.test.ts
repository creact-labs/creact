import { describe, expect, it, vi} from "vitest";
import { createSignal} from "../../reactive/signal";
import { generateInstanceNode} from "../__mocks__/generate-nodes";
import type { InstanceNode} from "../instance";
import { serializeNode, serializeNodes} from "../memory";

function nodeWithOutputs(
  outputs: Record<string, unknown>,
  overrides: Partial<InstanceNode> = {},
): InstanceNode {
  const outputSignals = new Map(
    Object.entries(outputs).map(([key, value]) => [key, createSignal(value)]),
  );
  return generateInstanceNode({ outputSignals: outputSignals as any, ...overrides });
}

describe("serializeNode", () => {
  it("captures current signal values as outputs", () => {
    const node = nodeWithOutputs({ url: "http://db", port: 5432 });

    const serialized = serializeNode(node);

    expect(serialized.id).toBe(node.id);
    expect(serialized.path).toEqual(node.path);
    expect(serialized.props).toEqual(node.props);
    expect(serialized.outputs).toEqual({ url: "http://db", port: 5432 });
  });

  it("omits outputs entirely when every signal is still undefined", () => {
    const node = nodeWithOutputs({ pending: undefined });

    expect(serializeNode(node).outputs).toBeUndefined();
  });

  it("skips undefined values but keeps the defined ones", () => {
    const node = nodeWithOutputs({ ready: true, notYet: undefined });

    expect(serializeNode(node).outputs).toEqual({ ready: true });
  });

  it("carries the component store snapshot along", () => {
    const store = { progress: 3 };
    const node = nodeWithOutputs({ ok: 1 }, { store });

    expect(serializeNode(node).store).toEqual(store);
  });

  it("refuses to persist a corrupted 'id' output and names the node", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const node = nodeWithOutputs({ id: ["not", "a", "string"] });

      expect(() => serializeNode(node)).toThrow(/Corrupted output detected/);
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("names the offending type when the corrupted 'id' is not an array", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const node = nodeWithOutputs({ id: 12345 });

      expect(() => serializeNode(node)).toThrow(/got number/);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("accepts a legitimate string 'id' output", () => {
    const node = nodeWithOutputs({ id: "external-resource-42" });

    expect(serializeNode(node).outputs).toEqual({ id: "external-resource-42" });
  });
});

describe("serializeNodes", () => {
  it("serializes every node in order", () => {
    const a = nodeWithOutputs({ n: 1 });
    const b = nodeWithOutputs({ n: 2 });

    const serialized = serializeNodes([a, b]);

    expect(serialized.map((s) => s.id)).toEqual([a.id, b.id]);
    expect(serialized.map((s) => s.outputs?.n)).toEqual([1, 2]);
  });

  it("one corrupted node does not abort the snapshot of the others", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const good = nodeWithOutputs({ n: 1 });
      const corrupted = nodeWithOutputs({ id: ["not", "a", "string"] });
      const alsoGood = nodeWithOutputs({ n: 3 });

      const serialized = serializeNodes([good, corrupted, alsoGood]);

      // Healthy nodes persist their outputs...
      expect(serialized[0]!.outputs).toEqual({ n: 1 });
      expect(serialized[2]!.outputs).toEqual({ n: 3 });
      // ...the corrupted node degrades to no outputs (handler re-runs
      // fresh on the next boot) and keeps its identity in the snapshot
      expect(serialized[1]!.id).toBe(corrupted.id);
      expect(serialized[1]!.outputs).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("without outputs"),
        expect.anything(),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
