# 5. Provider & Backend

## FileBackend

```ts
// src/providers/FileBackend.ts
import { readFile, writeFile, mkdir, rm, access, rename } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Backend, DeploymentState, AuditLogEntry } from '@creact-labs/creact';

export interface FileBackendOptions {
  directory: string;
  prettyPrint?: boolean;
}

export class FileBackend implements Backend {
  private directory: string;
  private prettyPrint: boolean;

  constructor(options: FileBackendOptions) {
    this.directory = options.directory;
    this.prettyPrint = options.prettyPrint ?? true;
  }

  private getStatePath(stackName: string): string {
    return join(this.directory, `${stackName}.json`);
  }

  private getLockPath(stackName: string): string {
    return join(this.directory, `${stackName}.lock`);
  }

  private getAuditPath(stackName: string): string {
    return join(this.directory, `${stackName}.audit.json`);
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async getState(stackName: string): Promise<DeploymentState | null> {
    const path = this.getStatePath(stackName);

    if (!(await this.fileExists(path))) {
      return null;
    }

    try {
      const content = await readFile(path, 'utf-8');
      const state: DeploymentState = JSON.parse(content);

      // Clear outputs for ephemeral resources (Express app, Response objects)
      // These can't be serialized and need fresh instances on restart
      const ephemeralTypes = ['HttpServer', 'ChatHandler'];
      if (state?.nodes) {
        for (const node of state.nodes) {
          if (ephemeralTypes.includes(node.constructType)) {
            delete node.outputs;
          }
        }
      }

      return state;
    } catch (error) {
      console.warn(`Failed to read state file ${path}:`, error);
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await this.ensureDirectory();

    const path = this.getStatePath(stackName);
    const tempPath = join(this.directory, `.${stackName}.${randomUUID()}.tmp`);
    const content = this.prettyPrint
      ? JSON.stringify(state, null, 2)
      : JSON.stringify(state);

    // Atomic write: write to temp file, then rename
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, path);
  }

  async acquireLock(stackName: string, holder: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureDirectory();

    const lockPath = this.getLockPath(stackName);
    const expiresAt = Date.now() + ttlSeconds * 1000;

    if (await this.fileExists(lockPath)) {
      try {
        const content = await readFile(lockPath, 'utf-8');
        const lock = JSON.parse(content);

        if (lock.expiresAt > Date.now() && lock.holder !== holder) {
          return false;
        }
      } catch {
        // Corrupted lock file, treat as expired
      }
    }

    await writeFile(
      lockPath,
      JSON.stringify({ holder, expiresAt }, null, 2),
      'utf-8'
    );

    return true;
  }

  async releaseLock(stackName: string): Promise<void> {
    const lockPath = this.getLockPath(stackName);

    if (await this.fileExists(lockPath)) {
      await rm(lockPath);
    }
  }

  async appendAuditLog(stackName: string, entry: AuditLogEntry): Promise<void> {
    await this.ensureDirectory();

    const auditPath = this.getAuditPath(stackName);
    let logs: AuditLogEntry[] = [];

    if (await this.fileExists(auditPath)) {
      try {
        const content = await readFile(auditPath, 'utf-8');
        logs = JSON.parse(content);
      } catch {
        logs = [];
      }
    }

    logs.push(entry);

    const content = this.prettyPrint
      ? JSON.stringify(logs, null, 2)
      : JSON.stringify(logs);

    await writeFile(auditPath, content, 'utf-8');
  }

  async getAuditLog(stackName: string, limit?: number): Promise<AuditLogEntry[]> {
    const auditPath = this.getAuditPath(stackName);

    if (!(await this.fileExists(auditPath))) {
      return [];
    }

    try {
      const content = await readFile(auditPath, 'utf-8');
      const logs: AuditLogEntry[] = JSON.parse(content);

      if (limit) {
        return logs.slice(-limit);
      }

      return logs;
    } catch {
      return [];
    }
  }

  async deleteStack(stackName: string): Promise<void> {
    const paths = [
      this.getStatePath(stackName),
      this.getLockPath(stackName),
      this.getAuditPath(stackName),
    ];

    for (const path of paths) {
      if (await this.fileExists(path)) {
        await rm(path);
      }
    }
  }
}
```

- Atomic writes prevent corruption
- Clears ephemeral outputs (HttpServer, ChatHandler) on restart

## Provider

```ts
// src/providers/Provider.ts
import 'dotenv/config';
import { EventEmitter } from 'events';
import type { Provider as IProvider, InstanceNode } from '@creact-labs/creact';
import OpenAI from 'openai';
import express, { type Express, type Response } from 'express';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple hash for cache keys
function hash(obj: any): string {
  return JSON.stringify(obj);
}

// Runtime objects that can't be serialized
const servers = new Map<string, { app: Express; url: string }>();
const handlers = new Map<string, { pending: any; waitingRes: Response | null }>();

// Idempotent caches (keyed by node.id)
const completionCache = new Map<string, { propsHash: string; result: any }>();
const toolExecCache = new Map<string, { propsHash: string; result: string }>();
const addMessageCache = new Map<string, { propsHash: string }>();
const responseCache = new Map<string, { messageId: string }>();

async function searchWikipedia(query: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?` +
    `action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    `&format=json&srlimit=3`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.query?.search || [])
    .map((r: any) => `${r.title}: ${r.snippet.replace(/<[^>]*>/g, '')}`)
    .join('\n\n') || `No results found for "${query}"`;
}

export class Provider extends EventEmitter implements IProvider {
  async materialize(nodes: InstanceNode[]): Promise<void> {
    for (const node of nodes) {
      switch (node.constructType) {
```

