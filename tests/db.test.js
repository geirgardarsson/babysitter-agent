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
