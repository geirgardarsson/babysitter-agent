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
