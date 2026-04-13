# React Frontend Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Alpine.js + vanilla JS frontend with React + Vite, preserving all existing visual design and API behaviour.

**Architecture:** A new `frontend/` directory at the repo root contains all React source. Vite builds into `src/public/` which Express already serves. In dev, a Vite proxy forwards `/api/*` to Express on port 3456.

**Tech Stack:** React 18, Vite 5, `@vitejs/plugin-react`, vanilla CSS (existing `style.css` reused)

---

### Task 1: Scaffold the `frontend/` Vite + React project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.js`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "agent-babysitter-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="is">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fjölskylduaðstoð</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3456',
    },
  },
  build: {
    outDir: '../src/public',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/index.html frontend/vite.config.js
git commit -m "feat: scaffold frontend/ with Vite + React"
```

---

### Task 2: Create utility modules

**Files:**
- Create: `frontend/src/utils/markdown.js`
- Create: `frontend/src/utils/api.js`

- [ ] **Step 1: Create `frontend/src/utils/markdown.js`**

Extracted verbatim from `src/public/app.js`:

```js
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Images: ![alt](src)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs: double newlines
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Single newlines within paragraphs
  html = html.replace(/\n/g, '<br>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}
```

- [ ] **Step 2: Create `frontend/src/utils/api.js`**

```js
export async function sendChatMessage(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    throw new Error('Server error');
  }
  return res.json();
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/markdown.js frontend/src/utils/api.js
git commit -m "feat: add markdown and api utility modules"
```

---

### Task 3: Create leaf components — `LoadingDots` and `MessageBubble`

**Files:**
- Create: `frontend/src/components/LoadingDots.jsx`
- Create: `frontend/src/components/MessageBubble.jsx`

- [ ] **Step 1: Create `frontend/src/components/LoadingDots.jsx`**

Uses existing CSS classes `.message.assistant`, `.bubble.loading`, `.dot`:

```jsx
export default function LoadingDots() {
  return (
    <div className="message assistant">
      <div className="bubble loading">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/MessageBubble.jsx`**

`html` is always produced by `renderMarkdown()` (which escapes input first), so `dangerouslySetInnerHTML` is safe here:

```jsx
export default function MessageBubble({ role, html }) {
  return (
    <div className={`message ${role}`}>
      <div className="bubble" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LoadingDots.jsx frontend/src/components/MessageBubble.jsx
git commit -m "feat: add LoadingDots and MessageBubble components"
```

---

### Task 4: Create `ChatMessages` component

**Files:**
- Create: `frontend/src/components/ChatMessages.jsx`

`ChatMessages` exposes a `scrollToBottom()` method via `useImperativeHandle` so `App` can trigger scrolling after state updates.

- [ ] **Step 1: Create `frontend/src/components/ChatMessages.jsx`**

```jsx
import { useRef, forwardRef, useImperativeHandle } from 'react';
import MessageBubble from './MessageBubble.jsx';
import LoadingDots from './LoadingDots.jsx';

const ChatMessages = forwardRef(function ChatMessages({ messages, loading }, ref) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToBottom() {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    },
  }));

  return (
    <main id="chat-messages" ref={containerRef}>
      {messages.length === 0 && (
        <div className="message assistant">
          <div className="bubble">
            Hæ! Ég er hér til að hjálpa þér með allt sem snýr að börnunum og heimilinu. Spurðu mig um hvað sem er!
          </div>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} html={msg.html} />
      ))}
      {loading && <LoadingDots />}
    </main>
  );
});

