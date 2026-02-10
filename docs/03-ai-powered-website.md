# Chapter 3: AI-Powered Website

Your website deploys, but the HTML is static. What if you could describe what you want and let AI write it?

This chapter adds Claude to your app. You'll generate HTML from prompts and deploy it automatically.

---

## Prerequisites

You'll need:

- The project from Chapter 2
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

Install the Anthropic SDK and dotenv:

```bash
npm install @anthropic-ai/sdk dotenv
```

Create `.env` in your project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Add `.env` to your `.gitignore`.

---

## Step 1: Load Environment Variables

Update `index.tsx` to load `.env`:

```tsx
import { config } from "dotenv";
import { render } from "@creact-labs/creact";
import { FileMemory } from "./src/memory";
import { App } from "./src/app";

config();

export const STACK_NAME = "my-app";

export default async function () {
  const memory = new FileMemory("./.state");
  return render(() => <App />, memory, STACK_NAME);
}
```

---

## Step 2: File System Utilities

Create helpers for reading and writing files.

Create `src/fs/read.ts`:

```tsx
import { readFileSync } from "fs";
import { join } from "path";

export function readFile(path: string, file: string): string {
  return readFileSync(join(path, file), "utf-8");
}
```

Create `src/fs/write.ts`:

```tsx
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export function writeFile(path: string, file: string, content: string): string {
  const filePath = join(path, file);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}
```

Create `src/fs/index.ts`:

```tsx
export * from "./read";
export * from "./write";
```

---

## Step 3: The Claude Provider

Create a provider that shares Claude's API with child components.

Create `src/components/claude.tsx`:

```tsx
import {
  createContext,
  useContext,
  type CReactNode,
} from "@creact-labs/creact";
import Anthropic from "@anthropic-ai/sdk";

export interface CompletionOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

const ClaudeContext = createContext<{
  complete: (options: CompletionOptions) => Promise<string>;
} | null>(null);

interface ClaudeProps {
  model?: string;
  children: CReactNode;
}

export function Claude(props: ClaudeProps) {
  const model = props.model ?? "claude-sonnet-4-20250514";
  const client = new Anthropic();

  async function complete(options: CompletionOptions): Promise<string> {
    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text ?? "";
  }

  return (
    <ClaudeContext.Provider value={{ complete }}>
      {props.children}
    </ClaudeContext.Provider>
  );
}

export function useComplete(): (options: CompletionOptions) => Promise<string> {
  const ctx = useContext(ClaudeContext);
  if (!ctx) {
    throw new Error("useComplete must be used inside <Claude>");
  }
  return ctx.complete;
}
```

---

## Step 4: The GenerateHtml Component

This component reads existing HTML (if any), sends it to Claude with your prompt, and writes the result.

Create `src/components/generate-html.tsx`:

```tsx
import { useAsyncOutput, createEffect } from "@creact-labs/creact";
import { existsSync } from "fs";
import { join } from "path";

import { useComplete } from "./claude";
import { readFile, writeFile } from "../fs";

interface GenerateHtmlProps {
  path: string;
  file: string;
  prompt: string;
  onGenerated?: (content: string) => void;
}

export function GenerateHtml(props: GenerateHtmlProps) {
  const complete = useComplete();

  const generate = useAsyncOutput(
    { path: props.path, file: props.file, prompt: props.prompt },
    async (props, setOutputs) => {
      // Skip if already generated for this prompt
      let existingPrompt: string | undefined;
      setOutputs((prev) => {
        existingPrompt = prev?.prompt;
        return prev ?? { status: "pending" };
      });
      if (existingPrompt === props.prompt) return;

      setOutputs({ status: "reading", prompt: props.prompt });

      // Read existing HTML for context
      const filePath = join(props.path, props.file);
      let existingHtml = "";
      if (existsSync(filePath)) {
        existingHtml = readFile(props.path, props.file);
      }

      setOutputs({ status: "generating", prompt: props.prompt });

      const systemPrompt = existingHtml
        ? `You are an HTML generator. The user will provide instructions. Here is the current HTML:\n\n${existingHtml}\n\nGenerate updated HTML based on the instructions. Output only the HTML, no explanation.`
        : `You are an HTML generator. The user will provide instructions. Generate HTML based on the instructions. Output only the HTML, no explanation.`;

      const html = await complete({
        prompt: props.prompt,
        system: systemPrompt,
      });

      setOutputs({ status: "writing", prompt: props.prompt });

      const outputPath = writeFile(props.path, props.file, html);
      setOutputs({
        status: "complete",
        prompt: props.prompt,
        outputPath,
        html,
      });
    },
  );

  createEffect(() => {
    const status = generate.status();
    if (!status) return;

    if (status === "complete") {
      const outputPath = generate.outputPath() as string;
      const html = generate.html() as string;
      console.log(`HTML generated: ${outputPath}`);
      if (props.onGenerated) {
        props.onGenerated(html);
      }
    } else {
      console.log(`Generate status: ${status}`);
    }
  });

  return <></>;
}
```

