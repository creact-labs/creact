# 5. Provider & Backend

> **Full example**: [creact-agentic-chatbot-example](https://github.com/creact-labs/creact-agentic-chatbot-example)

## Provider

```ts
// src/providers/Provider.ts
import 'dotenv/config';
import { EventEmitter } from 'events';
import type { Provider as IProvider, InstanceNode } from '@creact-labs/creact';
import {
  handleHttpServer,
  handleChatHandler,
  handleChatResponse,
  handleCompletion,
  handleMemory,
  handleAddMessages,
  handleChatModel,
  handleTool,
  handleMessage,
} from './handlers';

export class Provider extends EventEmitter implements IProvider {
  async materialize(nodes: InstanceNode[]): Promise<void> {
    for (const node of nodes) {
      switch (node.constructType) {
        case 'HttpServer':
          handleHttpServer(node);
          break;
        case 'ChatHandler':
          handleChatHandler(node, this);
          break;
        case 'ChatResponse':
          handleChatResponse(node, this);
          break;
        case 'Completion':
          handleCompletion(node, this);
          break;
        case 'Memory':
          handleMemory(node);
          break;
        case 'AddMessages':
          handleAddMessages(node, this);
          break;
        case 'ChatModel':
          handleChatModel(node);
          break;
        case 'Tool':
          handleTool(node);
          break;
        case 'Message':
          handleMessage(node);
          break;
      }
    }
  }

  async destroy(): Promise<void> {}
  stop(): void {}
}
```

## HTTP Handlers

```ts
// src/providers/handlers/http.ts
import type { InstanceNode } from '@creact-labs/creact';
import express, { type Express, type Response } from 'express';
import path from 'path';
import type { EventEmitter } from 'events';

const serverInstances = new Map<string, { app: Express; url: string }>();
const handlerInstances = new Map<string, { pending: any; waitingRes: Response | null }>();

export function handleHttpServer(node: InstanceNode): void {
  const id = node.id;
  const { port, staticDir } = node.props;

  if (!serverInstances.has(id)) {
    const app = express();
    app.use(express.json());

    if (staticDir) {
      app.use(express.static(path.resolve(staticDir)));
    }

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });

    serverInstances.set(id, { app, url: `http://localhost:${port}` });
  }

  const server = serverInstances.get(id)!;
  node.setOutputs({ id, url: server.url });
}

export function handleChatHandler(node: InstanceNode, emitter: EventEmitter): void {
  const id = node.id;
  const { serverId, path: routePath } = node.props;

  const server = serverInstances.get(serverId);
  if (!server) return;

  if (!handlerInstances.has(id)) {
    handlerInstances.set(id, { pending: null, waitingRes: null });

    server.app.post(routePath, (req, res) => {
      const handler = handlerInstances.get(id)!;
      const messageId = Date.now().toString();

      handler.pending = { id: messageId, content: req.body.message };
      handler.waitingRes = res;

      emitter.emit('outputsChanged', {
        resourceName: id,
        outputs: { id, pending: handler.pending },
        timestamp: Date.now(),
      });
    });
  }

  const handler = handlerInstances.get(id)!;
  node.setOutputs({ id, pending: handler.pending });
}

export function handleChatResponse(node: InstanceNode, emitter: EventEmitter): void {
  const { handlerId, messageId, content } = node.props;
  if (!handlerId || !content) return;

  // Idempotency check
  if (node.outputs?.sent && node.outputs?.messageId === messageId) {
    return;
  }

  const handler = handlerInstances.get(handlerId);
  if (!handler?.waitingRes) return;

  if (handler.pending?.id === messageId) {
    handler.waitingRes.json({ response: content });
    handler.pending = null;
    handler.waitingRes = null;

    node.setOutputs({ sent: true, messageId });

    emitter.emit('outputsChanged', {
      resourceName: handlerId,
      outputs: { id: handlerId, pending: null },
      timestamp: Date.now(),
    });
  }
}
```

## Completion Handler

```ts
// src/providers/handlers/completion.ts
import type { InstanceNode } from '@creact-labs/creact';
import type { EventEmitter } from 'events';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completionStarted = new Set<string>();

