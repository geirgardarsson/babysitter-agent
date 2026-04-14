# Agent Babysitter

A Claude-powered web chatbot that helps babysitters care for kids, backed by a parent-managed folder of markdown files and images.

## Commands

- `npm start` — Start the server (serves the pre-built frontend from `src/public/`)
- `npm run dev` — Start Express with file watching (auto-restart on code changes; Express only — also run `cd frontend && npm run dev` for frontend hot-reload)
- `npm test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `KIDS_NAMES='["Anna","Bjarki"]' npm start` — Start with kids' names configured

### Frontend development

The frontend lives in `frontend/` and is built with Vite + React.

- `cd frontend && npm install` — Install frontend dependencies (required once after cloning)
- `cd frontend && npm run dev` — Start Vite dev server at `http://localhost:5173` (proxies `/api/*` to Express on 3456)
- `cd frontend && npm run build` — Build to `src/public/` (what Express serves)

**Dev setup:** Run both `npm run dev` (Express, auto-restarts on changes) and `cd frontend && npm run dev` (Vite) simultaneously. Use `npm start` only for production — it does not watch for changes, so backend edits require a manual restart.

## Architecture

The app uses `claude --print` (Claude Code CLI) as its AI backend — no API key needed. All markdown content is included in the system prompt on each request.

### Source layout

- `src/server.js` — Express server, routes, session middleware, entry point
- `src/chat.js` — Builds system prompt, spawns `claude --print`, manages conversation
- `src/config.js` — Loads config from environment variables
- `src/db.js` — SQLite layer (content index + chat sessions)
- `src/indexer.js` — Scans markdown files, extracts metadata, generates summaries via `claude --print`
- `src/index-manager.js` — Persistent index + chokidar file watcher
- `src/public/` — Built frontend (React + Vite output, do not edit directly)
- `frontend/` — React + Vite frontend source

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

After adding or modifying API routes, smoke-test them before considering the work done:

```bash
# Start server in background, then curl the new endpoints
node src/server.js &
sleep 1
curl -s http://localhost:3456/api/your-new-route
kill %1
```

## SQLite migrations

The DB schema is in `src/db.js`. `CREATE TABLE IF NOT EXISTS` does not modify existing tables, so new columns require an explicit migration.

**Always check before altering** — SQLite rejects `ALTER TABLE ADD COLUMN` with non-constant defaults (e.g. `datetime('now')` is not allowed). Use this pattern:

```js
const hasCol = raw.prepare(
  "SELECT COUNT(*) as n FROM pragma_table_info('table') WHERE name = 'col'"
).get().n > 0;
if (!hasCol) {
  raw.exec('ALTER TABLE table ADD COLUMN col DATETIME');
  raw.exec('UPDATE table SET col = created_at'); // backfill if needed
}
```

Never use `try/catch` to swallow migration errors — silent failures leave the schema broken.

## Style guidelines

- ES modules (`import`/`export`), not CommonJS
- No TypeScript — vanilla JS
- Tests live in `tests/` mirroring `src/` structure
- Frontend: React + Vite (build output in `src/public/`, source in `frontend/`)
- UI text is in Icelandic

## Content directory

Parents manage `content/` directly — the app never writes to it. Markdown files can use YAML frontmatter for `tags` and `summary` fields. Images referenced in markdown are served at `/content/...` (images only — markdown files are blocked from direct HTTP access).

## Deployment

Designed for Raspberry Pi at `wandersail.local:3456`. Can run via Docker (`docker compose up`) or directly (`npm start`). The `claude` CLI must be available on PATH.
