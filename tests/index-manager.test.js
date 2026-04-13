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
