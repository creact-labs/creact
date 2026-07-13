import { For, Show, createSignal } from "@creact-labs/creact";
import { AWS } from "../components/aws";
import { Channel } from "../components/channel";
import { Claude } from "../components/claude";
import { GenerateHtml } from "../components/generate-html";
import { type SiteConfig, WebSite } from "@creact-labs/example-demo-site";

interface Generation {
  prompt: string;
}

// #region hero
export function App() {
  const [sites, setSites] = createSignal<SiteConfig[]>([]);
  const [pendingGeneration, setPendingGeneration] =
    createSignal<Generation | null>(null);

  const handleGenerate = (prompt: string) =>
    setPendingGeneration({ prompt });
  const handleList = () => sites();

  return (
    <>
      <Channel key="api" port={3000} onGenerate={handleGenerate} onList={handleList} />
      <Claude>
        <Show when={() => pendingGeneration()}>
          {(gen) => <GenerateHtml key="gen" prompt={gen().prompt} />}
        </Show>
      </Claude>
      <AWS region="us-east-1">
        <For each={sites()} keyFn={(site) => site.path}>
          {(site) => (
            <WebSite name={() => site().path} content={() => site().content} />
          )}
        </For>
      </AWS>
    </>
  );
}
// #endregion hero
