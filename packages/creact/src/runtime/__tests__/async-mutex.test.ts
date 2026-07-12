import { describe, expect, it} from "vitest";
import { delay} from "../../testing/testing";
import { AsyncMutex} from "../async-mutex";

describe("AsyncMutex", () => {
  it("reports locked while held and unlocked after release", async () => {
    const mutex = new AsyncMutex();
    expect(mutex.isLocked()).toBe(false);

    const release = await mutex.acquire();
    expect(mutex.isLocked()).toBe(true);

    release();
    expect(mutex.isLocked()).toBe(false);
  });

  it("serializes concurrent critical sections in FIFO order", async () => {
    const mutex = new AsyncMutex();
    const order: string[] = [];

    await Promise.all([
      mutex.runExclusive(async () => {
        order.push("first-start");
        await delay(20);
        order.push("first-end");
      }),
      mutex.runExclusive(async () => {
        order.push("second-start");
        await delay(5);
        order.push("second-end");
      }),
      mutex.runExclusive(() => {
        order.push("third");
      }),
    ]);

    expect(order).toEqual([
      "first-start",
      "first-end",
      "second-start",
      "second-end",
      "third",
    ]);
  });

  it("releases the lock even when the critical section throws", async () => {
    const mutex = new AsyncMutex();

    await expect(
      mutex.runExclusive(() => {
        throw new Error("inside-lock");
      }),
    ).rejects.toThrow("inside-lock");

    expect(mutex.isLocked()).toBe(false);
  });

  it("ignores a double release", async () => {
    const mutex = new AsyncMutex();
    const release = await mutex.acquire();

    release();
    release();

    expect(mutex.isLocked()).toBe(false);
    // Lock still usable afterwards
    await expect(mutex.runExclusive(() => "ok")).resolves.toBe("ok");
  });
});
