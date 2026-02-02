<p align="center">
  <img src="https://img.shields.io/npm/v/@creact-labs/creact" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@creact-labs/creact" alt="license" />
</p>

# CReact

CReact is a meta-runtime for building domain-specific, reactive execution engines — where providers define the laws of reality, and JSX defines programs that run inside them.

```tsx
<Server port={3000}>
  {(server) => (
    <Chat serverId={server.id()} path="/chat">
      {(chat) => (
        <Model model="gpt-4o-mini">
          {(model) => (
            <Memory>
              {(memory) => {
                const pending = chat.pending();
                if (!pending) return null;

                const history = memory.messages() ?? [];

                return (
                  <Completion
                    requestId={pending.id}
                    model={model.model()}
                    messages={[
                      { role: 'system', content: 'You are a helpful assistant.' },
                      ...history,
                      { role: 'user', content: pending.content },
                    ]}
                  >
                    {(response, conversation) => (
                      <>
                        <SaveMessages
                          memoryId={memory.id()}
                          currentMessages={history}
                          newMessages={conversation.slice(history.length)}
                        />

                        <SendResponse
                          handlerId={chat.id()}
                          messageId={pending.id}
                          content={response}
                        />
                      </>
                    )}
                  </Completion>
                );
              }}
            </Memory>
          )}
        </Model>
      )}
    </Chat>
  )}
</Server>
```
## Getting started

```bash
npm install @creact-labs/creact
```

## Try it

- [Agentic Chatbot Demo](https://github.com/creact-labs/creact-agentic-chatbot-example) — Build a chatbot with web search and browsing in 15 minutes

## Documentation

- [Tutorial](./docs/getting-started/1-setup.md) — Build an agentic chatbot with web search and browsing
- [Concepts](./docs/concepts/index.md) — Core mental model

## License

Apache-2.0
