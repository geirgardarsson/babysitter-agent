# Agent Babysitter — Design Spec

A web chatbot that helps babysitters (grandparents, aunts, family) care for two kids (5yo and 10mo) by answering questions from a parent-managed knowledge base of markdown files and images. Powered by the Claude API with tool use.

## Architecture

Three-layer system:

1. **Content layer** — Markdown files and images organized in folders under a `content/` directory. A persistent index stored in SQLite maps each file to its path, title, one-sentence summary, tags, and last-modified timestamp. A file watcher (`chokidar`) monitors the directory and re-indexes only changed files.

2. **Chat layer** — Node.js/Express server using the Anthropic SDK with tool use. Claude receives the content index in its system prompt and uses tools to read specific files on demand. Responses are streamed to the frontend.

3. **Persistence layer** — SQLite (via `better-sqlite3`) storing the content index, chat sessions, and conversation history. Single file, zero infrastructure, low resource usage on a Raspberry Pi.

### Why SQLite

No Docker container needed for the DB, no concurrent write corruption risk like flat JSON files, native JSON support, and negligible resource usage. The right tool for a single-user-scale home app.

## Content Structure

Parents organize markdown files and images in folders however they see fit. No enforced structure. Example:

```
content/
├── household/
│   ├── emergency-contacts.md
│   ├── house-rules.md
│   └── wifi-and-devices.md
├── kids/
│   ├── baby/
│   │   ├── feeding-schedule.md
│   │   ├── sleep-routine.md
│   │   ├── diaper-notes.md
│   │   └── images/
│   │       └── formula-prep.jpg
│   └── older-child/
│       ├── daily-routine.md
│       ├── activities.md
│       ├── meals-and-snacks.md
│       └── images/
│           └── school-schedule.jpg
└── general/
    ├── meal-prep.md
    └── bedtime-routine.md
```

### Content Indexing

- On first startup, scan all `.md` files in the content directory.
- For each file: extract the title (first `#` heading or filename), parse optional YAML frontmatter for tags/summary, auto-generate a one-sentence summary by calling the Claude API (overridable via a `summary` field in frontmatter), record referenced images, and store the last-modified timestamp.
- Store the index in SQLite.
- `chokidar` watches the content directory. On file change, only the affected entry is re-indexed.
- The index (not the file contents) is included in Claude's system prompt.

### Image Handling

- Images referenced in markdown (e.g. `![Formula prep](images/formula-prep.jpg)`) are tracked in the index.
- Images are NOT sent to Claude for vision. They are served to the babysitter.
- When Claude determines an image is relevant, it includes the image path in its response.
- The frontend serves images from the content directory via a static file route and renders them inline in chat bubbles.

## Chat System

### System Prompt

Includes:
- Personality: warm, reassuring co-parent tone. Responds in Icelandic.
- Kids' names (configurable).
- The full content index (path, title, summary, tags).
- Instructions to look up specific files before answering and to include relevant image paths when appropriate.

### Tools

Two tools available to Claude:

1. `read_file(path)` — Reads a specific markdown file from the content directory and returns its contents.
2. `list_folder(path)` — Lists files and subfolders in a content directory.

### Conversation Flow

1. Babysitter asks a question.
2. Claude inspects the content index to identify relevant files.
3. Claude calls `read_file` for the files it needs.
4. Claude responds in Icelandic with the relevant information, including image paths where appropriate.
5. The frontend renders the response with inline images.

### Session Management

- Each browser session gets a unique session ID stored in a cookie.
- Conversation history (messages + tool calls) stored in SQLite, keyed by session ID.
- Full conversation history sent to the API on each new message.
- Sessions expire after a configurable period (default: 24 hours).

## Frontend

### Technology

Vanilla HTML/CSS/JS with Alpine.js for reactivity. No heavy framework — keeps it fast on the Pi and simple to maintain.

### Layout

- Full-screen chat interface, mobile-friendly (babysitters will use their phones).
- Header with a friendly title and the kids' names.
- Chat bubbles: babysitter on the right, assistant on the left.
- Images rendered inline in chat bubbles.
- Text input bar at bottom with send button.
- Streaming responses (answers appear progressively).

### Language

All UI text is in Icelandic: labels, buttons, welcome message, placeholder text. Claude also responds in Icelandic.

### Warm Touches

- Soft, friendly color palette.
- Responses use the kids' actual names.
- Welcome message on first visit (in Icelandic).

### No Parent UI

Parents manage content by editing markdown files directly on the host filesystem. The web app is purely the babysitter chat interface.

## Configuration

Single config file (`config.json` or `.env`):

| Key | Description | Example |
|-----|-------------|---------|
| `ANTHROPIC_API_KEY` | API key for Claude | `sk-ant-...` |
| `PORT` | Web server port (non-default) | `3456` |
| `CONTENT_DIR` | Path to content folder | `./content` |
| `SESSION_TTL` | Session expiry duration | `24h` |
| `KIDS_NAMES` | Kids' names for personalization | `["Anna", "Bjarki"]` |
| `CLAUDE_MODEL` | Model to use | `claude-sonnet-4-6-20250514` |

## Deployment

- Runs as a Docker container on a Raspberry Pi at `wandersail.local` / `192.168.1.88`.
- `Dockerfile` + `docker-compose.yml`.
- Content directory mounted as a volume (parents edit on host).
- SQLite database file mounted as a volume for persistence.
- Auto-restarts on crash.
- Open on the local network, no authentication required.

## Project Structure

```
agent-babysitter/
├── content/              # Mounted volume — parent-managed
│   ├── household/
│   └── kids/
├── src/
│   ├── server.js         # Express server
│   ├── chat.js           # Anthropic API + tool handling
│   ├── indexer.js         # Content scanning + summarization
│   ├── db.js             # SQLite session/index storage
│   ├── tools.js          # Tool definitions for Claude
│   └── public/           # Frontend assets
│       ├── index.html
│       ├── style.css
│       └── app.js
├── config.json
├── Dockerfile
├── docker-compose.yml
└── package.json
```
