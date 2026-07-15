import { faker} from "@faker-js/faker";
import { describe, expect, it, vi} from "vitest";
import { InMemoryMemory } from "@creact-labs/testing";
import { generateDeploymentState, generateSerializedNode} from "../__mocks__/generate-nodes";
import type { Memory} from "../memory";
import { StateMachine} from "../state-machine";

const stack = () => `stack-${faker.string.alphanumeric(8)}`.toLowerCase();

describe("deployment lifecycle persistence", () => {
  it("startDeployment persists an applying snapshot", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    const nodes = [generateSerializedNode()];

    await sm.startDeployment(stackName, nodes);

    const state = await memory.getState(stackName);
    expect(state?.status).toBe("applying");
    expect(state?.nodes).toEqual(nodes);
    expect(state?.stackName).toBe(stackName);
  });

  it("completeDeployment persists a deployed snapshot", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    const nodes = [generateSerializedNode()];

    await sm.completeDeployment(stackName, nodes);

    const state = await memory.getState(stackName);
    expect(state?.status).toBe("deployed");
    expect(state?.nodes).toEqual(nodes);
  });

  it("failDeployment marks an existing deployment as failed", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    await sm.startDeployment(stackName, [generateSerializedNode()]);

    await sm.failDeployment(stackName, new Error("boom"));

    expect((await memory.getState(stackName))?.status).toBe("failed");
  });

  it("failDeployment is a no-op when no state exists yet", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();

    await sm.failDeployment(stackName, new Error("boom"));

    expect(await memory.getState(stackName)).toBeNull();
  });
});

describe("crash-recovery checkpoints", () => {
  it("updateNodeOutputs checkpoints outputs for a persisted node", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    const node = generateSerializedNode();
    await sm.startDeployment(stackName, [node]);

    await sm.updateNodeOutputs(stackName, node.id, { url: "http://x" });

    const state = await memory.getState(stackName);
    expect(state?.nodes[0]?.outputs).toEqual({ url: "http://x" });
  });

  it.each([
    { label: "unknown node id", seed: true },
    { label: "missing state entirely", seed: false },
  ])("updateNodeOutputs tolerates $label", async ({ seed }) => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    if (seed) await sm.startDeployment(stackName, [generateSerializedNode()]);

    await expect(
      sm.updateNodeOutputs(stackName, "no-such-node", { a: 1 }),
    ).resolves.toBeUndefined();
  });

  it("addApplying tracks in-flight nodes without duplicates", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    await sm.startDeployment(stackName, [generateSerializedNode()]);

    await sm.addApplying(stackName, "node-1");
    await sm.addApplying(stackName, "node-1");
    await sm.addApplying(stackName, "node-2");

    const state = await memory.getState(stackName);
    expect(state?.applyingNodeIds).toEqual(["node-1", "node-2"]);
  });

  it("removeApplying clears the set entirely when the last node completes", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    await sm.startDeployment(stackName, [generateSerializedNode()]);
    await sm.addApplying(stackName, "node-1");

    await sm.removeApplying(stackName, "node-1");

    const state = await memory.getState(stackName);
    expect(state?.applyingNodeIds).toBeUndefined();
  });

  it("applying set survives a crash and is readable on resume", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    await sm.startDeployment(stackName, [generateSerializedNode()]);
    await sm.addApplying(stackName, "in-flight");

    // A fresh StateMachine simulates the restarted process
    const resumed = new StateMachine(memory);

    expect(await resumed.canResume(stackName)).toBe(true);
    expect(await resumed.getInterruptedNodeIds(stackName)).toEqual([
      "in-flight",
    ]);
  });

  it.each([
    { label: "completed deployment", status: "deployed" as const },
    { label: "failed deployment", status: "failed" as const },
  ])("cannot resume a $label", async ({ status }) => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    await memory.saveState(stackName, generateDeploymentState({ status }));

    expect(await sm.canResume(stackName)).toBe(false);
    expect(await sm.getInterruptedNodeIds(stackName)).toEqual([]);
  });
});

describe("syncNodes (mid-cascade node list updates)", () => {
  it("replaces the node list while preserving status and in-flight set", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    await sm.startDeployment(stackName, [generateSerializedNode()]);
    await sm.addApplying(stackName, "in-flight");
    const cascadeBorn = generateSerializedNode();

    await sm.syncNodes(stackName, [cascadeBorn]);

    const state = await memory.getState(stackName);
    expect(state?.nodes.map((n) => n.id)).toEqual([cascadeBorn.id]);
    expect(state?.status).toBe("applying");
    expect(state?.applyingNodeIds).toEqual(["in-flight"]);
  });

  it("keeps already-checkpointed outputs when the new snapshot lacks them", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();
    const node = generateSerializedNode();
    await sm.startDeployment(stackName, [node]);
    await sm.updateNodeOutputs(stackName, node.id, { url: "kept" });

    await sm.syncNodes(stackName, [{ ...node, outputs: undefined }]);

    const state = await memory.getState(stackName);
    expect(state?.nodes[0]?.outputs).toEqual({ url: "kept" });
  });

  it("is a no-op when no deployment state exists", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();

    await sm.syncNodes(stackName, [generateSerializedNode()]);

    expect(await memory.getState(stackName)).toBeNull();
  });
});

