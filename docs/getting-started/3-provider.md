# 3. Provider

The provider is where constructs become real.

CReact calls `materialize()` with a list of construct instances. The provider looks at each one, does the work, and sets outputs.

```ts
// src/providers/Provider.ts
import 'dotenv/config';
import { EventEmitter } from 'events';
import type { Provider as IProvider, InstanceNode } from 'creact';
import OpenAI from 'openai';
import express, { type Express, type Response } from 'express';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory storage
const models = new Map<string, { model: string }>();
const memories = new Map<string, { messages: any[] }>();
const tools = new Map<string, { name: string; description: string }>();
const servers = new Map<string, { app: Express; url: string }>();
const handlers = new Map<string, { pending: any; waitingRes: Response | null }>();

async function searchWikipedia(query: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?` +
    `action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    `&format=json&srlimit=3`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.query?.search || [])
    .map((r: any) => `${r.title}: ${r.snippet.replace(/<[^>]*>/g, '')}`)
    .join('\n\n');
}

export class Provider extends EventEmitter implements IProvider {
  async materialize(nodes: InstanceNode[]): Promise<void> {
    for (const node of nodes) {
      switch (node.constructType) {
        case 'ChatModel': {
          const id = node.resourceName;
          models.set(id, { model: node.props.model });
          node.setOutputs({ id });
          break;
        }

        case 'Memory': {
          const id = node.resourceName;
          if (!memories.has(id)) {
            memories.set(id, { messages: [] });
          }
          const mem = memories.get(id)!;
          node.setOutputs({ id, messages: [...mem.messages] });
          break;
        }

        case 'Tool': {
          const id = node.resourceName;
          tools.set(id, {
            name: node.props.name,
            description: node.props.description
          });
          node.setOutputs({ id });
          break;
        }

        case 'Completion': {
          const { modelId, messages, toolIds } = node.props;
          if (!modelId || !messages) break;

          const model = models.get(modelId);
          if (!model) break;

          // Convert to OpenAI format
          const openaiTools = toolIds
            .map((id: string) => tools.get(id))
            .filter(Boolean)
            .map((t: any) => ({
              type: 'function' as const,
              function: {
                name: t.name,
                description: t.description,
                parameters: {
                  type: 'object',
                  properties: { query: { type: 'string' } },
                  required: ['query']
                }
              }
            }));

          const response = await openai.chat.completions.create({
            model: model.model,
            messages,
            tools: openaiTools.length ? openaiTools : undefined
          });

          const msg = response.choices[0].message;
          const toolCalls = (msg.tool_calls || []).map(tc => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          }));

          node.setOutputs({
            content: msg.content,
            toolCalls
          });
          break;
        }

        case 'ToolExec': {
          const { args } = node.props;
          if (!args?.query) break;

          const result = await searchWikipedia(args.query);
          node.setOutputs({ result });
          break;
        }

        case 'AddMessage': {
          const { memoryId, role, content } = node.props;
          if (!memoryId || !content) break;

          const mem = memories.get(memoryId);
          if (!mem) break;

          mem.messages.push({ role, content });
          node.setOutputs({ added: true });
          break;
        }

        case 'HttpServer': {
          const id = node.resourceName;
          const { port, staticDir } = node.props;

          if (!servers.has(id)) {
            const app = express();
            app.use(express.json());

            if (staticDir) {
              app.use(express.static(path.resolve(staticDir)));
            }

            app.listen(port, () => {
              console.log(`Server running at http://localhost:${port}`);
            });

            servers.set(id, { app, url: `http://localhost:${port}` });
          }

          const server = servers.get(id)!;
          node.setOutputs({ id, url: server.url });
          break;
        }

        case 'ChatHandler': {
          const id = node.resourceName;
          const { serverId, path: routePath } = node.props;

          const server = servers.get(serverId);
          if (!server) break;

          if (!handlers.has(id)) {
            handlers.set(id, { pending: null, waitingRes: null });

            server.app.post(routePath, (req, res) => {
              const handler = handlers.get(id)!;
              const messageId = Date.now().toString();

              handler.pending = { id: messageId, content: req.body.message };
              handler.waitingRes = res;

              // Trigger re-render
              this.emit('change');
            });
          }

          const handler = handlers.get(id)!;
          node.setOutputs({ id, pending: handler.pending });
          break;
        }

        case 'ChatResponse': {
          const { handlerId, messageId, content } = node.props;
          if (!handlerId || !content) break;

          const handler = handlers.get(handlerId);
          if (!handler?.waitingRes) break;

          // Only respond if this is for the current pending message
          if (handler.pending?.id === messageId) {
            handler.waitingRes.json({ response: content });
            handler.pending = null;
            handler.waitingRes = null;
          }

          node.setOutputs({ sent: true });
          break;
        }
      }
    }
  }

  async destroy(): Promise<void> {}
  stop(): void {}
}
```

The new constructs form a cycle:

1. **HttpServer** starts Express, serves the chat page
2. **ChatHandler** sets up POST /chat, stores incoming messages
3. When a message arrives, provider emits `change` → CReact re-renders
4. The component tree sees `pending`, runs the Agent
5. **ChatResponse** sends the response, clears the pending state

---

Next: [4. Components](./4-components.md)
