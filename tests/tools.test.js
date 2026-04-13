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