describe("resource state tracking", () => {
  it("defaults to pending for unknown resources", () => {
    const sm = new StateMachine(new InMemoryMemory());

    expect(sm.getResourceState("unknown")).toBe("pending");
  });

  it("records applied and destroyed transitions", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();

    await sm.recordResourceApplied(stackName, "node-1", { url: "x" });
    expect(sm.getResourceState("node-1")).toBe("deployed");

    await sm.recordResourceDestroyed(stackName, "node-1");
    expect(sm.getResourceState("node-1")).toBe("pending");
  });

  it.each([
    {
      label: "explicit state wins",
      node: generateSerializedNode({ state: "failed", outputs: { a: 1 } }),
      expected: "failed",
    },
    {
      label: "non-empty outputs imply deployed",
      node: generateSerializedNode({ outputs: { url: "x" } }),
      expected: "deployed",
    },
    {
      label: "empty outputs stay pending",
      node: generateSerializedNode({ outputs: {} }),
      expected: "pending",
    },
    {
      label: "no outputs stay pending",
      node: generateSerializedNode(),
      expected: "pending",
    },
  ])("restoreResourceStates: $label", ({ node, expected }) => {
    const sm = new StateMachine(new InMemoryMemory());

    sm.restoreResourceStates([node]);

    expect(sm.getResourceState(node.id)).toBe(expected);
  });

  it("clearResourceStates resets everything to pending", () => {
    const sm = new StateMachine(new InMemoryMemory());
    sm.setResourceState("node-1", "deployed");

    sm.clearResourceStates();

    expect(sm.getResourceState("node-1")).toBe("pending");
  });
});

describe("audit log", () => {
  it("records the full deployment story when enabled", async () => {
    const memory = new InMemoryMemory();
    const user = faker.internet.username();
    const sm = new StateMachine(memory, { user, enableAuditLog: true });
    const stackName = stack();
    const nodes = [generateSerializedNode()];

    await sm.startDeployment(stackName, nodes, {
      creates: 1,
      updates: 0,
      deletes: 0,
    });
    await sm.recordResourceApplied(stackName, nodes[0]!.id, { url: "x" });
    await sm.recordResourceDestroyed(stackName, nodes[0]!.id);
    await sm.completeDeployment(stackName, nodes);
    await sm.failDeployment(stackName, new Error("late failure"));

    const log = await memory.getAuditLog(stackName);
    expect(log.map((e) => e.action)).toEqual([
      "deploy_start",
      "resource_applied",
      "resource_destroyed",
      "deploy_complete",
      "deploy_failed",
    ]);
    expect(log.every((e) => e.user === user)).toBe(true);
  });

  it("stays silent when audit logging is disabled", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();

    await sm.startDeployment(stackName, [generateSerializedNode()]);
    await sm.completeDeployment(stackName, []);

    expect(await memory.getAuditLog(stackName)).toEqual([]);
  });

  it("getAuditLog respects the limit parameter", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory, { enableAuditLog: true });
    const stackName = stack();
    await sm.startDeployment(stackName, []);
    await sm.completeDeployment(stackName, []);

    const limited = await memory.getAuditLog(stackName, 1);

    expect(limited).toHaveLength(1);
    expect(limited[0]?.action).toBe("deploy_complete");
  });
});

describe("deployment locks", () => {
  it("delegates to the backend when locking is supported", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();

    expect(await sm.acquireLock(stackName, "holder-a", 60)).toBe(true);
    expect(await sm.acquireLock(stackName, "holder-b", 60)).toBe(false);

    await sm.releaseLock(stackName);

    expect(await sm.acquireLock(stackName, "holder-b", 60)).toBe(true);
  });

  it("allows deployment when the backend has no locking support", async () => {
    const bare: Memory = {
      getState: async () => null,
      saveState: async () => {},
    };
    const sm = new StateMachine(bare);

    expect(await sm.acquireLock(stack(), "holder")).toBe(true);
    await expect(sm.releaseLock(stack())).resolves.toBeUndefined();
  });

  it("renews a held lease through the backend and reports a lost one", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory);
    const stackName = stack();

    expect(sm.canRenewLock()).toBe(true);
    await sm.acquireLock(stackName, "holder-a", 60);

    expect(await sm.renewLock(stackName, "holder-a", 60)).toBe(true);
    // A different holder cannot extend someone else's lease
    expect(await sm.renewLock(stackName, "holder-b", 60)).toBe(false);
  });

  it("treats renewal as a no-op when the backend cannot renew", async () => {
    const bare: Memory = {
      getState: async () => null,
      saveState: async () => {},
    };
    const sm = new StateMachine(bare);

    expect(sm.canRenewLock()).toBe(false);
    expect(await sm.renewLock(stack(), "holder", 60)).toBe(true);
  });
});

describe("stalled backend diagnostics", () => {
  it("warns when a Memory call stalls while holding the stack mutex", async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const stalled: Memory = {
        getState: async () => null,
        // Never settles — every later operation on this stack would queue
        saveState: () => new Promise(() => {}),
      };
      const sm = new StateMachine(stalled);

      void sm.completeDeployment(stack(), []);
      await vi.advanceTimersByTimeAsync(30_000);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("holding the stack mutex"),
      );
    } finally {
      warnSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("memoryCallTimeoutMs bounds a stalled call with a hard rejection", async () => {
    vi.useFakeTimers();
    try {
      const stalled: Memory = {
        getState: async () => null,
        saveState: () => new Promise(() => {}),
      };
      const sm = new StateMachine(stalled, { memoryCallTimeoutMs: 5_000 });

      const operation = sm.completeDeployment(stack(), []);
      const outcome = expect(operation).rejects.toThrow(
        /exceeded 5000ms \(memoryCallTimeoutMs\)/,
      );
      await vi.advanceTimersByTimeAsync(5_000);
      await outcome;
    } finally {
      vi.useRealTimers();
    }
  });

  it("memoryCallTimeoutMs leaves fast backend calls untouched", async () => {
    const memory = new InMemoryMemory();
    const sm = new StateMachine(memory, { memoryCallTimeoutMs: 5_000 });
    const stackName = stack();

    await sm.completeDeployment(stackName, []);

    expect((await memory.getState(stackName))?.status).toBe("deployed");
  });
});
