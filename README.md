<p align="center">
  <img src="https://img.shields.io/npm/v/@creact-labs/creact" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@creact-labs/creact" alt="license" />
</p>

# CReact

What if you could generate SEO-optimized product pages by researching competitors automatically?

```tsx
<FormTrigger fields={['productTitle']}>
  {(form) => (
    <GoogleSearch query={`intitle:"${form.productTitle()}" pricing OR features`}>
      {(results) => (
        <ExtractText items={results.items()} fields={['title', 'snippet']}>
          {(extracted) => (
            <GeminiCompletion prompt={`Generate SEO meta and product description:\n${extracted.text()}`}>
              {(content) => (
                <>
                  <ParseSections text={content.output()} format="seo,product">
                    {(parsed) => (
                      <GoogleSheetAppend doc="catalog" row={parsed.fields()} />
                    )}
                  </ParseSections>

                  <SlackMessage channel="#products" text={`New: ${form.productTitle()}`} />
                </>
              )}
            </GeminiCompletion>
          )}
        </ExtractText>
      )}
    </GoogleSearch>
  )}
</FormTrigger>
```

Form → Search → Extract → AI → branches to Sheets and Slack. Each construct is one action.

```bash
npm install @creact-labs/creact
```

## How it works

**Constructs** define what you want (props) and what you get (outputs).

**Components** compose constructs with JSX. Dependencies flow through render props.

**Providers** execute constructs against real infrastructure (AWS, Terraform, APIs).

**Backends** persist state for crash recovery and incremental updates.

## Try it

- [Agentic Chatbot Demo](https://github.com/creact-labs/creact-agentic-chatbot-example) — Build a chatbot with web search and browsing in 15 minutes

## Documentation

- [Tutorial](./docs/getting-started/1-setup.md) — Build an agentic chatbot with web search and browsing
- [Concepts](./docs/concepts/index.md) — Core mental model

## License

Apache-2.0
