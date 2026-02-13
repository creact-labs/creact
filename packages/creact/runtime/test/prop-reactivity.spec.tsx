import { afterEach, describe, expect, it } from "vitest";
import { createSignal, Show } from "../../src/index";
import { useAsyncOutput } from "../src/instance";
import { render, resetRuntime } from "../src/run";
import { InMemoryMemory } from "../../test/helpers/setup";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

/** Helper: wait for reactive flush + async apply to propagate */
const flush = (ms = 100) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  resetRuntime();
});

describe("prop reactivity — signal changes trigger handler re-runs", () => {
  it("signal change triggers handler re-run", async () => {
    let handlerCount = 0;
    const [count, setCount] = createSignal(1);

    function Counter(props: { key: string }) {
      useAsyncOutput(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          handlerCount++;
          setOutputs({ seen: p.count });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Counter, { key: "c1" }, "c1"),
      memory,
      "test-prop-rerun",
    );
    await result.ready;
    expect(handlerCount).toBe(1);

    // Update the signal — should trigger a handler re-run
    setCount(2);
    await flush();

    expect(handlerCount).toBe(2);

    result.dispose();
  });

  it("handler receives updated props on re-run", async () => {
    const receivedProps: number[] = [];
    const [count, setCount] = createSignal(10);

    function Tracker(props: { key: string }) {
      useAsyncOutput(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          receivedProps.push(p.count);
          setOutputs({ last: p.count });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Tracker, { key: "t1" }, "t1"),
      memory,
      "test-prop-values",
    );
    await result.ready;
    expect(receivedProps).toEqual([10]);

    setCount(20);
    await flush();
    expect(receivedProps).toEqual([10, 20]);

    setCount(30);
    await flush();
    expect(receivedProps).toEqual([10, 20, 30]);

    result.dispose();
  });

  it("output signals update after prop-triggered re-run", async () => {
    const [count, setCount] = createSignal(1);
    let outputAccessors: any;

    function Doubler(props: { key: string }) {
      outputAccessors = useAsyncOutput<{ doubled: number }>(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          setOutputs({ doubled: p.count * 2 });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Doubler, { key: "d1" }, "d1"),
      memory,
      "test-prop-outputs",
    );
    await result.ready;
    expect(outputAccessors.doubled()).toBe(2);

    setCount(5);
    await flush();
    expect(outputAccessors.doubled()).toBe(10);

    result.dispose();
  });

  it("no re-run when signal value doesn't change", async () => {
    let handlerCount = 0;
    const [count, setCount] = createSignal(42);

    function Stable(props: { key: string }) {
      useAsyncOutput(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          handlerCount++;
          setOutputs({ v: p.count });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Stable, { key: "s1" }, "s1"),
      memory,
      "test-prop-noop",
    );
    await result.ready;
    expect(handlerCount).toBe(1);

    // Set to the same value — should NOT trigger re-run
    setCount(42);
    await flush();
    expect(handlerCount).toBe(1);

    result.dispose();
  });

  it("cascading prop change: A outputs → B getter reads output → B re-runs", async () => {
    const handlerOrder: string[] = [];
    const [trigger, setTrigger] = createSignal("initial");

    function Producer(props: { key: string }) {
      const out = useAsyncOutput<{ data: string }>(
        () => ({ trigger: trigger(), key: props.key }),
        async (p, setOutputs) => {
          handlerOrder.push(`Producer:${p.trigger}`);
          setOutputs({ data: `produced-${p.trigger}` });
        },
      );
      // Consumer reads Producer's output via a reactive getter
      return Show({
        when: () => out.data(),
        children: (data: () => string) =>
          h(Consumer, { getData: data, key: "consumer" }, "consumer"),
      });
    }

    // Consumer uses a getter to reactively track Producer's output
    function Consumer(props: { getData: () => string; key: string }) {
      useAsyncOutput(
        () => ({ input: props.getData(), key: props.key }),
        async (p, setOutputs) => {
          handlerOrder.push(`Consumer:${p.input}`);
          setOutputs({ processed: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Producer, { key: "p1" }, "p1"),
      memory,
      "test-prop-cascade",
    );
    await result.ready;

    // Initial run: Producer then Consumer
    expect(handlerOrder).toEqual([
      "Producer:initial",
      "Consumer:produced-initial",
    ]);

    // Change the trigger signal — Producer re-runs, outputs change,
    // Consumer's getter sees new value → re-runs
    setTrigger("updated");
    await flush(200);

    expect(handlerOrder).toContain("Producer:updated");
    expect(handlerOrder).toContain("Consumer:produced-updated");

    result.dispose();
  });
});