Key points:

- The handler checks if it already ran for this prompt—avoids regenerating on restart
- It reads existing HTML so Claude can update it rather than start from scratch
- The `onGenerated` callback lets parent components react to the new content

---

## Step 5: Update the Read Component

Update `src/components/read.tsx` to use the file utility and support a callback:

```tsx
import { useAsyncOutput, createEffect } from "@creact-labs/creact";
import { readFile } from "../fs";

interface ReadProps {
  path: string;
  file: string;
  onRead?: (content: string) => void;
}

export function Read(props: ReadProps) {
  const read = useAsyncOutput(
    { path: props.path, file: props.file },
    async (props, setOutputs) => {
      const content = readFile(props.path, props.file);
      setOutputs({ content });
    },
  );

  createEffect(() => {
    const content = read.content() as string | undefined;
    if (content && props.onRead) {
      props.onRead(content);
    }
  });

  return <></>;
}
```

---

## Step 6: Update the Website Component

Update `src/components/website.tsx` to accept reactive content:

```tsx
import {
  useAsyncOutput,
  createEffect,
  access,
  type MaybeAccessor,
} from "@creact-labs/creact";

interface WebSiteProps {
  content: MaybeAccessor<string>;
}

export function WebSite(props: WebSiteProps) {
  const s3 = useS3();
  const tags = useAWSTags();
  const region = useAWSRegion();
  const accountId = useAWSAccountId();
  const bucketName = `${accountId}-${STACK_NAME}-website`;
  const content = access(props.content);

  const website = useAsyncOutput(
    { tags, region, bucketName, content },
    async (props, setOutputs) => {
      // ... rest stays the same, but use String(props.content) for upload:
      await uploadObject(
        s3,
        props.bucketName,
        "index.html",
        String(props.content),
        "text/html",
      );
      // ...
    },
  );
  // ...
}
```

---

## Step 7: Wire It Up

Update `src/app.tsx`:

```tsx
import { Show, createSignal } from "@creact-labs/creact";

import { AWS } from "./components/aws";
import { Claude } from "./components/claude";
import { GenerateHtml } from "./components/generate-html";
import { Read } from "./components/read";
import { WebSite } from "./components/website";

const SHOULD_GENERATE = process.env.SHOULD_GENERATE === "true";
const GENERATE_PROMPT = process.env.GENERATE_PROMPT ?? "";

export function App() {
  const [HTMLPage, setHTMLPage] = createSignal("");

  return (
    <Claude>
      <Show when={SHOULD_GENERATE}>
        <GenerateHtml
          key="generate"
          path="./resources/my-frontend"
          file="index.html"
          prompt={GENERATE_PROMPT}
          onGenerated={setHTMLPage}
        />
      </Show>

      <Read
        key="read"
        path="./resources/my-frontend"
        file="index.html"
        onRead={setHTMLPage}
      />

      <AWS key="aws" region="us-east-1">
        <Show when={() => HTMLPage()}>
          {() => <WebSite key="website" content={() => HTMLPage()} />}
        </Show>
      </AWS>
    </Claude>
  );
}
```

Notice:

- `<Show when={SHOULD_GENERATE}>` is a static boolean—no accessor needed
- `<Show when={() => HTMLPage()}>` is reactive—uses an accessor so CReact tracks changes
- `content={() => HTMLPage()}` passes an accessor to WebSite

---

## See It In Action

Deploy the existing HTML:

```bash
npm run dev
```

Generate new HTML with Claude:

```bash
SHOULD_GENERATE=true GENERATE_PROMPT="Create a pretty page with a storybook of cats" npm run dev
```

You'll see:

```
Generate status: pending
Generate status: reading
Generate status: generating
Generate status: writing
HTML generated: resources/my-frontend/index.html
Website status: creating_bucket
Website status: uploading
Website deployed: http://xxx-my-app-website.s3-website-us-east-1.amazonaws.com
```

Open the URL. Your AI-generated page is live.

---

## What Just Happened?

You built an app that:

1. **Generates HTML from prompts** — describe what you want, Claude writes it
2. **Updates existing content** — Claude sees the current HTML and modifies it
3. **Deploys automatically** — the new HTML goes live without manual steps
4. **Skips redundant work** — same prompt won't regenerate

---

Right now you control everything through environment variables and restarts. [Chapter 4](./04-creating-the-control-plane.md) adds an HTTP API so you can manage sites at runtime.
