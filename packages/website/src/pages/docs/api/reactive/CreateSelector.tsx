import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const CreateSelector: Component = () => {
  return (
    <>
      <h1>createSelector</h1>
      <p class="docs-description">Creates an O(2) selection signal. Only the previous and new selection re-evaluate.</p>

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="createSelector"
        signature="createSelector<T, U = T>(source: Accessor<T>, fn?: (a: U, b: T) => boolean): (key: U) => boolean"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>source</code></td><td><code>Accessor&lt;T&gt;</code></td><td>Signal that holds the currently selected value.</td></tr>
          <tr><td><code>fn</code></td><td><code>(a: U, b: T) =&gt; boolean</code></td><td>Optional comparator. Defaults to <code>===</code>.</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>
        A function <code>(key: U) =&gt; boolean</code> that returns <code>true</code> if
        <code>key</code> matches the current selection. Only the previously selected and
        newly selected items re-evaluate. O(2) regardless of list size.
      </p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`const [selected, setSelected] = createSignal('a');
const isSelected = createSelector(selected);

// In a loop: only 2 items update when selection changes
items.forEach(item => {
  createEffect(() => {
    if (isSelected(item.id)) {
      console.log(item.id, 'is now selected');
    }
  });
});

setSelected('b'); // Only 'a' and 'b' effects re-run`} />
    </>
  );
};

export default CreateSelector;
