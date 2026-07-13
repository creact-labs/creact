/**
 * Samples for the For API page. Each region is displayed by the
 * website; top-level statements keep every fragment compiling for real.
 */
import { createSignal, For, useAsyncOutput } from "@creact-labs/creact";

interface ItemData {
  id: number;
}

const [items] = createSignal<ItemData[]>([{ id: 1 }]);

function Item(_props: { data: ItemData }) {
  return <></>;
}

// One deployed static site; shared demo resource across example apps
import { WebSite } from "@creact-labs/example-demo-site";

export function hero() {
  return (
    // #region hero
    <For each={() => items()}>
      {(item) => <Item data={item()} />}
    </For>
    // #endregion hero
  );
}

export function usage() {
  // #region usage
  const [sites, setSites] = createSignal([
    { name: "blog", html: "<h1>Blog</h1>" },
    { name: "docs", html: "<h1>Docs</h1>" },
  ]);

  return (
    <For each={() => sites()}>
      {(site, index) => (
        <WebSite
          key={site().name}
          name={() => site().name}
          content={() => site().html}
        />
      )}
    </For>
  );
  // #endregion usage
}
