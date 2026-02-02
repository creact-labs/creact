# 4. Components

> **Full example**: [creact-agentic-chatbot-example](https://github.com/creact-labs/creact-agentic-chatbot-example)

Components wrap constructs using `useInstance` and compose them with JSX.

## Server

```tsx
// src/components/server/Server.tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';
import { HttpServer, type HttpServerOutputs } from './HttpServer.construct';

export function Server({ port, staticDir, children }: {
  port: number;
  staticDir: string;
  children: (outputs: OutputAccessors<HttpServerOutputs>) => any;
}) {
  const outputs = useInstance<HttpServerOutputs>(HttpServer, { port, staticDir });
  return children(outputs);
}
```

## Chat

```tsx
// src/components/chat/Chat.tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';
import { ChatHandler, type ChatHandlerOutputs } from './ChatHandler.construct';

export function Chat({ serverId, path, children }: {
  serverId: string | undefined;
  path: string;
  children: (outputs: OutputAccessors<ChatHandlerOutputs>) => any;
}) {
  const outputs = useInstance<ChatHandlerOutputs>(ChatHandler, { serverId, path });
  return children(outputs);
}
```

## Model

```tsx
// src/components/chat/Model.tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';
import { ChatModel, type ChatModelOutputs } from './ChatModel.construct';

export function Model({ model, children }: {
  model: string;
  children: (outputs: OutputAccessors<ChatModelOutputs>) => any;
}) {
  const outputs = useInstance<ChatModelOutputs>(ChatModel, { model });
  return children(outputs);
}
```

## Memory

```tsx
// src/components/memory/Memory.tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';
import { Memory as MemoryConstruct, type MemoryOutputs } from './Memory.construct';

export function Memory({ children }: {
  children: (outputs: OutputAccessors<MemoryOutputs>) => any;
}) {
  const outputs = useInstance<MemoryOutputs>(MemoryConstruct, {});
  return children(outputs);
}
```

## SaveMessages

```tsx
// src/components/memory/SaveMessages.tsx
import { useInstance } from '@creact-labs/creact';
import { AddMessages } from './AddMessage.construct';

export function SaveMessages({ memoryId, currentMessages, newMessages }: {
  memoryId: string | undefined;
  currentMessages: any[];
  newMessages: Array<{ role: string; content: string }>;
}) {
  useInstance(AddMessages, { memoryId, currentMessages, newMessages });
  return null;
}
```

## Completion

```tsx
// src/components/completion/Completion.tsx
import { useInstance, type JSXElement } from '@creact-labs/creact';
import { Completion as CompletionConstruct, type CompletionOutputs } from './Completion.construct';
import { useTools } from '../tools/ToolContext';

export function Completion({ requestId, model, messages, children }: {
  requestId: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  children: (response: string) => JSXElement | null;
}) {
  const { tools: getTools } = useTools();
  const tools = getTools();

  const outputs = useInstance<CompletionOutputs>(CompletionConstruct, {
    requestId,
    model,
    messages,
    tools,
  });

  const response = outputs.response();
  if (!response) return null;
  return children(response);
}
```

## Message

```tsx
// src/components/message/Message.tsx
import { useInstance, type OutputAccessors } from '@creact-labs/creact';
import { Message as MessageConstruct, type MessageOutputs } from './Message.construct';

export function Message({ role, content, children }: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  children: (outputs: OutputAccessors<MessageOutputs>) => any;
}) {
  const outputs = useInstance<MessageOutputs>(MessageConstruct, { role, content });
  return children(outputs);
}
```

## SendResponse

```tsx
// src/components/chat/SendResponse.tsx
import { useInstance } from '@creact-labs/creact';
import { ChatResponse } from './ChatResponse.construct';

export function SendResponse({ handlerId, messageId, content }: {
  handlerId: string | undefined;
  messageId: string | undefined;
  content: string | undefined;
}) {
  useInstance(ChatResponse, { handlerId, messageId, content });
  return null;
}
```

## Tool Context

```tsx
// src/components/tools/ToolContext.tsx
import { createContext, useContext } from '@creact-labs/creact';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<string>;
}

interface ToolContextValue {
  tools: () => ToolDefinition[];
  registerTool: (tool: ToolDefinition) => void;
}

export const ToolContext = createContext<ToolContextValue>({
  tools: () => [],
  registerTool: () => {},
});

export const useTools = () => useContext(ToolContext);
```

## ToolProvider

```tsx
// src/components/tools/ToolProvider.tsx
import { createSignal, type JSXElement } from '@creact-labs/creact';
import { ToolContext, type ToolDefinition } from './ToolContext';

export function ToolProvider({ children }: { children: JSXElement | JSXElement[] }) {
  const [tools, setTools] = createSignal<ToolDefinition[]>([]);

  const registerTool = (tool: ToolDefinition) => {
    const prev = tools() || [];
    if (prev.some(t => t.name === tool.name)) return;
    setTools([...prev, tool]);
  };

  return (
    <ToolContext.Provider value={{ tools: () => tools() || [], registerTool }}>
      {children}
    </ToolContext.Provider>
  );
}
```

## Tool

```tsx
// src/components/tools/Tool.tsx
import { createEffect } from '@creact-labs/creact';
import { useTools } from './ToolContext';

export interface ToolProps {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>) => Promise<string>;
}

export function Tool({ name, description, parameters, execute }: ToolProps) {
  const { registerTool } = useTools();

  createEffect(() => {
    registerTool({ name, description, parameters, execute });
  });

  return null;
}
```

## DuckDuckGo

```tsx
// src/components/tools/DuckDuckGo.tsx
import { Tool } from './Tool';

export function DuckDuckGo() {
  return (
    <Tool
      name="web_search"
      description="Search the web using DuckDuckGo"
      parameters={{
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        },
        required: ["query"]
      }}
      execute={async (args) => {
        const { query } = args as { query: string };
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
        const res = await fetch(url);
        const data = await res.json();

        const results: string[] = [];
        if (data.Abstract) {
          results.push(`${data.AbstractText}\nSource: ${data.AbstractURL}`);
        }
        if (data.RelatedTopics?.length) {
          for (const topic of data.RelatedTopics.slice(0, 5)) {
            if (topic.Text && topic.FirstURL) {
              results.push(`${topic.Text}\n${topic.FirstURL}`);
            }
          }
        }
        return results.length ? results.join('\n\n') : `No results for "${query}"`;
      }}
    />
  );
}
```

## Browser

```tsx
// src/components/tools/Browser.tsx
import { Tool } from './Tool';
import { chromium } from 'playwright';

export function Browser() {
  return (
    <Tool
      name="browse_page"
      description="Visit a URL and extract its text content"
      parameters={{
        type: "object",
        properties: {
          url: { type: "string", description: "URL to visit" }
        },
        required: ["url"]
      }}
      execute={async (args) => {
        const { url } = args as { url: string };
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage();
          await page.goto(url, { timeout: 30000 });
          const text = await page.innerText('body');
          return text.slice(0, 4000) || 'No content found';
        } catch (e) {
          return `Failed to load page: ${e instanceof Error ? e.message : String(e)}`;
        } finally {
          await browser.close();
        }
      }}
    />
  );
}
```

## App

```tsx
// src/components/App.tsx
import { untrack } from '@creact-labs/creact';
import { Server } from './server';
import { Chat, Model, SendResponse } from './chat';
import { Memory, SaveMessages } from './memory';
import { Message } from './message';
import { Completion } from './completion';
import { ToolProvider, DuckDuckGo, Browser } from './tools';

export function App() {
  return (
    <Server key="main" port={3000} staticDir="./public">
      {(server) => (
        <Chat serverId={server.id()} path="/chat">
          {(chat) => (
            <Model model="gpt-4o-mini">
              {(model) => (
                <Memory>
                  {(memory) => {
                    const pending = chat.pending();
                    if (!pending?.id || !pending?.content) return null;

                    const modelName = model.model();
                    if (!modelName) return null;

                    // untrack prevents re-render loop when SaveMessages updates memory
                    const existingMessages = untrack(() => memory.messages()) || [];

                    return (
                      <ToolProvider>
                        <DuckDuckGo />
                        <Browser />
                        <Message key={`user-${pending.id}`} role="user" content={pending.content}>
                          {() => {
                            const allMessages = [
                              { role: 'system', content: 'You are a helpful assistant.' },
                              ...existingMessages.filter((m: any) => m?.role && m?.content),
                              { role: 'user', content: pending.content }
                            ];

                            return (
                              <Completion requestId={pending.id} model={modelName} messages={allMessages}>
                                {(responseContent) => (
                                  <Message key={`assistant-${pending.id}`} role="assistant" content={responseContent}>
                                    {() => (
                                      <>
                                        <SaveMessages
                                          memoryId={memory.id()}
                                          currentMessages={existingMessages}
                                          newMessages={[
                                            { role: 'user', content: pending.content },
                                            { role: 'assistant', content: responseContent }
                                          ]}
                                        />
                                        <SendResponse
                                          handlerId={chat.id()}
                                          messageId={pending.id}
                                          content={responseContent}
                                        />
                                      </>
                                    )}
                                  </Message>
                                )}
                              </Completion>
                            );
                          }}
                        </Message>
                      </ToolProvider>
                    );
                  }}
                </Memory>
              )}
            </Model>
          )}
        </Chat>
      )}
    </Server>
  );
}
```

Key patterns:
- `untrack()` prevents re-render loops when reading memory
- Tools register via context with `execute` functions
- `Completion` handles the tool loop internally

---

Next: [5. Provider](./5-provider.md)
