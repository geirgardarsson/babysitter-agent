# Agent Babysitter

A Claude-powered web chatbot that helps babysitters care for kids, backed by a parent-managed folder of markdown files and images.

## Commands

- `npm start` — Start the server
- `npm run dev` — Start with file watching (auto-restart on code changes)
- `npm test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `KIDS_NAMES='["Anna","Bjarki"]' npm start` — Start with kids' names configured

## Architecture

The app uses `claude --print` (Claude Code CLI) as its AI backend — no API key needed. All markdown content is included in the system prompt on each request.

### Source layout

- `src/server.js` — Express server, routes, session middleware, entry point
- `src/chat.js` — Builds system prompt, spawns `claude --print`, manages conversation
- `src/config.js` — Loads config from environment variables
- `src/db.js` — SQLite layer (content index + chat sessions)
- `src/indexer.js` — Scans markdown files, extracts metadata, generates summaries via `claude --print`
- `src/index-manager.js` — Persistent index + chokidar file watcher
- `src/public/` — Frontend (vanilla HTML/CSS/JS + Alpine.js)

### Data flow

1. Parent edits markdown files in `content/`
2. Chokidar detects changes, re-indexes affected files
3. Babysitter sends message via chat UI
4. Server builds system prompt with all content, spawns `claude --print`
5. Response returned as JSON, rendered in browser

## Configuration

Environment variables (or `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `CONTENT_DIR` | `./content` | Path to markdown content folder |
| `SESSION_TTL_HOURS` | `24` | Chat session expiry |
| `KIDS_NAMES` | `[]` | JSON array or comma-separated names |

## Testing

Tests use Vitest. Run with `npm test`. Tests mock `claude --print` calls — no CLI needed to run tests.

## Style guidelines

- ES modules (`import`/`export`), not CommonJS
- No TypeScript — vanilla JS
- Tests live in `tests/` mirroring `src/` structure
- Frontend: no build step, no bundler, Alpine.js for reactivity
- UI text is in Icelandic

## Content directory

Parents manage `content/` directly — the app never writes to it. Markdown files can use YAML frontmatter for `tags` and `summary` fields. Images referenced in markdown are served at `/content/...` (images only — markdown files are blocked from direct HTTP access).

## Deployment

Designed for Raspberry Pi at `wandersail.local:3456`. Can run via Docker (`docker compose up`) or directly (`npm start`). The `claude` CLI must be available on PATH.