export default ChatMessages;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ChatMessages.jsx
git commit -m "feat: add ChatMessages component"
```

---

### Task 5: Create `ChatInput` component

**Files:**
- Create: `frontend/src/components/ChatInput.jsx`

- [ ] **Step 1: Create `frontend/src/components/ChatInput.jsx`**

Owns local input value state. Focuses on mount and whenever `loading` becomes false (after each response):

```jsx
import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = value.trim();
    if (!text || loading) return;
    setValue('');
    onSubmit(text);
  }

  return (
    <footer>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Skrifaðu spurningu..."
          disabled={loading}
          ref={inputRef}
          autoComplete="off"
        />
        <button type="submit" disabled={loading || !value.trim()}>
          Senda
        </button>
      </form>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ChatInput.jsx
git commit -m "feat: add ChatInput component"
```

---

### Task 6: Create `App.jsx`, `main.jsx`, and copy `style.css`

**Files:**
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/style.css` (copy from `src/public/style.css`)

- [ ] **Step 1: Copy `style.css` into the frontend source**

```bash
cp src/public/style.css frontend/src/style.css
```

- [ ] **Step 2: Create `frontend/src/App.jsx`**

`nextId` is a module-level counter (not state) — it only needs to be unique per render cycle, not reactive:

```jsx
import { useState, useRef, useCallback } from 'react';
import ChatMessages from './components/ChatMessages.jsx';
import ChatInput from './components/ChatInput.jsx';
import { sendChatMessage } from './utils/api.js';
import { renderMarkdown, escapeHtml } from './utils/markdown.js';

let nextId = 1;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesRef.current?.scrollToBottom();
  }, []);

  async function sendMessage(text) {
    setMessages((prev) => [
      ...prev,
      { id: nextId++, role: 'user', html: escapeHtml(text) },
    ]);
    scrollToBottom();
    setLoading(true);

    try {
      const data = await sendChatMessage(text);
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'assistant', html: renderMarkdown(data.reply) },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'assistant', html: '<em>Villa kom upp. Reyndu aftur.</em>' },
      ]);
    }

    setLoading(false);
    scrollToBottom();
  }

  return (
    <div id="chat-app">
      <header>
        <h1>Fjölskylduaðstoð</h1>
      </header>
      <ChatMessages ref={messagesRef} messages={messages} loading={loading} />
      <ChatInput onSubmit={sendMessage} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx frontend/src/style.css
git commit -m "feat: add App root component and entry point"
```

---

### Task 7: Verify the dev build works

Both the Express server and Vite dev server must be running for this step.

- [ ] **Step 1: Start Express**

In one terminal:
```bash
npm start
```
Expected: `Agent Babysitter running on port 3456`

- [ ] **Step 2: Start Vite dev server**

In another terminal:
```bash
cd frontend && npm run dev
```
Expected output includes:
```
  VITE v5.x.x  ready in ...ms
  ➜  Local:   http://localhost:5173/
```

- [ ] **Step 3: Open the app and verify**

Open `http://localhost:5173` in a browser. Check:
- Page title is "Fjölskylduaðstoð"
- Welcome message appears in Icelandic
- Input is focused on load
- Typing a message and pressing Enter sends it
- Loading dots appear while waiting
- Response appears in a bubble
- Scroll-to-bottom works after each message
- Visual appearance matches the old Alpine.js frontend

---

### Task 8: Verify the production build

- [ ] **Step 1: Run the production build**

```bash
cd frontend && npm run build
```

Expected: output like:
```
vite v5.x.x building for production...
✓ N modules transformed.
dist/index.html    x.xx kB
dist/assets/...    x.xx kB
```
And `src/public/` should now contain `index.html` and an `assets/` directory.

- [ ] **Step 2: Verify Express serves the built app**

Start Express (if not already running):
```bash
npm start
```

Open `http://localhost:3456` — the full app should work identically to the Vite dev server version.

- [ ] **Step 3: Commit the build output**

The built files in `src/public/` should be committed so the app works without a build step on the Pi:

```bash
git add src/public/
git commit -m "feat: add production React build output to src/public"
```

---

### Task 9: Remove old Alpine.js files and update CLAUDE.md

**Files:**
- Delete: `src/public/app.js`  ← replaced by the Vite build
- Delete: `src/public/index.html`  ← replaced by the Vite build
- Delete: `src/public/style.css`  ← now lives in `frontend/src/style.css`, built into `src/public/assets/`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove the old Alpine.js frontend files**

```bash
rm src/public/app.js src/public/index.html src/public/style.css
```

- [ ] **Step 2: Verify Express still serves the built React app**

```bash
npm start
```
Open `http://localhost:3456` — app should still work (it now serves `src/public/index.html` from the Vite build).

- [ ] **Step 3: Update `CLAUDE.md`**

Replace the `## Commands` section with:

```markdown
## Commands

- `npm start` — Start the server (serves the pre-built frontend from `src/public/`)
- `npm run dev` — Start with file watching (auto-restart on code changes)
- `npm test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `KIDS_NAMES='["Anna","Bjarki"]' npm start` — Start with kids' names configured

### Frontend development

The frontend lives in `frontend/` and is built with Vite + React.

- `cd frontend && npm run dev` — Start Vite dev server at `http://localhost:5173` (proxies `/api/*` to Express on 3456)
- `cd frontend && npm run build` — Build to `src/public/` (what Express serves)

**Dev setup:** Run both `npm start` (Express) and `cd frontend && npm run dev` (Vite) simultaneously.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: replace Alpine.js frontend with React + Vite"
```
