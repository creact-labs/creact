# 4. Components

Components compose constructs using JSX.

Each component wraps a construct and uses render props to pass outputs down. This creates a tree where child components can access parent outputs.

```tsx
// src/components/App.tsx
import { useInstance, type OutputAccessors } from 'creact';
import { ChatModel, type ChatModelOutputs } from '../constructs/ChatModel';
import { Memory, type MemoryOutputs } from '../constructs/Memory';
import { Tool, type ToolOutputs } from '../constructs/Tool';
import { Completion, type CompletionOutputs, type ToolCall } from '../constructs/Completion';
import { ToolExec, type ToolExecOutputs } from '../constructs/ToolExec';
import { AddMessage } from '../constructs/AddMessage';
import { HttpServer, type HttpServerOutputs } from '../constructs/HttpServer';
import { ChatHandler, type ChatHandlerOutputs, type PendingMessage } from '../constructs/ChatHandler';
import { ChatResponse } from '../constructs/ChatResponse';

// Resource components - one useInstance each
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

function Complete({ modelId, messages, toolIds, children }: {
  modelId: string | undefined;
  messages: any[];
  toolIds: string[];
  children: (outputs: OutputAccessors<CompletionOutputs>) => any;
}) {
  const outputs = useInstance<CompletionOutputs>(Completion, {
    modelId,
    messages,
    toolIds
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

function SaveMessage({ memoryId, role, content }: {
  memoryId: string | undefined;
  role: 'user' | 'assistant' | 'tool';
  content: string | undefined;
}) {
  useInstance(AddMessage, { memoryId, role, content });
  return null;
}
```

The Agent component handles the LLM loop:

```tsx
function Agent({ prompt, modelId, memoryId, toolIds, messages, onResponse }: {
  prompt: string;
  modelId: string | undefined;
  memoryId: string | undefined;
  toolIds: string[];
  messages: any[];
  onResponse: (content: string) => any;
}) {
  const allMessages = [...messages, { role: 'user', content: prompt }];

  return (
    <Complete modelId={modelId} messages={allMessages} toolIds={toolIds}>
      {(completion) => {
        const content = completion.content();
        const toolCalls = completion.toolCalls() || [];

        if (toolCalls.length > 0) {
          return (
            <>
              {toolCalls.map((call) => (
                <ExecTool key={call.id} call={call}>
                  {(exec) => {
                    const result = exec.result();
                    if (!result) return null;

                    const updatedMessages = [
                      ...allMessages,
                      { role: 'assistant', content: null, tool_calls: toolCalls },
                      { role: 'tool', tool_call_id: call.id, content: result }
                    ];

                    return (
                      <Complete modelId={modelId} messages={updatedMessages} toolIds={toolIds}>
                        {(final) => {
                          const response = final.content();
                          if (!response) return null;

                          return (
                            <>
                              <SaveMessage memoryId={memoryId} role="user" content={prompt} />
                              <SaveMessage memoryId={memoryId} role="assistant" content={response} />
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

        if (content) {
          return (
            <>
              <SaveMessage memoryId={memoryId} role="user" content={prompt} />
              <SaveMessage memoryId={memoryId} role="assistant" content={content} />
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

Now wire everything together. The App starts the server, waits for messages, runs the agent, sends responses:

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

                        return (
                          <Agent
                            prompt={pending.content}
                            modelId={model.id()}
                            memoryId={memory.id()}
                            toolIds={[wiki.id()].filter(Boolean) as string[]}
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

Next: [5. Run](./5-run.md)
