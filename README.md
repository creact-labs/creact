<p align="center">
  <img src="https://img.shields.io/npm/v/@creact-labs/creact" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@creact-labs/creact" alt="license" />
</p>

# CReact

A meta-runtime for building reactive execution engines. 

Components can declare anything you want, for example infrastructure, side effects, and AI calls using JSX. The runtime handles lifecycle, state persistence, and dependency tracking.

<p align="center">
  <img src="https://s12.gifyu.com/images/bkyAp.gif" alt="CReact demo" />
</p>

## Example

This is a multi-site platform that generates websites with AI and deploys them to AWS. An HTTP API accepts prompts, Claude generates HTML, and each site gets its own S3 bucket. State persists across restarts.

```tsx
export function App() {
  const [sites, setSites] = createSignal<SiteConfig[]>([]);
  const [initialized, setInitialized] = createSignal(false);

  const persistence = useAsyncOutput<{ sites: SiteConfig[] }>(
    () => ({ sites: sites() }),
    async (props, setOutputs) => {
      setOutputs(prev => {
        if (!initialized() && prev?.sites && prev.sites.length > 0) {
          setSites(prev.sites);
          setInitialized(true);
          return prev;
        }
        setInitialized(true);
        return { sites: props.sites };
      });
    }
  );

  const {
    shouldCleanup, pendingGeneration,
    handleList, handleGenerate, handleUpdate,
    handleCleanupSite, handleCleanupAll,
    updateSiteContent, onDeployed, onCleanupComplete,
    clearPendingGeneration,
  } = useSites(sites, setSites);

  return (
    <>
      <Channel
        port={3000}
        onList={handleList}
        onGenerate={handleGenerate}
        onUpdate={handleUpdate}
        onCleanupSite={handleCleanupSite}
        onCleanupAll={handleCleanupAll}
      />

      <HttpServer port={8080} path="./resources/admin" />

      <Claude>
        <Show when={() => pendingGeneration()}>
          {(gen) => {
            const { id, path, prompt } = gen();
            const [content, setContent] = createSignal('');
            return (
              <>
                <Read path={path} file="index.html">
                  {(existingContent) => (
                    <GenerateHtml
                      existingContent={existingContent}
                      prompt={prompt}
                      onGenerated={setContent}
                    />
                  )}
                </Read>
                <Show when={() => content()}>
                  {() => (
                    <Write
                      path={path}
                      file="index.html"
                      content={() => content()}
                      onWritten={() => {
                        updateSiteContent(id, content());
                        clearPendingGeneration();
                      }}
                    />
                  )}
                </Show>
              </>
            );
          }}
        </Show>
      </Claude>

      <AWS region="us-east-1" shouldCleanup={() => shouldCleanup()} onCleanupComplete={onCleanupComplete}>
        <For each={() => persistence.sites() ?? []} keyFn={(s) => s.id}>
          {(site) => (
            <Show when={() => site().content}>
              {() => (
                <WebSite
                  name={() => site().path}
                  content={() => site().content}
                  onDeployed={(url) => onDeployed(site().id, url)}
                />
              )}
            </Show>
          )}
        </For>
      </AWS>
    </>
  );
}
```

## Install

```bash
npm install @creact-labs/creact
```

## Documentation

[creact-labs.github.io/creact](https://creact-labs.github.io/creact)

## License

Apache-2.0
