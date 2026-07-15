import { describe, expect, it} from "vitest";
import { createEffect} from "../effect";
import { createRoot} from "../owner";
import { createSelector} from "../selector";
import { createSignal} from "../signal";

describe("selector-driven effects", () => {
  it("only the affected rows re-run when the selection moves", () => {
    const log: string[] = [];
    let setSelected!: (v: number) => void;
    let disposeRoot!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [selected, set] = createSignal(1);
      setSelected = set;
      const isSelected = createSelector(selected);

      for (const id of [1, 2, 3]) {
        createEffect(() => {
          log.push(`${id}:${isSelected(id)}`);
        });
      }
    });

    log.length = 0; // ignore initial runs
    setSelected(3);

    expect(log.sort()).toEqual(["1:false", "3:true"]);
    disposeRoot();
  });
});
