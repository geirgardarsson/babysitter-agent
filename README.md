# Agent Babysitter

A Claude-powered chat assistant for babysitters. Parents drop markdown files into a folder; the app reads them and answers questions about the kids, routines, and house rules.

## How it works

- Parents write and update markdown files in `content/`
- The babysitter opens the web app and asks questions in Icelandic
- The app builds a prompt from all the content files and sends it to `claude --print`
- No API key needed — uses the Claude Code CLI

## Requirements

- [Node.js](https://nodejs.org) 20+
- [Claude Code CLI](https://claude.ai/code) installed and authenticated (`claude` on PATH)

## Quickstart

```bash
npm install
npm start
```

Open `http://localhost:3456`.

## Content

Put markdown files in `content/`. They're included in every prompt, so write them as instructions to the babysitter:

```markdown
# Anna, age 7

Bedtime is 20:00. She likes audiobooks before sleep.
Allergic to peanuts — carry the EpiPen in the kitchen drawer.
```

Frontmatter is supported:

```markdown
---
tags: [bedtime, Anna]
---
# Bedtime routine
...
```

Images referenced in markdown are served at `/content/...`. Markdown files themselves are not accessible via HTTP.

## Configuration

Copy `.env.example` to `.env` and edit as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `CONTENT_DIR` | `./content` | Path to content folder |
| `SESSION_TTL_HOURS` | `24` | Chat session lifetime |
| `KIDS_NAMES` | `[]` | JSON array of kids' names shown in the UI subtitle |

## Docker

```bash
docker compose up
```

The `content/` and `data/` directories are mounted as volumes — edit content on the host and changes are picked up automatically.

## Development

```bash
npm run dev           # Express with file watching
cd frontend && npm install && npm run dev   # Vite dev server at :5173 (hot reload)
npm test              # Run tests
```

The Vite dev server proxies `/api/*` to Express on port 3456. Run both for full hot-reload development.

To rebuild the frontend bundle:

```bash
cd frontend && npm run build
```
