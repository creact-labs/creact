import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const CreateSelector: Component = () => {
  return (
    <>
      <h1>createSelector</h1>
      <p class="docs-description">
        Creates an O(2) selection signal. Only the previous and new selection
        re-evaluate.
      </p>

      <ApiReference
        name="createSelector"
        signature="createSelector<T, U = T>(source: Accessor<T>, fn?: (a: U, b: T) => boolean): (key: U) => boolean"
        parameters={[
          [<><code>source</code></>, <><code>Accessor&lt;T&gt;</code></>, "Signal that holds the currently selected value."],
          [<><code>fn</code></>, <><code>(a: U, b: T) =&gt; boolean</code></>, <>Optional comparator. Defaults to <code>===</code>.</>],
        ]}
        returns={
          <>
      <p>
        A function <code>(key: U) =&gt; boolean</code> that returns{" "}
        <code>true</code> if
        <code>key</code> matches the current selection. Only the previously
        selected and newly selected items re-evaluate. O(2) regardless of list
        size.
      </p>
          </>
        }
      />

      <UsageSection
        code={`const [selected, setSelected] = createSignal('a');
const isSelected = createSelector(selected);

// In a loop: only 2 items update when selection changes
items.forEach(item => {
  createEffect(() => {
    if (isSelected(item.id)) {
      console.log(item.id, 'is now selected');
    }
  });
});

setSelected('b'); // Only 'a' and 'b' effects re-run`}
      />
    </>
  );
};

export default CreateSelector;
