import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildParentSystemPrompt, parseFileOps, applyFileOps } from '../src/parent-chat.js';

describe('buildParentSystemPrompt', () => {
  it('includes content and file-op instructions', () => {
    const prompt = buildParentSystemPrompt({ allContent: '## Test file\n\nSome content' });
    expect(prompt).toContain('file-op');
    expect(prompt).toContain('write_file');
    expect(prompt).toContain('Test file');
    expect(prompt).toContain('Icelandic');
  });
});

describe('parseFileOps', () => {
  it('returns empty fileOps and full reply when no blocks', () => {
    const raw = 'Ég skráði þetta.';
    const { displayReply, fileOps } = parseFileOps(raw);
    expect(fileOps).toEqual([]);
    expect(displayReply).toBe('Ég skráði þetta.');
  });

  it('extracts a single write_file op and strips the block from reply', () => {
    const raw = `Ég skráði þetta.

\`\`\`file-op
{"action":"write_file","path":"kids/anna.md","content":"# Anna\\n\\nHnetu-ofnæmi."}
\`\`\``;
    const { displayReply, fileOps } = parseFileOps(raw);
    expect(fileOps).toHaveLength(1);
    expect(fileOps[0].action).toBe('write_file');
    expect(fileOps[0].path).toBe('kids/anna.md');
    expect(fileOps[0].content).toContain('Anna');
    expect(displayReply).toBe('Ég skráði þetta.');
  });

  it('extracts multiple file-op blocks', () => {
    const raw = `Allt skráð.

\`\`\`file-op
{"action":"write_file","path":"kids/anna.md","content":"# Anna"}
\`\`\`

\`\`\`file-op
{"action":"write_file","path":"kids/bjarki.md","content":"# Bjarki"}
\`\`\``;
    const { fileOps } = parseFileOps(raw);
    expect(fileOps).toHaveLength(2);
    expect(fileOps[0].path).toBe('kids/anna.md');
    expect(fileOps[1].path).toBe('kids/bjarki.md');
  });

  it('skips malformed JSON blocks gracefully', () => {
    const raw = `Vandamál.

\`\`\`file-op
{not valid json}
\`\`\``;
    const { fileOps } = parseFileOps(raw);
    expect(fileOps).toEqual([]);
  });

  it('skips blocks missing required fields', () => {
    const raw = `\`\`\`file-op
{"action":"write_file"}
\`\`\``;
    const { fileOps } = parseFileOps(raw);
    expect(fileOps).toEqual([]);
  });
});

describe('applyFileOps', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parent-chat-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a file and returns its relative path', () => {
    const ops = [{ action: 'write_file', path: 'kids/anna.md', content: '# Anna\n\nTest.' }];
    const written = applyFileOps(ops, tmpDir);
    expect(written).toEqual(['kids/anna.md']);
    const content = fs.readFileSync(path.join(tmpDir, 'kids/anna.md'), 'utf-8');
    expect(content).toBe('# Anna\n\nTest.');
  });

  it('creates nested directories as needed', () => {
    const ops = [{ action: 'write_file', path: 'a/b/c/file.md', content: 'hello' }];
    applyFileOps(ops, tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'a/b/c/file.md'))).toBe(true);
  });

  it('deletes an existing file', () => {
    const filePath = path.join(tmpDir, 'old.md');
    fs.writeFileSync(filePath, 'old content');
    const ops = [{ action: 'delete_file', path: 'old.md' }];
    const written = applyFileOps(ops, tmpDir);
    expect(written).toEqual(['old.md']);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('strips leading traversal and writes safely within contentDir', () => {
    const ops = [{ action: 'write_file', path: '../../etc/passwd', content: 'evil' }];
    applyFileOps(ops, tmpDir);
    // The real /etc/passwd must not have been overwritten with 'evil'
    if (fs.existsSync('/etc/passwd')) {
      expect(fs.readFileSync('/etc/passwd', 'utf-8')).not.toBe('evil');
    }
    // The path must not escape the tmpDir
    const escapedPath = path.resolve(path.resolve(tmpDir), '..', '..', 'etc', 'passwd');
    if (fs.existsSync(escapedPath)) {
      expect(fs.readFileSync(escapedPath, 'utf-8')).not.toBe('evil');
    }
  });

  it('returns empty array when no ops given', () => {
    expect(applyFileOps([], tmpDir)).toEqual([]);
  });
});
