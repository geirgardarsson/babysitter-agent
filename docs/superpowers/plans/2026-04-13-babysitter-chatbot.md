# Agent Babysitter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude-powered web chatbot that lets babysitters ask questions about kid care and household info, backed by a parent-managed folder of markdown files and images.

**Architecture:** Node.js/Express server with Anthropic SDK for tool-use chat. SQLite stores a content index and conversation history. A file watcher keeps the index in sync with the content folder. Vanilla frontend with Alpine.js streams responses.

**Tech Stack:** Node.js, Express, Anthropic SDK (`@anthropic-ai/sdk`), `better-sqlite3`, `chokidar`, `gray-matter` (frontmatter parsing), `marked` (markdown rendering on frontend), Alpine.js, Vitest (testing), Docker

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and scripts |
| `src/config.js` | Load and validate configuration from environment / config.json |
| `src/db.js` | SQLite initialization, schema, query helpers for index + sessions |
| `src/indexer.js` | Scan content dir, extract metadata, generate summaries, watch for changes |
| `src/tools.js` | Claude tool definitions and execution handlers |
| `src/chat.js` | Anthropic API integration, system prompt building, streaming, tool-use loop |
| `src/server.js` | Express app, routes, session middleware, static serving |
| `src/public/index.html` | Chat UI shell |
| `src/public/style.css` | Styles |
| `src/public/app.js` | Alpine.js chat logic, streaming fetch, image rendering |
| `tests/config.test.js` | Config loading tests |
| `tests/db.test.js` | Database layer tests |
| `tests/indexer.test.js` | Indexer tests |
| `tests/tools.test.js` | Tool execution tests |
| `tests/chat.test.js` | Chat integration tests |
| `tests/server.test.js` | HTTP route tests |
| `Dockerfile` | Container image |
| `docker-compose.yml` | Deployment config |
| `.env.example` | Example environment variables |

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialize project**

```bash
cd /home/geir/dev/agent-babysitter
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express @anthropic-ai/sdk better-sqlite3 chokidar gray-matter cookie uuid
npm install -D vitest
```

- [ ] **Step 3: Update package.json scripts**

In `package.json`, set the following in the `"scripts"` section:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Also set `"type": "module"` at the top level for ES module support.

- [ ] **Step 4: Create .env.example**

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3456
CONTENT_DIR=./content
SESSION_TTL_HOURS=24
KIDS_NAMES=["Anna","Bjarki"]
CLAUDE_MODEL=claude-sonnet-4-6-20250514
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
data/
.env
*.db
```

- [ ] **Step 6: Create sample content for testing**

Create `content/kids/baby/feeding-schedule.md`:

```markdown
---
tags: [baby, feeding, schedule]
---

# Matartími

Barnið borðar á þessum tímum:

- **07:00** — Morgunmatur (hafragrautur)
- **12:00** — Hádegismatur (grænmetismauk)
- **17:00** — Kvöldmatur (ávaxtagrautur)

Mjólkurforðabúður er í ísskápnum. Hita í 30 sekúndur í örbylgjuofni.

![Formúlu undirbúningur](images/formula-prep.jpg)
```

Create `content/household/house-rules.md`:

```markdown
---
tags: [household, rules]
---

# Húsreglur

- Skjátími er leyfður í 30 mínútur eftir kvöldmat
- Enginn sykur eftir kl. 16:00
- Hurðir á svefnherbergjum alltaf lokaðar á nóttunni
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore content/
git commit -m "chore: initialize project with dependencies and sample content"
```

---

### Task 2: Configuration Module

**Files:**
- Create: `src/config.js`
- Create: `tests/config.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/config.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads config from environment variables', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';
    process.env.PORT = '4000';
    process.env.CONTENT_DIR = './test-content';
    process.env.SESSION_TTL_HOURS = '12';
    process.env.KIDS_NAMES = '["Sigga","Tommi"]';
    process.env.CLAUDE_MODEL = 'claude-sonnet-4-6-20250514';

    const config = loadConfig();

    expect(config.apiKey).toBe('sk-test-key');
    expect(config.port).toBe(4000);
    expect(config.contentDir).toBe('./test-content');
    expect(config.sessionTtlHours).toBe(12);
    expect(config.kidsNames).toEqual(['Sigga', 'Tommi']);
    expect(config.model).toBe('claude-sonnet-4-6-20250514');
  });

  it('uses defaults for optional values', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';

    const config = loadConfig();

    expect(config.port).toBe(3456);
    expect(config.contentDir).toBe('./content');
    expect(config.sessionTtlHours).toBe(24);
    expect(config.model).toBe('claude-sonnet-4-6-20250514');
  });

  it('throws if ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/config.test.js`
Expected: FAIL — module `../src/config.js` not found

- [ ] **Step 3: Implement config module**

Create `src/config.js`:

```js
export function loadConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    apiKey,
    port: parseInt(process.env.PORT || '3456', 10),
    contentDir: process.env.CONTENT_DIR || './content',
    sessionTtlHours: parseInt(process.env.SESSION_TTL_HOURS || '24', 10),
    kidsNames: JSON.parse(process.env.KIDS_NAMES || '[]'),
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6-20250514',
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/config.test.js`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "feat: add configuration module with env variable loading"
```

---

### Task 3: Database Layer

**Files:**
- Create: `src/db.js`
- Create: `tests/db.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/db.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb } from '../src/db.js';
import fs from 'fs';
import path from 'path';

const TEST_DB = path.join(import.meta.dirname, 'test.db');