### ChatModel

```ts
        case 'ChatModel': {
          // Output the model name directly - no Map needed
          node.setOutputs({ id: node.id, model: node.props.model });
          break;
        }
```

### Memory

```ts
        case 'Memory': {
          // Get messages from hydrated outputs (persisted by CReact) or start empty
          const messages = node.outputs?.messages || [];
          node.setOutputs({ id: node.id, messages });
          break;
        }
```

Messages come from `node.outputs` (persisted by backend) or start empty.

### Tool

```ts
        case 'Tool': {
          // Output tool config directly - no Map needed
          node.setOutputs({
            id: node.id,
            name: node.props.name,
            description: node.props.description
          });
          break;
        }
```

### Completion

```ts
        case 'Completion': {
          const { model, messages, tools } = node.props;
          if (!model || !messages) break;

          // Check cache - only call OpenAI if inputs changed
          const propsHash = hash({ model, messages, tools });
          const cached = completionCache.get(node.id);

          if (cached && cached.propsHash === propsHash) {
            node.setOutputs(cached.result);
            break;
          }

          // Build OpenAI tools from props directly (no Map lookup)
          const openaiTools = (tools || [])
            .filter((t: any) => t?.name && t?.description)
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
            model,
            messages,
            tools: openaiTools.length ? openaiTools : undefined
          });

          const msg = response.choices[0].message;
          const toolCalls = (msg.tool_calls || []).map((tc: any) => ({
            id: tc.id,
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          }));

          const result = { content: msg.content, toolCalls };
          completionCache.set(node.id, { propsHash, result });
          node.setOutputs(result);
          break;
        }
```

Caches results for idempotency across re-renders.

### ToolExec

```ts
        case 'ToolExec': {
          const { callId, args } = node.props;
          if (!args?.query) break;

          // Check cache
          const propsHash = hash({ callId, args });
          const cached = toolExecCache.get(node.id);

          if (cached && cached.propsHash === propsHash) {
            node.setOutputs({ result: cached.result });
            break;
          }

          const result = await searchWikipedia(args.query);
          toolExecCache.set(node.id, { propsHash, result });
          node.setOutputs({ result });
          break;
        }
```

### AddMessage / AddMessages

```ts
        case 'AddMessage': {
          const { memoryId, currentMessages, role, content } = node.props;
          if (!memoryId || !content) break;

          // Check if already added (idempotent)
          const propsHash = hash({ memoryId, role, content });
          const cached = addMessageCache.get(node.id);

          if (cached && cached.propsHash === propsHash) {
            node.setOutputs({ added: true });
            break;
          }

          addMessageCache.set(node.id, { propsHash });

          // Build new messages array from props
          const newMessages = [...(currentMessages || []), { role, content }];

          // Tell CReact to update Memory's outputs with new messages
          this.emit('outputsChanged', {
            resourceName: memoryId,
            outputs: { id: memoryId, messages: newMessages },
            timestamp: Date.now(),
          });

          node.setOutputs({ added: true });
          break;
        }

        case 'AddMessages': {
          const { memoryId, currentMessages, newMessages: messagesToAdd } = node.props;
          if (!memoryId || !messagesToAdd?.length) break;

          // Check if already added (idempotent)
          const propsHash = hash({ memoryId, messagesToAdd });
          const cached = addMessageCache.get(node.id);

          if (cached && cached.propsHash === propsHash) {
            node.setOutputs({ added: true });
            break;
          }

          addMessageCache.set(node.id, { propsHash });

          // Build new messages array from props
          const newMessages = [...(currentMessages || []), ...messagesToAdd];

          // Tell CReact to update Memory's outputs with new messages
          this.emit('outputsChanged', {
            resourceName: memoryId,
            outputs: { id: memoryId, messages: newMessages },
            timestamp: Date.now(),
          });

          node.setOutputs({ added: true });
          break;
        }
```

Emits `outputsChanged` to update Memory's outputs.

### HttpServer

```ts
        case 'HttpServer': {
          const id = node.id;
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
```

### ChatHandler

```ts
        case 'ChatHandler': {
          const id = node.id;
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

              // Trigger re-render via CReact's event system
              this.emit('outputsChanged', {
                resourceName: id,
                outputs: { pending: handler.pending },
                timestamp: Date.now(),
              });
            });
          }

          const handler = handlers.get(id)!;
          node.setOutputs({ id, pending: handler.pending });
          break;
        }
```

Emits `outputsChanged` on POST, triggering re-render.

### ChatResponse

```ts
        case 'ChatResponse': {
          const { handlerId, messageId, content } = node.props;
          if (!handlerId || !content) break;

          // Check if already sent (idempotent)
          const cached = responseCache.get(node.id);
          if (cached && cached.messageId === messageId) {
            node.setOutputs({ sent: true });
            break;
          }

          const handler = handlers.get(handlerId);
          if (!handler?.waitingRes) break;

          if (handler.pending?.id === messageId) {
            handler.waitingRes.json({ response: content });
            handler.pending = null;
            handler.waitingRes = null;
            responseCache.set(node.id, { messageId });
          }

          node.setOutputs({ sent: true });
          break;
        }
```

```ts
      }
    }
  }
  async destroy(): Promise<void> {}
  stop(): void {}
}
```

---

Next: [6. Run](./6-run.md)
