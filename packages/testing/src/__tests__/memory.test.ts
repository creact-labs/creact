import { describe, expect, it } from "vitest";
import type { AuditLogEntry, DeploymentState } from "@creact-labs/creact";
import { InMemoryMemory, NoopMemory } from "../index";

const state = (n = 0): DeploymentState =>
  ({ nodes: [], version: n }) as unknown as DeploymentState;

describe("NoopMemory", () => {
  it("returns null and swallows saves", async () => {
    const memory = new NoopMemory();
    await memory.saveState();
    expect(await memory.getState()).toBeNull();
  });
});

describe("InMemoryMemory", () => {
  it("round-trips state and deep-clones it on save", async () => {
    const memory = new InMemoryMemory();
    const original = state(1);
    await memory.saveState("s", original);

    const read = await memory.getState("s");
    expect(read).toEqual(original);
    expect(read).not.toBe(original); // structuredClone, not the same ref
    expect(await memory.getState("missing")).toBeNull();
  });

  it("grants a lock once, blocks a second holder, and releases", async () => {
    const memory = new InMemoryMemory();
    expect(await memory.acquireLock("s", "a", 60)).toBe(true);
    expect(await memory.acquireLock("s", "b", 60)).toBe(false);

    await memory.releaseLock("s");
    expect(await memory.acquireLock("s", "b", 60)).toBe(true);
  });

  it("renews only for the current holder", async () => {
    const memory = new InMemoryMemory();
    await memory.acquireLock("s", "a", 60);
    expect(await memory.renewLock("s", "a", 60)).toBe(true);
    expect(await memory.renewLock("s", "someone-else", 60)).toBe(false);
    expect(await memory.renewLock("missing", "a", 60)).toBe(false);
  });

  it("appends and reads back the audit log, honoring limit", async () => {
    const memory = new InMemoryMemory();
    const entry = (m: string): AuditLogEntry =>
      ({ message: m }) as unknown as AuditLogEntry;
    await memory.appendAuditLog("s", entry("one"));
    await memory.appendAuditLog("s", entry("two"));

    expect(await memory.getAuditLog("s")).toHaveLength(2);
    expect(await memory.getAuditLog("s", 1)).toHaveLength(1);
    expect(await memory.getAuditLog("missing")).toEqual([]);
  });

  it("clear() wipes state, locks, and audit logs", async () => {
    const memory = new InMemoryMemory();
    await memory.saveState("s", state());
    await memory.acquireLock("s", "a", 60);
    await memory.appendAuditLog("s", {} as AuditLogEntry);

    memory.clear();

    expect(await memory.getState("s")).toBeNull();
    expect(await memory.getAuditLog("s")).toEqual([]);
    expect(await memory.acquireLock("s", "b", 60)).toBe(true);
  });
});