describe('database', () => {
  let db;

  beforeEach(() => {
    db = createDb(TEST_DB);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  });

  describe('content index', () => {
    it('upserts and retrieves an index entry', () => {
      db.upsertIndexEntry({
        filePath: 'kids/baby/feeding.md',
        title: 'Matartími',
        summary: 'Feeding schedule for the baby',
        tags: ['baby', 'feeding'],
        images: ['images/formula.jpg'],
        lastModified: 1000,
      });

      const entries = db.getAllIndexEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].filePath).toBe('kids/baby/feeding.md');
      expect(entries[0].title).toBe('Matartími');
      expect(entries[0].summary).toBe('Feeding schedule for the baby');
      expect(entries[0].tags).toEqual(['baby', 'feeding']);
      expect(entries[0].images).toEqual(['images/formula.jpg']);
    });

    it('updates existing entry on re-upsert', () => {
      db.upsertIndexEntry({
        filePath: 'kids/baby/feeding.md',
        title: 'Old Title',
        summary: 'Old summary',
        tags: [],
        images: [],
        lastModified: 1000,
      });

      db.upsertIndexEntry({
        filePath: 'kids/baby/feeding.md',
        title: 'New Title',
        summary: 'New summary',
        tags: ['updated'],
        images: [],
        lastModified: 2000,
      });

      const entries = db.getAllIndexEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('New Title');
    });

    it('removes an index entry', () => {
      db.upsertIndexEntry({
        filePath: 'kids/baby/feeding.md',
        title: 'Title',
        summary: 'Summary',
        tags: [],
        images: [],
        lastModified: 1000,
      });

      db.removeIndexEntry('kids/baby/feeding.md');
      expect(db.getAllIndexEntries()).toHaveLength(0);
    });
  });

  describe('sessions', () => {
    it('creates and retrieves a session', () => {
      db.createSession('sess-1');
      const session = db.getSession('sess-1');

      expect(session).not.toBeNull();
      expect(session.id).toBe('sess-1');
      expect(session.messages).toEqual([]);
    });

    it('appends messages to a session', () => {
      db.createSession('sess-1');
      db.appendMessage('sess-1', { role: 'user', content: 'Hello' });
      db.appendMessage('sess-1', { role: 'assistant', content: 'Hi there' });

      const session = db.getSession('sess-1');
      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('returns null for nonexistent session', () => {
      expect(db.getSession('nope')).toBeNull();
    });

    it('deletes expired sessions', () => {
      db.createSession('old-sess');
      // Manually backdate the session
      db.raw.prepare(
        "UPDATE sessions SET created_at = datetime('now', '-25 hours') WHERE id = ?"
      ).run('old-sess');

      db.deleteExpiredSessions(24);
      expect(db.getSession('old-sess')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/db.test.js`
Expected: FAIL — module `../src/db.js` not found

- [ ] **Step 3: Implement database module**

Create `src/db.js`:

```js
import Database from 'better-sqlite3';

export function createDb(dbPath) {
  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');

  raw.exec(`
    CREATE TABLE IF NOT EXISTS content_index (
      file_path TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      images TEXT NOT NULL DEFAULT '[]',
      last_modified INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  return {
    raw,

    upsertIndexEntry({ filePath, title, summary, tags, images, lastModified }) {
      raw.prepare(`
        INSERT INTO content_index (file_path, title, summary, tags, images, last_modified)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_path) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          tags = excluded.tags,
          images = excluded.images,
          last_modified = excluded.last_modified
      `).run(filePath, title, summary, JSON.stringify(tags), JSON.stringify(images), lastModified);
    },

    removeIndexEntry(filePath) {
      raw.prepare('DELETE FROM content_index WHERE file_path = ?').run(filePath);
    },

    getAllIndexEntries() {
      const rows = raw.prepare('SELECT * FROM content_index ORDER BY file_path').all();
      return rows.map(row => ({
        filePath: row.file_path,
        title: row.title,
        summary: row.summary,
        tags: JSON.parse(row.tags),
        images: JSON.parse(row.images),
        lastModified: row.last_modified,
      }));
    },

    createSession(id) {
      raw.prepare(
        'INSERT INTO sessions (id, messages) VALUES (?, ?)'
      ).run(id, '[]');
    },

    getSession(id) {
      const row = raw.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
      if (!row) return null;
      return {
        id: row.id,
        messages: JSON.parse(row.messages),
        createdAt: row.created_at,
      };
    },

    appendMessage(sessionId, message) {
      const session = this.getSession(sessionId);
      if (!session) return;
      const messages = [...session.messages, message];
      raw.prepare('UPDATE sessions SET messages = ? WHERE id = ?')
        .run(JSON.stringify(messages), sessionId);
    },

    deleteExpiredSessions(ttlHours) {
      raw.prepare(
        "DELETE FROM sessions WHERE created_at < datetime('now', '-' || ? || ' hours')"
      ).run(ttlHours);
    },

    close() {
      raw.close();
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/db.test.js`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/db.js tests/db.test.js
git commit -m "feat: add SQLite database layer for content index and sessions"
```

---

### Task 4: Content Indexer

**Files:**
- Create: `src/indexer.js`
- Create: `tests/indexer.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/indexer.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scanFile, buildIndex } from '../src/indexer.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('scanFile', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('extracts title from first heading', () => {
    const filePath = path.join(tmpDir, 'test.md');
    fs.writeFileSync(filePath, '# My Title\n\nSome content here.');

    const entry = scanFile(filePath, tmpDir);

    expect(entry.title).toBe('My Title');
    expect(entry.filePath).toBe('test.md');
  });

  it('uses filename as title if no heading', () => {
    const filePath = path.join(tmpDir, 'no-heading.md');
    fs.writeFileSync(filePath, 'Just some content without a heading.');

    const entry = scanFile(filePath, tmpDir);

    expect(entry.title).toBe('no-heading');
  });

  it('parses frontmatter tags', () => {
    const filePath = path.join(tmpDir, 'tagged.md');
    fs.writeFileSync(filePath, '---\ntags: [baby, sleep]\n---\n# Nap Time\n\nContent.');

    const entry = scanFile(filePath, tmpDir);

    expect(entry.tags).toEqual(['baby', 'sleep']);
  });

  it('uses frontmatter summary if provided', () => {
    const filePath = path.join(tmpDir, 'summarized.md');
    fs.writeFileSync(filePath, '---\nsummary: Custom summary here\n---\n# Title\n\nContent.');

    const entry = scanFile(filePath, tmpDir);

    expect(entry.summary).toBe('Custom summary here');
  });

  it('extracts image references from markdown', () => {
    const filePath = path.join(tmpDir, 'with-images.md');
    fs.writeFileSync(filePath, '# Title\n\n![Photo](images/photo.jpg)\n\nMore text\n\n![Another](../other/pic.png)');

    const entry = scanFile(filePath, tmpDir);

    expect(entry.images).toEqual(['images/photo.jpg', '../other/pic.png']);
  });

  it('returns empty images array when none referenced', () => {
    const filePath = path.join(tmpDir, 'no-images.md');
    fs.writeFileSync(filePath, '# Title\n\nNo images here.');

    const entry = scanFile(filePath, tmpDir);

    expect(entry.images).toEqual([]);
  });

  it('records lastModified timestamp', () => {
    const filePath = path.join(tmpDir, 'timed.md');
    fs.writeFileSync(filePath, '# Title\n\nContent.');

    const entry = scanFile(filePath, tmpDir);
    const stat = fs.statSync(filePath);

    expect(entry.lastModified).toBe(Math.floor(stat.mtimeMs));
  });
});

describe('buildIndex', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexer-build-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('scans all markdown files recursively', () => {
    fs.mkdirSync(path.join(tmpDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'root.md'), '# Root\n\nContent.');
    fs.writeFileSync(path.join(tmpDir, 'sub', 'nested.md'), '# Nested\n\nContent.');
    fs.writeFileSync(path.join(tmpDir, 'ignored.txt'), 'Not markdown.');

    const entries = buildIndex(tmpDir);

    expect(entries).toHaveLength(2);
    const paths = entries.map(e => e.filePath).sort();
    expect(paths).toEqual(['root.md', 'sub/nested.md']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/indexer.test.js`
Expected: FAIL — module `../src/indexer.js` not found

- [ ] **Step 3: Implement the indexer (without AI summarization)**

Create `src/indexer.js`:

```js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function scanFile(filePath, contentDir) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);

  const relativePath = path.relative(contentDir, filePath);

  // Extract title: first # heading or filename
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const title = headingMatch
    ? headingMatch[1].trim()
    : path.basename(filePath, '.md');

  // Summary: from frontmatter or null (to be filled by AI later)
  const summary = frontmatter.summary || null;

  // Tags from frontmatter
  const tags = frontmatter.tags || [];

  // Extract image references: ![alt](path)
  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const images = [];
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    images.push(match[1]);
  }

  // Last modified
  const stat = fs.statSync(filePath);
  const lastModified = Math.floor(stat.mtimeMs);

  return { filePath: relativePath, title, summary, tags, images, lastModified };
}

export function buildIndex(contentDir) {
  const entries = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (item.name.endsWith('.md')) {
        entries.push(scanFile(full, contentDir));
      }
    }
  }

  walk(contentDir);
  return entries;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/indexer.test.js`
Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/indexer.js tests/indexer.test.js
git commit -m "feat: add content indexer with metadata extraction"
```

---

### Task 5: AI Summary Generation

**Files:**
- Modify: `src/indexer.js`
- Create: `tests/indexer-summarize.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/indexer-summarize.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { generateSummary } from '../src/indexer.js';

describe('generateSummary', () => {
  it('calls Anthropic API and returns the summary text', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'A schedule for baby feeding times and formula prep.' }],
        }),
      },
    };

    const summary = await generateSummary(
      mockClient,
      'claude-sonnet-4-6-20250514',
      'Matartími\n\nBarnið borðar á þessum tímum:\n- 07:00 morgunmatur\n- 12:00 hádegismatur'
    );

    expect(summary).toBe('A schedule for baby feeding times and formula prep.');
    expect(mockClient.messages.create).toHaveBeenCalledOnce();

    const callArgs = mockClient.messages.create.mock.calls[0][0];
    expect(callArgs.model).toBe('claude-sonnet-4-6-20250514');
    expect(callArgs.max_tokens).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/indexer-summarize.test.js`
Expected: FAIL — `generateSummary` is not exported

- [ ] **Step 3: Add generateSummary to indexer.js**

Add to the end of `src/indexer.js`:

```js
export async function generateSummary(anthropicClient, model, content) {
  const response = await anthropicClient.messages.create({
    model,
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Summarize the following content in exactly one sentence (in English). This summary will be used as an index entry so a language model can decide whether to read the full file.\n\n${content}`,
      },
    ],
  });

  return response.content[0].text;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/indexer-summarize.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/indexer.js tests/indexer-summarize.test.js
