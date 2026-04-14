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
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Migration: add updated_at to existing DBs
  const hasUpdatedAt = raw.prepare(
    "SELECT COUNT(*) as n FROM pragma_table_info('sessions') WHERE name = 'updated_at'"
  ).get().n > 0;
  if (!hasUpdatedAt) {
    raw.exec('ALTER TABLE sessions ADD COLUMN updated_at DATETIME');
    raw.exec('UPDATE sessions SET updated_at = created_at');
  }

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

    getIndexEntry(filePath) {
      const row = raw.prepare('SELECT * FROM content_index WHERE file_path = ?').get(filePath);
      if (!row) return null;
      return {
        filePath: row.file_path,
        title: row.title,
        summary: row.summary,
        tags: JSON.parse(row.tags),
        images: JSON.parse(row.images),
        lastModified: row.last_modified,
      };
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
      raw.prepare(
        "UPDATE sessions SET messages = json_insert(messages, '$[#]', json(?)), updated_at = datetime('now') WHERE id = ?"
      ).run(JSON.stringify(message), sessionId);
    },

    listSessions() {
      const rows = raw.prepare(
        "SELECT id, created_at, updated_at, messages FROM sessions ORDER BY COALESCE(updated_at, created_at) DESC"
      ).all();
      return rows.map(row => {
        const messages = JSON.parse(row.messages);
        const firstUserMsg = messages.find(m => m.role === 'user');
        return {
          id: row.id,
          createdAt: row.created_at,
          updatedAt: row.updated_at ?? row.created_at,
          messageCount: messages.length,
          preview: firstUserMsg ? firstUserMsg.content.slice(0, 100) : null,
        };
      });
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
