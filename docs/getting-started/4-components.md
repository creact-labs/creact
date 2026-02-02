# 4. Components

Components wrap constructs using `useInstance` and compose them with JSX.

## The pattern

```tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';

function Model({ model, children }: {
  model: string;
  children: (outputs: OutputAccessors<ChatModelOutputs>) => any;
}) {
  const outputs = useInstance<ChatModelOutputs>(ChatModel, { model });
  return children(outputs);
}
```

`useInstance` returns accessor functions. Call `outputs.model()` to get the value. Values are undefined until the provider sets them.

## Resource components

```tsx
// src/components/App.tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';
import { ChatModel, type ChatModelOutputs } from '../constructs/ChatModel';
import { Memory, type MemoryOutputs } from '../constructs/Memory';
import { Tool, type ToolOutputs } from '../constructs/Tool';
import { Completion, type CompletionOutputs, type ToolCall, type ToolConfig } from '../constructs/Completion';
import { ToolExec, type ToolExecOutputs } from '../constructs/ToolExec';
import { AddMessages } from '../constructs/AddMessage';
import { HttpServer, type HttpServerOutputs } from '../constructs/HttpServer';
import { ChatHandler, type ChatHandlerOutputs, type PendingMessage } from '../constructs/ChatHandler';
import { ChatResponse } from '../constructs/ChatResponse';

function Server({ port, staticDir, children }: {
  port: number;
  staticDir: string;
  children: (outputs: OutputAccessors<HttpServerOutputs>) => any;
}) {
  const outputs = useInstance<HttpServerOutputs>(HttpServer, { port, staticDir });
  return children(outputs);
}

function Chat({ serverId, path, children }: {
  serverId: string | undefined;
  path: string;
  children: (outputs: OutputAccessors<ChatHandlerOutputs>) => any;
}) {
  const outputs = useInstance<ChatHandlerOutputs>(ChatHandler, { serverId, path });
  return children(outputs);
}

function SendResponse({ handlerId, messageId, content }: {
  handlerId: string | undefined;
  messageId: string | undefined;
  content: string | undefined;
}) {
  useInstance(ChatResponse, { handlerId, messageId, content });
  return null;
}

function Model({ model, children }: {
  model: string;
  children: (outputs: OutputAccessors<ChatModelOutputs>) => any;
}) {
  const outputs = useInstance<ChatModelOutputs>(ChatModel, { model });
  return children(outputs);
}

function Mem({ children }: {
  children: (outputs: OutputAccessors<MemoryOutputs>) => any;
}) {
  const outputs = useInstance<MemoryOutputs>(Memory, {});
  return children(outputs);
}

function Wikipedia({ children }: {
  children: (outputs: OutputAccessors<ToolOutputs>) => any;
}) {
  const outputs = useInstance<ToolOutputs>(Tool, {
    name: 'wikipedia',
    description: 'Search Wikipedia for information'
  });
  return children(outputs);
}

function Complete({ model, messages, tools, children }: {
  model: string | undefined;
  messages: any[];
  tools: ToolConfig[];
  children: (outputs: OutputAccessors<CompletionOutputs>) => any;
}) {
  const outputs = useInstance<CompletionOutputs>(Completion, {
    model: model || '',
    messages,
    tools
  });
  return children(outputs);
}

function ExecTool({ call, children }: {
  call: ToolCall;
  children: (outputs: OutputAccessors<ToolExecOutputs>) => any;
}) {
  const outputs = useInstance<ToolExecOutputs>(ToolExec, {
    callId: call.id,
    args: call.args
  });
  return children(outputs);
}

function SaveMessages({ memoryId, currentMessages, newMessages }: {
  memoryId: string | undefined;
  currentMessages: any[];
  newMessages: Array<{ role: string; content: string }>;
}) {
  useInstance(AddMessages, { memoryId, currentMessages, newMessages });
  return null;
}
```

`Complete` takes the model name and tools directly, not IDs.

## Agent

```tsx
function Agent({ prompt, model, memoryId, tools, messages, onResponse }: {
  prompt: string;
  model: string | undefined;
  memoryId: string | undefined;
  tools: ToolConfig[];
  messages: any[];
  onResponse: (content: string) => any;
}) {
  const allMessages = [...messages, { role: 'user', content: prompt }];

  return (
    <Complete model={model} messages={allMessages} tools={tools}>
      {(completion) => {
        const content = completion.content();
        const toolCalls = completion.toolCalls() || [];

        // If the model wants to use tools
        if (toolCalls.length > 0) {
          return (
            <>
              {toolCalls.map((call: ToolCall) => (
                <ExecTool key={call.id} call={call}>
                  {(exec) => {
                    const result = exec.result();
                    if (!result) return null;

                    // Convert back to OpenAI format for the follow-up call
                    const openaiToolCalls = toolCalls.map((tc: ToolCall) => ({
                      id: tc.id,
                      type: 'function' as const,
                      function: {
                        name: tc.name,
                        arguments: JSON.stringify(tc.args)
                      }
                    }));

                    const updatedMessages = [
                      ...allMessages,
                      { role: 'assistant', content: null, tool_calls: openaiToolCalls },
                      { role: 'tool', tool_call_id: call.id, content: result }
                    ];

                    // Second call with tool results
                    return (
                      <Complete model={model} messages={updatedMessages} tools={tools}>
                        {(final) => {
                          const response = final.content();
                          if (!response) return null;

                          return (
                            <>
                              <SaveMessages
                                memoryId={memoryId}
                                currentMessages={messages}
                                newMessages={[
                                  { role: 'user', content: prompt },
                                  { role: 'assistant', content: response }
                                ]}
                              />
                              {onResponse(response)}
                            </>
                          );
                        }}
                      </Complete>
                    );
                  }}
                </ExecTool>
              ))}
            </>
          );
        }

        // Direct response, no tools
        if (content) {
          return (
            <>
              <SaveMessages
                memoryId={memoryId}
                currentMessages={messages}
                newMessages={[
                  { role: 'user', content: prompt },
                  { role: 'assistant', content: content }
                ]}
              />
              {onResponse(content)}
            </>
          );
        }

        return null;
      }}
    </Complete>
  );
}
```

## App

```tsx
export function App() {
  return (
    <Server port={3000} staticDir="./public">
      {(server) => (
        <Chat serverId={server.id()} path="/chat">
          {(chat) => (
            <Model model="gpt-4o-mini">
              {(model) => (
                <Mem>
                  {(memory) => (
                    <Wikipedia>
                      {(wiki) => {
                        const pending = chat.pending();
                        if (!pending) return null;

                        // Build tools array from wiki outputs
                        const wikiName = wiki.name();
                        const wikiDesc = wiki.description();
                        const toolsArray: ToolConfig[] = wikiName && wikiDesc
                          ? [{ name: wikiName, description: wikiDesc }]
                          : [];

                        return (
                          <Agent
                            prompt={pending.content}
                            model={model.model()}
                            memoryId={memory.id()}
                            tools={toolsArray}
                            messages={memory.messages() || []}
                            onResponse={(response) => (
                              <SendResponse
                                handlerId={chat.id()}
                                messageId={pending.id}
                                content={response}
                              />
                            )}
                          />
                        );
                      }}
                    </Wikipedia>
                  )}
                </Mem>
              )}
            </Model>
          )}
        </Chat>
      )}
    </Server>
  );
}
```

---

Next: [5. Provider](./5-provider.md)
