import { describe, expect, it } from "vitest";
import { delay, waitFor } from "../index";

describe("waitFor()", () => {
  it("resolves with the first truthy value the callback returns", async () => {
    let count = 0;
    const result = await waitFor(() => {
      count += 1;
      return count >= 3 ? `done-${count}` : false;
    });
    expect(result).toBe("done-3");
  });

  it("resolves immediately when the callback is already truthy", async () => {
    expect(await waitFor(() => "ready")).toBe("ready");
  });

  it("retries past a thrown error until it stops throwing", async () => {
    let tries = 0;
    const result = await waitFor(() => {
      tries += 1;
      if (tries < 2) throw new Error("not yet");
      return tries;
    });
    expect(result).toBe(2);
  });

  it("rejects with the last error after the timeout", async () => {
    await expect(
      waitFor(() => {
        throw new Error("still failing");
      }, { timeout: 20, interval: 5 }),
    ).rejects.toThrow("still failing");
  });

  it("rejects when a falsy callback never becomes truthy", async () => {
    await expect(
      waitFor(() => false, { timeout: 20, interval: 5 }),
    ).rejects.toThrow(/truthy/);
  });
});

describe("delay()", () => {
  it("resolves after roughly the requested time", async () => {
    const start = Date.now();
    await delay(15);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });
});
