# 5. Run

## Entry point

```tsx
// src/app.tsx
import { CReact, renderCloudDOM } from '@creact-labs/creact';
import { App } from './components/App';
import { Provider } from './providers/Provider';
import { InMemoryBackend } from './providers/InMemoryBackend';

CReact.provider = new Provider();
CReact.backend = new InMemoryBackend();

export default async function main() {
  await renderCloudDOM(<App />, 'agent');
  console.log('Agent running at http://localhost:3000');
}
```

## Chat page

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Agent</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    .message {
      max-width: 80%;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      border-radius: 1rem;
    }
    .user {
      background: #3b82f6;
      margin-left: auto;
    }
    .assistant {
      background: #1e293b;
    }
    #input-area {
      padding: 1rem;
      background: #1e293b;
      display: flex;
      gap: 0.5rem;
    }
    #input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 0.5rem;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 1rem;
    }
    #input:focus { outline: none; }
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      background: #3b82f6;
      color: white;
      cursor: pointer;
    }
    button:disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <div id="messages"></div>
  <div id="input-area">
    <input type="text" id="input" placeholder="Ask something..." autofocus>
    <button id="send">Send</button>
  </div>
  <script>
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const send = document.getElementById('send');

    function addMessage(text, role) {
      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      input.value = '';
      send.disabled = true;

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        addMessage(data.response, 'assistant');
      } catch (err) {
        addMessage('Error: ' + err.message, 'assistant');
      }

      send.disabled = false;
      input.focus();
    }

    send.onclick = sendMessage;
    input.onkeydown = (e) => e.key === 'Enter' && sendMessage();
  </script>
</body>
</html>
```

## Run

```bash
npm run dev
```

Open http://localhost:3000. Ask a question. The agent searches Wikipedia and responds.

## What's happening

1. Browser sends POST /chat with your message
2. Provider stores it, emits `outputsChanged`
3. CReact re-renders, `chat.pending()` returns the message
4. Agent component renders, calls OpenAI
5. If OpenAI wants to search, ToolExec runs Wikipedia query
6. Agent gets results, generates response
7. ChatResponse sends it back to the browser
8. `pending` clears, tree returns to waiting state

