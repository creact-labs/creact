# CReact

**Declarative reactive runtime for AI agents, cloud infrastructure, and automation.**

Build complex workflows with JSX. Describe *what* you want — CReact figures out *how*.

## Install

```bash
npm install @creact-labs/creact
```

## Example: AI Content Pipeline

A workflow that generates blog posts and publishes to multiple channels — all reactive and declarative:

```tsx
import { CReact, renderCloudDOM, useInstance, createSignal } from '@creact-labs/creact';

// 🤖 AI generates content from a topic
function AIWriter({ topic, children }) {
  const content = useInstance(OpenAICompletion, {
    model: 'gpt-4',
    prompt: `Write a blog post about: ${topic}`,
  });
  return children(content);
}

// 📝 Publish to your blog
function BlogPost({ title, content }) {
  return useInstance(WordPressPost, { title, content, status: 'published' });
}

// 🐦 Share on social
function Tweet({ content }) {
  return useInstance(TwitterPost, { 
    text: content.summary(),
    thread: true,
  });
}

// 💬 Notify your team
function SlackNotify({ channel, message }) {
  return useInstance(SlackMessage, { channel, text: message });
}

// 🔗 Compose the pipeline
function ContentPipeline({ topic }) {
  return (
    <AIWriter topic={topic}>
      {(content) => (
        <>
          <BlogPost title={content.title()} content={content.body()} />
          <Tweet content={content} />
          <SlackNotify 
            channel="#content" 
            message={`✨ New post published: ${content.title()}`} 
          />
        </>
      )}
    </AIWriter>
  );
}

// Run it
await renderCloudDOM(<ContentPipeline topic="Why CReact changes everything" />);
```

**Change the topic → everything updates.** The blog post regenerates, tweet updates, Slack notifies.

## Why CReact?

| Traditional Approach | CReact |
|---------------------|--------|
| Imperative scripts that break | Declarative specs that reconcile |
| Manual dependency tracking | Automatic reactive updates |
| Scattered state across files | Single source of truth |
| Hard to test and reason about | Composable, testable components |

## The Four Pillars

**Declarative** — Describe what you want, not how to get it.

**Universal** — Works for AI agents, cloud infrastructure, APIs, anything.

**Reactive** — Automatically responds when things change.

**Runtime** — Keeps running continuously, handles events, recovers from crashes.

## Documentation

- [Tutorial: Build an AI Agent](./docs/getting-started/1-setup.md)
- [Thinking in CReact](./docs/concepts/thinking-in-creact.md)
- [Constructs](./docs/concepts/constructs.md)
- [Components](./docs/concepts/components.md)
- [Reactivity](./docs/concepts/reactivity.md)
- [Providers](./docs/concepts/providers.md)

## License

Apache-2.0