git commit -m "feat: add AI-powered summary generation for content index"
```

---

### Task 6: Index Persistence & File Watching

**Files:**
- Create: `src/index-manager.js`
- Create: `tests/index-manager.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/index-manager.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexManager } from '../src/index-manager.js';
import { createDb } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('IndexManager', () => {
  let tmpDir, dbPath, db, manager;

  const mockAnthropicClient = {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Auto-generated summary.' }],
      }),
    },
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idx-mgr-'));
    dbPath = path.join(tmpDir, 'test.db');
    db = createDb(dbPath);
    manager = new IndexManager(db, tmpDir, mockAnthropicClient, 'claude-sonnet-4-6-20250514');
  });

  afterEach(() => {
    manager.stopWatching();
    db.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('builds full index on initial sync', async () => {
    fs.writeFileSync(path.join(tmpDir, 'test.md'), '# Test\n\nContent here.');

    await manager.fullSync();

    const entries = db.getAllIndexEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Test');
    expect(entries[0].summary).toBe('Auto-generated summary.');
  });

  it('uses frontmatter summary instead of AI when provided', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'manual.md'),
      '---\nsummary: My custom summary\n---\n# Manual\n\nContent.'
    );

    await manager.fullSync();

    const entries = db.getAllIndexEntries();
    expect(entries[0].summary).toBe('My custom summary');
    // AI should NOT have been called for this file
    expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
  });

  it('skips files that have not changed since last index', async () => {
    fs.writeFileSync(path.join(tmpDir, 'stable.md'), '# Stable\n\nContent.');
    await manager.fullSync();

    mockAnthropicClient.messages.create.mockClear();
    await manager.fullSync();

    // Should not regenerate summary for unchanged file
    expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
  });

  it('removes index entries for deleted files on full sync', async () => {
    fs.writeFileSync(path.join(tmpDir, 'gone.md'), '# Gone\n\nContent.');
    await manager.fullSync();
    expect(db.getAllIndexEntries()).toHaveLength(1);

    fs.unlinkSync(path.join(tmpDir, 'gone.md'));
    await manager.fullSync();

    expect(db.getAllIndexEntries()).toHaveLength(0);
  });

  it('getFormattedIndex returns a readable string', async () => {
    fs.writeFileSync(path.join(tmpDir, 'info.md'), '---\ntags: [household]\n---\n# House Info\n\nDetails.');
    await manager.fullSync();

    const formatted = manager.getFormattedIndex();
    expect(formatted).toContain('info.md');
    expect(formatted).toContain('House Info');
    expect(formatted).toContain('Auto-generated summary.');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/index-manager.test.js`
Expected: FAIL — module `../src/index-manager.js` not found

- [ ] **Step 3: Implement IndexManager**

Create `src/index-manager.js`:

```js
import chokidar from 'chokidar';
import path from 'path';
import { scanFile, buildIndex, generateSummary } from './indexer.js';

export class IndexManager {
  constructor(db, contentDir, anthropicClient, model) {
    this.db = db;
    this.contentDir = path.resolve(contentDir);
    this.anthropicClient = anthropicClient;
    this.model = model;
    this.watcher = null;
  }

  async indexFile(filePath) {
    const entry = scanFile(filePath, this.contentDir);

    // Check if file has changed since last index
    const existing = this.db.getAllIndexEntries().find(e => e.filePath === entry.filePath);
    if (existing && existing.lastModified === entry.lastModified) {
      return; // No change
    }

    // Generate summary if not provided in frontmatter
    if (!entry.summary) {
      const fs = await import('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      entry.summary = await generateSummary(this.anthropicClient, this.model, content);
    }

    this.db.upsertIndexEntry(entry);
  }

  async fullSync() {
    const entries = buildIndex(this.contentDir);
    const currentPaths = new Set(entries.map(e => e.filePath));

    // Index all current files
    for (const entry of entries) {
      const fullPath = path.join(this.contentDir, entry.filePath);
      await this.indexFile(fullPath);
    }

    // Remove entries for deleted files
    const dbEntries = this.db.getAllIndexEntries();
    for (const dbEntry of dbEntries) {
      if (!currentPaths.has(dbEntry.filePath)) {
        this.db.removeIndexEntry(dbEntry.filePath);
      }
    }
  }

  startWatching() {
    this.watcher = chokidar.watch(this.contentDir, {
      ignored: /(^|[/\\])\../,
      ignoreInitial: true,
    });

    this.watcher.on('add', (filePath) => {
      if (filePath.endsWith('.md')) this.indexFile(filePath);
    });

    this.watcher.on('change', (filePath) => {
      if (filePath.endsWith('.md')) this.indexFile(filePath);
    });

    this.watcher.on('unlink', (filePath) => {
      if (filePath.endsWith('.md')) {
        const relativePath = path.relative(this.contentDir, filePath);
        this.db.removeIndexEntry(relativePath);
      }
    });
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  getFormattedIndex() {
    const entries = this.db.getAllIndexEntries();
    if (entries.length === 0) return 'No content files found.';

    return entries.map(e => {
      let line = `- **${e.title}** (${e.filePath}): ${e.summary}`;
      if (e.tags.length > 0) line += ` [tags: ${e.tags.join(', ')}]`;
      if (e.images.length > 0) line += ` [images: ${e.images.join(', ')}]`;
      return line;
    }).join('\n');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/index-manager.test.js`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/index-manager.js tests/index-manager.test.js
git commit -m "feat: add IndexManager with persistence and file watching"
```

---

### Task 7: Claude Tool Definitions & Execution

**Files:**
- Create: `src/tools.js`
- Create: `tests/tools.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/tools.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getToolDefinitions, executeTool } from '../src/tools.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('tools', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-test-'));
    fs.mkdirSync(path.join(tmpDir, 'kids'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'kids', 'feeding.md'), '# Feeding\n\nBaby eats at 7, 12, 17.');
    fs.writeFileSync(path.join(tmpDir, 'rules.md'), '# Rules\n\nNo sugar after 16:00.');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  describe('getToolDefinitions', () => {
    it('returns two tool definitions', () => {
      const tools = getToolDefinitions();
      expect(tools).toHaveLength(2);

      const names = tools.map(t => t.name);
      expect(names).toContain('read_file');
      expect(names).toContain('list_folder');
    });
  });

  describe('executeTool - read_file', () => {
    it('reads a file within the content directory', () => {
      const result = executeTool('read_file', { path: 'kids/feeding.md' }, tmpDir);
      expect(result).toContain('Baby eats at 7, 12, 17.');
    });

    it('rejects paths that escape the content directory', () => {
      const result = executeTool('read_file', { path: '../../../etc/passwd' }, tmpDir);
      expect(result).toContain('Error');
    });

    it('returns error for nonexistent file', () => {
      const result = executeTool('read_file', { path: 'nonexistent.md' }, tmpDir);
      expect(result).toContain('Error');
    });
  });

  describe('executeTool - list_folder', () => {
    it('lists files and folders in a directory', () => {
      const result = executeTool('list_folder', { path: '.' }, tmpDir);
      expect(result).toContain('kids');
      expect(result).toContain('rules.md');
    });

    it('lists files in a subdirectory', () => {
      const result = executeTool('list_folder', { path: 'kids' }, tmpDir);
      expect(result).toContain('feeding.md');
    });

    it('rejects paths that escape the content directory', () => {
      const result = executeTool('list_folder', { path: '../../' }, tmpDir);
      expect(result).toContain('Error');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools.test.js`
Expected: FAIL — module `../src/tools.js` not found

- [ ] **Step 3: Implement tools module**

Create `src/tools.js`:

```js
import fs from 'fs';
import path from 'path';

export function getToolDefinitions() {
  return [
    {
      name: 'read_file',
      description: 'Read the contents of a markdown file from the content directory. Use this to get detailed information before answering a question.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file within the content directory (e.g. "kids/baby/feeding-schedule.md")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_folder',
      description: 'List files and subfolders in a directory within the content directory. Use this to explore available content.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the folder within the content directory (e.g. "kids/baby" or "." for root)',
          },
        },
        required: ['path'],
      },
    },
  ];
}

export function executeTool(toolName, input, contentDir) {
  const resolvedContentDir = path.resolve(contentDir);
  const targetPath = path.resolve(resolvedContentDir, input.path);

  // Security: prevent path traversal
  if (!targetPath.startsWith(resolvedContentDir)) {
    return 'Error: Access denied — path is outside the content directory.';
  }

  if (toolName === 'read_file') {
    try {
      return fs.readFileSync(targetPath, 'utf-8');
    } catch {
      return `Error: Could not read file "${input.path}". It may not exist.`;
    }
  }

  if (toolName === 'list_folder') {
    try {
      const items = fs.readdirSync(targetPath, { withFileTypes: true });
      const listing = items.map(item => {
        const suffix = item.isDirectory() ? '/' : '';
        return `${item.name}${suffix}`;
      });
      return listing.join('\n');
    } catch {
      return `Error: Could not list folder "${input.path}". It may not exist.`;
    }
  }

  return `Error: Unknown tool "${toolName}".`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools.test.js`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools.js tests/tools.test.js
git commit -m "feat: add Claude tool definitions and execution with path safety"
```

---

### Task 8: Chat Module (Anthropic API Integration)

**Files:**
- Create: `src/chat.js`
- Create: `tests/chat.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/chat.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, processToolCalls } from '../src/chat.js';

describe('buildSystemPrompt', () => {
  it('includes kids names, personality, and content index', () => {
    const prompt = buildSystemPrompt({
      kidsNames: ['Anna', 'Bjarki'],
      contentIndex: '- **Matartími** (kids/baby/feeding.md): Feeding schedule for baby',
    });

    expect(prompt).toContain('Anna');
    expect(prompt).toContain('Bjarki');
    expect(prompt).toContain('Matartími');
    expect(prompt).toContain('kids/baby/feeding.md');
    expect(prompt).toContain('Icelandic');
  });

  it('includes instructions to use tools before answering', () => {
    const prompt = buildSystemPrompt({
      kidsNames: ['Anna'],
      contentIndex: '- **Test** (test.md): Summary',
    });

    expect(prompt).toContain('read_file');
  });
});

describe('processToolCalls', () => {
  it('executes tool calls and returns tool results', () => {
    const response = {
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'Let me check that.' },
        { type: 'tool_use', id: 'call_1', name: 'read_file', input: { path: 'test.md' } },
      ],
    };

    const mockExecute = vi.fn().mockReturnValue('# Test\n\nFile content.');

    const results = processToolCalls(response, mockExecute);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      type: 'tool_result',
      tool_use_id: 'call_1',
      content: '# Test\n\nFile content.',
    });
    expect(mockExecute).toHaveBeenCalledWith('read_file', { path: 'test.md' });
  });

  it('returns empty array when no tool calls', () => {
    const response = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Here is the answer.' }],
    };

    const results = processToolCalls(response, vi.fn());
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/chat.test.js`
Expected: FAIL — module `../src/chat.js` not found

- [ ] **Step 3: Implement chat module**

Create `src/chat.js`:

```js
export function buildSystemPrompt({ kidsNames, contentIndex }) {
  return `You are a warm, reassuring family helper for the babysitter. You help take care of ${kidsNames.join(' and ')}. 
You ALWAYS respond in Icelandic. Use a warm, friendly tone — like a helpful co-parent.

You have access to a knowledge base of information about the kids and household. Here is an index of all available files:

${contentIndex}

IMPORTANT INSTRUCTIONS:
- Before answering any question, use the read_file tool to look up the relevant file(s) from the index above.
- Use the list_folder tool if you need to explore what content is available.
- When a file references images, include the image path in your response using markdown image syntax so the babysitter can see them. Use the format: ![description](/content/path/to/image.jpg)
- If you don't have information about something, say so honestly rather than guessing.
- Use the kids' names (${kidsNames.join(', ')}) naturally in your responses.
- Be reassuring and supportive — the babysitter may be anxious about getting things right.`;
}

export function processToolCalls(response, executeToolFn) {
  const toolUses = response.content.filter(block => block.type === 'tool_use');

  return toolUses.map(toolUse => ({
    type: 'tool_result',
    tool_use_id: toolUse.id,
    content: executeToolFn(toolUse.name, toolUse.input),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/chat.test.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/chat.js tests/chat.test.js
git commit -m "feat: add chat module with system prompt and tool call processing"
```

---

### Task 9: Chat Streaming & Tool Loop

**Files:**
- Modify: `src/chat.js`
- Create: `tests/chat-stream.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/chat-stream.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { handleChatTurn } from '../src/chat.js';

describe('handleChatTurn', () => {
  it('handles a simple response with no tool use', async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Hæ! Hvernig get ég hjálpað?' }],
          stop_reason: 'end_turn',
        }),
      },
    };

    const result = await handleChatTurn({
      client: mockClient,
      model: 'claude-sonnet-4-6-20250514',
      systemPrompt: 'You are a helper.',
      messages: [{ role: 'user', content: 'Hæ' }],
      tools: [],
      executeTool: vi.fn(),
    });

    expect(result.response.content[0].text).toBe('Hæ! Hvernig get ég hjálpað?');
    expect(result.messages).toHaveLength(2); // user + assistant
  });

  it('loops when Claude makes tool calls then responds', async () => {
    const mockClient = {
      messages: {
        create: vi.fn()
          .mockResolvedValueOnce({
            content: [
              { type: 'text', text: 'Ég ætla að fletta þessu upp.' },
              { type: 'tool_use', id: 'call_1', name: 'read_file', input: { path: 'kids/feeding.md' } },
            ],
            stop_reason: 'tool_use',
          })
          .mockResolvedValueOnce({
            content: [{ type: 'text', text: 'Barnið borðar klukkan 7, 12 og 17.' }],
            stop_reason: 'end_turn',
          }),
      },
    };

    const executeTool = vi.fn().mockReturnValue('# Feeding\n\nEats at 7, 12, 17.');

    const result = await handleChatTurn({
      client: mockClient,
      model: 'claude-sonnet-4-6-20250514',
      systemPrompt: 'You are a helper.',
      messages: [{ role: 'user', content: 'Hvenær borðar barnið?' }],
      tools: [],
      executeTool,
    });

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    expect(executeTool).toHaveBeenCalledWith('read_file', { path: 'kids/feeding.md' });
    expect(result.response.content[0].text).toContain('7, 12 og 17');
    // Messages: user, assistant (tool_use), user (tool_result), assistant (final)
    expect(result.messages).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chat-stream.test.js`
Expected: FAIL — `handleChatTurn` is not exported

- [ ] **Step 3: Add handleChatTurn to chat.js**

Add to the end of `src/chat.js`:

```js
export async function handleChatTurn({ client, model, systemPrompt, messages, tools, executeTool }) {
  const conversationMessages = [...messages];

  let response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: conversationMessages,
    tools,
  });

  conversationMessages.push({ role: 'assistant', content: response.content });

  // Tool use loop: keep going while Claude wants to use tools
  while (response.stop_reason === 'tool_use') {
    const toolResults = processToolCalls(response, executeTool);

    conversationMessages.push({ role: 'user', content: toolResults });

    response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationMessages,
      tools,
    });

    conversationMessages.push({ role: 'assistant', content: response.content });
  }

  return { response, messages: conversationMessages };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/chat-stream.test.js`
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/chat.js tests/chat-stream.test.js
git commit -m "feat: add chat turn handler with tool use loop"
```

---

### Task 10: Express Server & Routes

**Files:**
- Create: `src/server.js`
- Create: `tests/server.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/server.test.js`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../src/server.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('server routes', () => {
  let app, tmpDir, dbPath;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-test-'));
    dbPath = path.join(tmpDir, 'test.db');
    fs.mkdirSync(path.join(tmpDir, 'content'));
    fs.writeFileSync(
      path.join(tmpDir, 'content', 'test.md'),
      '# Test\n\nContent.'
    );

    // Create a test image
    fs.mkdirSync(path.join(tmpDir, 'content', 'images'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'content', 'images', 'test.jpg'), 'fake-image-data');

    app = await createApp({
      apiKey: 'sk-test-fake',
      port: 0,
      contentDir: path.join(tmpDir, 'content'),
      dbPath,
      sessionTtlHours: 24,
      kidsNames: ['Anna', 'Bjarki'],
      model: 'claude-sonnet-4-6-20250514',
    });
  });

  afterAll(() => {
    if (app?.cleanup) app.cleanup();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('serves the frontend at GET /', async () => {
    const res = await fetch(app.url + '/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('serves static content images at /content/*', async () => {
    const res = await fetch(app.url + '/content/images/test.jpg');
    expect(res.status).toBe(200);
  });

  it('returns 404 for nonexistent content', async () => {
    const res = await fetch(app.url + '/content/nope.jpg');
    expect(res.status).toBe(404);
  });

  it('POST /api/chat returns 400 without a message', async () => {
    const res = await fetch(app.url + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/server.test.js`
Expected: FAIL — module `../src/server.js` not found

- [ ] **Step 3: Implement server**

Create `src/server.js`:

```js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { createDb } from './db.js';
import { IndexManager } from './index-manager.js';
import { getToolDefinitions, executeTool } from './tools.js';
import { buildSystemPrompt, handleChatTurn } from './chat.js';
import { loadConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(options) {
  const {
    apiKey,
    port,
    contentDir,
    dbPath = './data/babysitter.db',
    sessionTtlHours,
    kidsNames,
    model,
  } = options;

  const app = express();
  app.use(express.json());

  // Database
  const db = createDb(dbPath);

  // Anthropic client
  const client = new Anthropic({ apiKey });

  // Content index
  const indexManager = new IndexManager(db, contentDir, client, model);
  await indexManager.fullSync();
  indexManager.startWatching();

  // Static files: frontend
  app.use(express.static(path.join(__dirname, 'public')));

  // Static files: content images
  app.use('/content', express.static(path.resolve(contentDir)));

  // Session middleware using cookies
  app.use((req, res, next) => {
    let sessionId = parseCookie(req.headers.cookie, 'session_id');
    if (!sessionId || !db.getSession(sessionId)) {
      sessionId = uuidv4();
      db.createSession(sessionId);
      res.setHeader('Set-Cookie', `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
    }
    req.sessionId = sessionId;
    next();
  });

  // Chat endpoint
  app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    try {
      const session = db.getSession(req.sessionId);
      const messages = [...session.messages, { role: 'user', content: message }];

      const systemPrompt = buildSystemPrompt({
        kidsNames,
        contentIndex: indexManager.getFormattedIndex(),
      });

      const tools = getToolDefinitions();

      const result = await handleChatTurn({
        client,
        model,
        systemPrompt,
        messages,
        tools,
        executeTool: (name, input) => executeTool(name, input, contentDir),
      });

      // Extract final text from response
      const assistantText = result.response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      // Save full conversation (with tool calls) to DB
      db.appendMessage(req.sessionId, { role: 'user', content: message });
      db.appendMessage(req.sessionId, { role: 'assistant', content: result.response.content });

      res.json({ reply: assistantText });
    } catch (err) {
      console.error('Chat error:', err);
      res.status(500).json({ error: 'Villa kom upp. Reyndu aftur.' });
    }
  });

  // Session cleanup on interval
  const cleanupInterval = setInterval(() => {
    db.deleteExpiredSessions(sessionTtlHours);
  }, 60 * 60 * 1000); // Every hour

  // Start server
  const server = app.listen(port, () => {
    console.log(`Agent Babysitter running on port ${port}`);
  });

  const address = server.address();
  const resolvedPort = typeof address === 'object' ? address.port : port;

  return {
    app,
    server,
    url: `http://localhost:${resolvedPort}`,
    cleanup() {
      clearInterval(cleanupInterval);
      indexManager.stopWatching();
      server.close();
      db.close();
    },
  };
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

// Run directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const config = loadConfig();
  const dataDir = './data';
  const fs = await import('fs');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  createApp({
    apiKey: config.apiKey,
    port: config.port,
    contentDir: config.contentDir,
    dbPath: path.join(dataDir, 'babysitter.db'),
    sessionTtlHours: config.sessionTtlHours,
    kidsNames: config.kidsNames,
    model: config.model,
  });
}
```

- [ ] **Step 4: Create a minimal placeholder index.html for tests**

Create `src/public/index.html`:

```html
<!DOCTYPE html>
<html lang="is">
<head><meta charset="UTF-8"><title>Fjölskylduaðstoð</title></head>
<body><p>Placeholder</p></body>
</html>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/server.test.js`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/server.js src/public/index.html tests/server.test.js
git commit -m "feat: add Express server with chat endpoint and session management"
```

---

### Task 11: Frontend — HTML Shell

**Files:**
- Modify: `src/public/index.html`

- [ ] **Step 1: Write the full HTML**

Replace `src/public/index.html` with:

```html
<!DOCTYPE html>
<html lang="is">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fjölskylduaðstoð</title>
  <link rel="stylesheet" href="/style.css">
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <script defer src="/app.js"></script>
</head>
<body>
  <div id="chat-app" x-data="chatApp()">
    <header>
      <h1>Fjölskylduaðstoð</h1>
      <p class="subtitle" x-text="subtitle"></p>
    </header>

    <main id="chat-messages" x-ref="messages">
      <!-- Welcome message -->
      <template x-if="messages.length === 0">
        <div class="message assistant">
          <div class="bubble">
            Hæ! Ég er hér til að hjálpa þér með allt sem snýr að börnunum og heimilinu. Spurðu mig um hvað sem er!
          </div>
        </div>
      </template>

      <!-- Chat messages -->
      <template x-for="msg in messages" :key="msg.id">
        <div class="message" :class="msg.role">
          <div class="bubble" x-html="msg.html"></div>
        </div>
      </template>

      <!-- Loading indicator -->
      <template x-if="loading">
        <div class="message assistant">
          <div class="bubble loading">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </template>
    </main>

    <footer>
      <form @submit.prevent="sendMessage">
        <input
          type="text"
          x-model="input"
          placeholder="Skrifaðu spurningu..."
          :disabled="loading"
          x-ref="input"
          autocomplete="off"
        >
        <button type="submit" :disabled="loading || !input.trim()">Senda</button>
      </form>
    </footer>
  </div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/public/index.html
git commit -m "feat: add chat UI HTML shell with Alpine.js"
```

---

### Task 12: Frontend — Styles

**Files:**
- Create: `src/public/style.css`

- [ ] **Step 1: Write the stylesheet**

Create `src/public/style.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg: #faf8f5;
  --header-bg: #5b7a6b;
  --header-text: #ffffff;
  --user-bubble: #5b7a6b;
  --user-text: #ffffff;
  --assistant-bubble: #ffffff;
  --assistant-text: #2d3436;
  --border: #e0ddd8;
  --input-bg: #ffffff;
  --shadow: rgba(0, 0, 0, 0.06);
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

html, body {
  height: 100%;
  font-family: var(--font);
  background: var(--bg);
}

#chat-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 600px;
  margin: 0 auto;
}

header {
  background: var(--header-bg);
  color: var(--header-text);
  padding: 1rem;
  text-align: center;
}

header h1 {
  font-size: 1.3rem;
  font-weight: 600;
}

header .subtitle {
  font-size: 0.85rem;
  opacity: 0.85;
  margin-top: 0.2rem;
}

main {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  line-height: 1.5;
  box-shadow: 0 1px 3px var(--shadow);
  word-wrap: break-word;
}

.message.user .bubble {
  background: var(--user-bubble);
  color: var(--user-text);
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .bubble {
  background: var(--assistant-bubble);
  color: var(--assistant-text);
  border-bottom-left-radius: 0.25rem;
}

.bubble img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}

.bubble p {
  margin-bottom: 0.5rem;
}

.bubble p:last-child {
  margin-bottom: 0;
}

.bubble ul, .bubble ol {
  margin-left: 1.2rem;
  margin-bottom: 0.5rem;
}

.bubble strong {
  font-weight: 600;
}

/* Loading dots */
.bubble.loading {
  display: flex;
  gap: 0.3rem;
  padding: 1rem 1.2rem;
}

.dot {
  width: 8px;
  height: 8px;
  background: #b0b0b0;
  border-radius: 50%;
  animation: bounce 1.2s infinite ease-in-out;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1.1); opacity: 1; }
}

footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  background: var(--input-bg);
}

footer form {
  display: flex;
  gap: 0.5rem;
}

footer input {
  flex: 1;
  padding: 0.7rem 1rem;
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  font-size: 1rem;
  font-family: var(--font);
  outline: none;
}

footer input:focus {
  border-color: var(--header-bg);
}

footer button {
  padding: 0.7rem 1.2rem;
  background: var(--header-bg);
  color: white;
  border: none;
  border-radius: 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  font-family: var(--font);
}

footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  #chat-app {
    max-width: 100%;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/public/style.css
git commit -m "feat: add chat UI styles with warm color palette"
```

---

### Task 13: Frontend — Chat Logic

**Files:**
- Create: `src/public/app.js`

- [ ] **Step 1: Write the Alpine.js chat application**

Create `src/public/app.js`:

```js
function chatApp() {
  return {
    messages: [],
    input: '',
    loading: false,
    subtitle: '',
    nextId: 1,

    init() {
      // Subtitle is set from config; hardcoded for now, could be fetched from /api/config
      this.subtitle = '';
      this.$refs.input.focus();
    },

    async sendMessage() {
      const text = this.input.trim();
      if (!text || this.loading) return;

      this.input = '';
      this.messages.push({
        id: this.nextId++,
        role: 'user',
        html: escapeHtml(text),
      });

      this.scrollToBottom();
      this.loading = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
          throw new Error('Server error');
        }

        const data = await res.json();
        this.messages.push({
          id: this.nextId++,
          role: 'assistant',
          html: renderMarkdown(data.reply),
        });
      } catch {
        this.messages.push({
          id: this.nextId++,
          role: 'assistant',
          html: '<em>Villa kom upp. Reyndu aftur.</em>',
        });
      }

      this.loading = false;
      this.scrollToBottom();
      this.$nextTick(() => this.$refs.input.focus());
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messages;
        el.scrollTop = el.scrollHeight;
      });
    },
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  // Lightweight markdown rendering for chat messages
  // Handles: bold, italic, images, links, lists, paragraphs
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

- [ ] **Step 2: Start the dev server and test in browser**

Run: `ANTHROPIC_API_KEY=your-key node src/server.js`
Open: `http://localhost:3456`

Verify:
- Welcome message appears in Icelandic
- Can type and send a message
- Loading dots appear while waiting
- Response renders with formatted markdown
- Chat scrolls to bottom on new messages
- Works on mobile viewport

- [ ] **Step 3: Commit**

```bash
git add src/public/app.js
git commit -m "feat: add frontend chat logic with markdown rendering"
```

---

### Task 14: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

EXPOSE 3456

CMD ["node", "src/server.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:

```yaml
services:
  babysitter:
    build: .
    restart: unless-stopped
    ports:
      - "${PORT:-3456}:${PORT:-3456}"
    volumes:
      - ./content:/app/content
      - ./data:/app/data
    env_file:
      - .env
    environment:
      - CONTENT_DIR=/app/content
```

- [ ] **Step 3: Verify Docker build**

```bash
docker build -t agent-babysitter .
```

Expected: Build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: add Docker and docker-compose for Pi deployment"
```

---

### Task 15: End-to-End Smoke Test

**Files:** None (manual testing)

- [ ] **Step 1: Create a .env file for local testing**

```bash
cp .env.example .env
```

Edit `.env` and set your real `ANTHROPIC_API_KEY`.

- [ ] **Step 2: Run locally**

```bash
npm run dev
```

Open `http://localhost:3456` in a browser.

- [ ] **Step 3: Test the golden path**

1. Verify welcome message appears: "Hæ! Ég er hér til að hjálpa þér..."
2. Ask: "Hvenær borðar barnið?" — should trigger `read_file` on the feeding schedule and answer in Icelandic
3. Ask a follow-up: "Og hvað með svefn?" — should maintain context and answer about sleep (if content exists)
4. Verify images render when referenced in content
5. Reload the page — session should persist (same cookie)

- [ ] **Step 4: Test Docker deployment**

```bash
docker compose up --build
```

Open `http://localhost:3456` and repeat the same checks.

- [ ] **Step 5: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix: smoke test adjustments"
```

(Only if there are actual fixes needed.)
