import { afterEach, describe, expect, it } from "vitest";
import {
  createRoot,
  createSignal,
  resetRuntime,
} from "@creact-labs/creact";
import {
  waitFor,
} from "../index";

afterEach(() => {
  resetRuntime();
});

describe("waitFor()", () => {
  it("resolves when accessor becomes truthy", async () => {
    const [value, setValue] = createRoot(() => createSignal<string | null>(null));

    const promise = waitFor(value);

    // Set value after a tick
    queueMicrotask(() => setValue("hello"));

    const result = await promise;
    expect(result).toBe("hello");
  });

  it("resolves when predicate passes", async () => {
    const [count, setCount] = createRoot(() => createSignal(0));

    const promise = waitFor(count, (v) => v >= 3);

    // Increment over time
    queueMicrotask(() => setCount(1));
    queueMicrotask(() => setCount(2));
    queueMicrotask(() => setCount(3));

    const result = await promise;
    expect(result).toBe(3);
  });

  it("resolves immediately if accessor is already truthy", async () => {
    const [value] = createRoot(() => createSignal("already-set"));

    const result = await waitFor(value);
    expect(result).toBe("already-set");
  });
});
