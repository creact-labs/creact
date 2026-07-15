import { describe, expect, it} from "vitest";
import { createEffect} from "../effect";
import { createMemo, createSignal} from "../signal";

describe("reactive primitives without an owner", () => {
  it("createMemo works standalone (no root)", () => {
    const [n, setN] = createSignal(2);
    const doubled = createMemo(() => n() * 2);

    expect(doubled()).toBe(4);
    setN(5);
    expect(doubled()).toBe(10);
  });

  it("createEffect works standalone (no root)", () => {
    const [n, setN] = createSignal(1);
    const seen: number[] = [];

    createEffect(() => {
      seen.push(n());
    });
    setN(2);

    expect(seen).toEqual([1, 2]);
  });

  it("render-flagged effects run immediately instead of queueing as user effects", () => {
    const [n] = createSignal(7);
    let observed: number | undefined;

    createEffect(
      () => {
        observed = n();
        return undefined;
      },
      undefined,
      { render: true },
    );

    expect(observed).toBe(7);
  });
});
