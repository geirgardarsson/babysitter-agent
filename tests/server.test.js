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
      port: 0,
      contentDir: path.join(tmpDir, 'content'),
      dbPath,
      sessionTtlHours: 24,
      kidsNames: ['Anna', 'Bjarki'],
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

  it('blocks direct access to markdown files', async () => {
    const res = await fetch(app.url + '/content/test.md');
    expect(res.status).toBe(403);
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
