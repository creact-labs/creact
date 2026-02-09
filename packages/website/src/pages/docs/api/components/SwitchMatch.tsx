import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const SwitchMatch: Component = () => {
  return (
    <>
      <h1>Switch / Match</h1>
      <p class="docs-description">Multi-branch conditional rendering. Renders the first matching branch.</p>

      <DocCodeBlock code={`<Switch fallback={<Default />}>
  <Match when={() => mode() === 'a'}><A /></Match>
  <Match when={() => mode() === 'b'}><B /></Match>
</Switch>`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="Switch"
        signature="Switch(props: { fallback?: MaybeAccessor<CReactNode>; children: MatchResult<any>[] | MatchResult<any> }): JSXElement"
      />
      <ApiSignature
        name="Match"
        signature="Match<T>(props: { when: MaybeAccessor<T | undefined | null | false>; children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode) }): MatchResult<T>"
      />

      <DocHeading level={3} id="props">Props</DocHeading>
      <p><strong>Switch</strong></p>
      <table>
        <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>fallback</code></td><td><code>MaybeAccessor&lt;CReactNode&gt;</code></td><td>Rendered when no Match is truthy.</td></tr>
          <tr><td><code>children</code></td><td><code>MatchResult[]</code></td><td>Match components.</td></tr>
        </tbody>
      </table>
      <p><strong>Match</strong></p>
      <table>
        <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>when</code></td><td><code>MaybeAccessor&lt;T | undefined | null | false&gt;</code></td><td>Condition for this branch. Accepts a value or an accessor.</td></tr>
          <tr><td><code>children</code></td><td><code>CReactNode | ((item: Accessor&lt;NonNullable&lt;T&gt;&gt;) =&gt; CReactNode)</code></td><td>Content or callback receiving the truthy value.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`<Switch>
  <Match when={() => env() === 'production'}>
    <ProductionStack replicas={3} />
  </Match>
  <Match when={() => env() === 'staging'}>
    <StagingStack replicas={1} />
  </Match>
  <Match when={() => env() === 'dev'}>
    <DevStack />
  </Match>
</Switch>`} />
    </>
  );
};

export default SwitchMatch;