export function handleCompletion(node: InstanceNode, emitter: EventEmitter): void {
  const { requestId, model, messages, tools } = node.props;
  if (!requestId || !model || !messages) return;

  // Already have response
  if (node.outputs?.response && node.outputs?.requestId === requestId) {
    return;
  }

  // Already started
  if (completionStarted.has(requestId)) {
    return;
  }

  completionStarted.add(requestId);
  const nodeId = node.id;

  (async () => {
    const openaiTools = tools?.length ? tools.map((tool: any) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })) : undefined;

    const toolMap = new Map(tools?.map((t: any) => [t.name, t]) || []);
    let currentMessages: Array<any> = [...messages];

    while (true) {
      const completion = await openai.chat.completions.create({
        model,
        messages: currentMessages,
        tools: openaiTools,
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Final response
      if (choice.finish_reason === 'stop' || !message.tool_calls?.length) {
        emitter.emit('outputsChanged', {
          resourceName: nodeId,
          outputs: { id: nodeId, status: 'complete', response: message.content || '', requestId },
          timestamp: Date.now(),
        });
        break;
      }

      // Handle tool calls
      currentMessages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;

        const tool = toolMap.get(toolCall.function.name) as any;
        let result: string;

        if (tool) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            result = await tool.execute(args);
          } catch (error) {
            result = `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        } else {
          result = `Unknown tool: ${toolCall.function.name}`;
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }
  })();
}
```

The handler runs tools in a loop until OpenAI returns a final response.

## Memory Handler

```ts
// src/providers/handlers/memory.ts
import type { InstanceNode } from '@creact-labs/creact';
import type { EventEmitter } from 'events';

function hash(obj: any): string {
  return JSON.stringify(obj);
}

export function handleMemory(node: InstanceNode): void {
  const messages = node.outputs?.messages || [];
  node.setOutputs({ id: node.id, messages });
}

export function handleAddMessages(node: InstanceNode, emitter: EventEmitter): void {
  const { memoryId, currentMessages, newMessages: messagesToAdd } = node.props;
  if (!memoryId || !messagesToAdd?.length) return;

  // Idempotency check
  const propsHash = hash({ memoryId, messagesToAdd });
  if (node.outputs?.propsHash === propsHash) {
    return;
  }

  node.setOutputs({ added: true, propsHash });

  const newMessages = [...(currentMessages || []), ...messagesToAdd];
  emitter.emit('outputsChanged', {
    resourceName: memoryId,
    outputs: { id: memoryId, messages: newMessages },
    timestamp: Date.now(),
  });
}
```

## Chat Handlers

```ts
// src/providers/handlers/chat.ts
import type { InstanceNode } from '@creact-labs/creact';

export function handleChatModel(node: InstanceNode): void {
  node.setOutputs({ id: node.id, model: node.props.model });
}

export function handleTool(node: InstanceNode): void {
  node.setOutputs({
    id: node.id,
    name: node.props.name,
    description: node.props.description
  });
}

export function handleMessage(node: InstanceNode): void {
  node.setOutputs({
    id: node.id,
    role: node.props.role,
    content: node.props.content
  });
}
```

## FileBackend

```ts
// src/providers/FileBackend.ts
import { readFile, writeFile, mkdir, rm, access, rename } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Backend, DeploymentState, AuditLogEntry } from '@creact-labs/creact';

export class FileBackend implements Backend {
  private directory: string;
  private prettyPrint: boolean;

  constructor(options: { directory: string; prettyPrint?: boolean }) {
    this.directory = options.directory;
    this.prettyPrint = options.prettyPrint ?? true;
  }

  async getState(stackName: string): Promise<DeploymentState | null> {
    const path = join(this.directory, `${stackName}.json`);
    try {
      const content = await readFile(path, 'utf-8');
      const state: DeploymentState = JSON.parse(content);

      // Clear ephemeral outputs on restart
      const ephemeralTypes = ['HttpServer', 'ChatHandler'];
      if (state?.nodes) {
        for (const node of state.nodes) {
          if (ephemeralTypes.includes(node.constructType)) {
            delete node.outputs;
          }
        }
      }
      return state;
    } catch {
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, `${stackName}.json`);
    const tempPath = join(this.directory, `.${stackName}.${randomUUID()}.tmp`);
    const content = this.prettyPrint ? JSON.stringify(state, null, 2) : JSON.stringify(state);

    // Atomic write
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, path);
  }

  async acquireLock(stackName: string, holder: string, ttlSeconds: number): Promise<boolean> {
    // ... lock implementation
  }

  async releaseLock(stackName: string): Promise<void> {
    // ... release implementation
  }

  async appendAuditLog(stackName: string, entry: AuditLogEntry): Promise<void> {
    // ... audit implementation
  }

  async getAuditLog(stackName: string, limit?: number): Promise<AuditLogEntry[]> {
    // ... get audit implementation
  }

  async deleteStack(stackName: string): Promise<void> {
    // ... delete implementation
  }
}
```

Key patterns:
- Idempotency via hash-based caching
- `outputsChanged` events trigger re-renders
- Ephemeral outputs cleared on restart

---

Next: [6. Run](./6-run.md)
