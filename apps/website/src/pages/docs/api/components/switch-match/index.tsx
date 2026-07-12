import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const SwitchMatch: Component = () => {
  return (
    <>
      <h1>Switch / Match</h1>
      <p class="docs-description">
        Multi-branch conditional rendering. Renders the first matching branch.
      </p>

      <DocCodeBlock
        code={`<Switch fallback={<Default />}>
  <Match when={() => mode() === 'a'}><A /></Match>
  <Match when={() => mode() === 'b'}><B /></Match>
</Switch>`}
      />

      <ApiReference
        name="Switch"
        signature="Switch(props: { fallback?: MaybeAccessor<CReactNode>; children: MatchResult<any>[] | MatchResult<any> }): JSXElement"
      />
      <ApiSignature
        name="Match"
        signature="Match<T>(props: { when: MaybeAccessor<T | undefined | null | false>; children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode) }): MatchResult<T>"
      />

      <DocHeading level={3} id="props">
        Props
      </DocHeading>
      <p>
        <strong>Switch</strong>
      </p>
      <DocTable
        headers={["Prop", "Type", "Description"]}
        rows={[
          [<><code>fallback</code></>, <><code>MaybeAccessor&lt;CReactNode&gt;</code></>, "Rendered when no Match is truthy."],
          [<><code>children</code></>, <><code>MatchResult[]</code></>, "Match components."],
        ]}
      />
      <p>
        <strong>Match</strong>
      </p>
      <DocTable
        headers={["Prop", "Type", "Description"]}
        rows={[
          [<><code>when</code></>, <><code>MaybeAccessor&lt;T | undefined | null | false&gt;</code></>, "Condition for this branch. Accepts a value or an accessor."],
          [<><code>children</code></>, <><code>
                CReactNode | ((item: Accessor&lt;NonNullable&lt;T&gt;&gt;) =&gt;
                CReactNode)
              </code></>, "Content or callback receiving the truthy value."],
        ]}
      />

      <UsageSection
        code={`<Switch>
  <Match when={() => env() === 'production'}>
    <ProductionStack replicas={3} />
  </Match>
  <Match when={() => env() === 'staging'}>
    <StagingStack replicas={1} />
  </Match>
  <Match when={() => env() === 'dev'}>
    <DevStack />
  </Match>
</Switch>`}
      />
    </>
  );
};

export default SwitchMatch;
