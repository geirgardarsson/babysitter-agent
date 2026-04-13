import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexManager } from '../src/index-manager.js';
import { createDb } from '../src/db.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock generateSummary to avoid calling claude --print in tests
vi.mock('../src/indexer.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateSummary: vi.fn().mockResolvedValue('Auto-generated summary.'),
  };
});

import { generateSummary } from '../src/indexer.js';

describe('IndexManager', () => {
  let tmpDir, dbPath, db, manager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idx-mgr-'));
    dbPath = path.join(tmpDir, 'test.db');
    db = createDb(dbPath);
    manager = new IndexManager(db, tmpDir);
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
    expect(generateSummary).not.toHaveBeenCalled();
  });

  it('skips files that have not changed since last index', async () => {
    fs.writeFileSync(path.join(tmpDir, 'stable.md'), '# Stable\n\nContent.');
    await manager.fullSync();

    generateSummary.mockClear();
    await manager.fullSync();

    expect(generateSummary).not.toHaveBeenCalled();
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

  it('getAllContent returns full file contents', async () => {
    fs.writeFileSync(path.join(tmpDir, 'info.md'), '---\ntags: [household]\n---\n# House Info\n\nImportant details here.');
    await manager.fullSync();

    const content = manager.getAllContent();
    expect(content).toContain('House Info');
    expect(content).toContain('Important details here.');
  });
});
