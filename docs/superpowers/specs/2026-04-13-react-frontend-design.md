# React Frontend Refactor — Design Spec

**Date:** 2026-04-13  
**Status:** Approved

## Goal

Replace the current Alpine.js + vanilla JS frontend with React + Vite. The driver is scalability — Alpine.js won't handle the more complex UI features planned for the future. Visual output and backend API contract are unchanged.

---

## Architecture

### Directory structure

```
frontend/               # All frontend source (new)
  index.html
  vite.config.js
  package.json
  src/
    main.jsx            # React entry point, mounts <App />
    App.jsx             # Root component, owns all state
    components/
      ChatMessages.jsx  # Message list, welcome message, loading indicator
      MessageBubble.jsx # Single chat bubble (renders HTML safely)
      ChatInput.jsx     # Controlled input + submit button
      LoadingDots.jsx   # Animated three-dot loading indicator
    utils/
      markdown.js       # renderMarkdown() and escapeHtml() extracted as-is
      api.js            # fetch('/api/chat') wrapper

src/public/             # Vite build output (existing Express static dir)
```

The existing `src/public/index.html`, `app.js`, and `style.css` are replaced by Vite build output. `style.css` is imported into `main.jsx` with no visual changes.

### Dev workflow

- `npm run dev` in `frontend/` starts Vite dev server on port 5173
- Vite proxies `/api/*` to Express on port 3456
- `npm start` in root starts Express as before — no changes
- Both servers must be running during development

### Production build

- `npm run build` in `frontend/` runs `vite build`
- Output goes to `src/public/` (Vite `build.outDir`)
- Express serves `src/public/` unchanged — no backend changes needed

---

## Components

### `App.jsx`

Root component. Owns all state:

```js
messages: [{ id, role, html }]
loading: boolean
```

Renders `<ChatMessages>` and `<ChatInput>`. Houses `sendMessage()` which calls the API and updates state. Scrolls to bottom after each new message.

### `ChatMessages.jsx`

Receives `messages` and `loading` as props. Renders:
- Welcome message when `messages` is empty
- A `<MessageBubble>` for each message
- `<LoadingDots>` when `loading` is true

Holds the scroll container ref; `App` calls a forwarded ref to trigger scroll-to-bottom.

### `MessageBubble.jsx`

Receives `{ role, html }`. Sets `dangerouslySetInnerHTML` — safe because `html` is always produced by `renderMarkdown()` which escapes input before processing.

### `ChatInput.jsx`

Receives `{ onSubmit, loading }`. Controlled input with local state for the input value. Disables input and button while `loading`. Focuses input on mount and after each submitted message.

### `LoadingDots.jsx`

Pure presentational component. Three animated dots using the existing CSS `.dot` / `.bubble.loading` classes.

---

## State & data flow

```
App
├── state: messages, loading
├── sendMessage(text) → POST /api/chat → update messages
├── <ChatMessages messages loading />
│   └── <MessageBubble role html /> (×n)
│   └── <LoadingDots /> (when loading)
└── <ChatInput onSubmit={sendMessage} loading />
```

No context, no reducers, no external state library. Prop drilling is appropriate at this scale.

---

## CSS

`style.css` is kept unchanged and imported in `main.jsx`. No CSS modules, no CSS framework. All existing class names (`.message`, `.bubble`, `.dot`, etc.) are reused in the React components.

---

## What does NOT change

- Backend: `src/server.js`, `src/chat.js`, `src/db.js`, `src/indexer.js`, `src/index-manager.js`
- API contract: `POST /api/chat` with `{ message }` body, returns `{ reply }`
- Visual design: identical appearance
- Backend tests: no changes
- Content serving: `/content/*` image route unchanged

---

## CLAUDE.md update

Add a note documenting the frontend build step and the two-server dev setup.
