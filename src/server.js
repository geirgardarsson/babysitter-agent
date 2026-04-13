import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createDb } from './db.js';
import { IndexManager } from './index-manager.js';
import { buildSystemPrompt, handleChatTurn } from './chat.js';
import { loadConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(options) {
  const {
    port,
    contentDir,
    dbPath = './data/babysitter.db',
    sessionTtlHours,
    kidsNames,
  } = options;

  const app = express();
  app.use(express.json());

  // Database
  const db = createDb(dbPath);

  // Content index
  const indexManager = new IndexManager(db, contentDir);
  try {
    await indexManager.fullSync();
  } catch (err) {
    console.warn('Warning: content index sync failed:', err.message);
  }
  indexManager.startWatching();

  // Static files: frontend
  app.use(express.static(path.join(__dirname, 'public')));

  // Static files: content images only (not markdown)
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
  app.use('/content', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (!imageExts.has(ext)) {
      return res.status(403).end('Forbidden');
    }
    next();
  }, express.static(path.resolve(contentDir)));

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
      let history = session.messages;
      // Cap conversation history to prevent unbounded context growth
      const MAX_MESSAGES = 50;
      if (history.length > MAX_MESSAGES) {
        history = history.slice(-MAX_MESSAGES);
      }
      const messages = [...history, { role: 'user', content: message }];

      const systemPrompt = buildSystemPrompt({
        kidsNames,
        allContent: indexManager.getAllContent(),
      });

      const result = await handleChatTurn({ systemPrompt, messages });

      // Save user message and assistant reply
      db.appendMessage(req.sessionId, { role: 'user', content: message });
      db.appendMessage(req.sessionId, { role: 'assistant', content: result.reply });

      res.json({ reply: result.reply });
    } catch (err) {
      console.error('Chat error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Villa kom upp. Reyndu aftur.' });
      }
    }
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Villa kom upp. Reyndu aftur.' });
    }
  });

  // Session cleanup on interval
  const cleanupInterval = setInterval(() => {
    db.deleteExpiredSessions(sessionTtlHours);
  }, 60 * 60 * 1000);

  // Start server
  const server = app.listen(port, () => {
    console.log(`Agent Babysitter running on port ${port}`);
  });

  await new Promise((resolve) => server.once('listening', resolve));

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
    port: config.port,
    contentDir: config.contentDir,
    dbPath: path.join(dataDir, 'babysitter.db'),
    sessionTtlHours: config.sessionTtlHours,
    kidsNames: config.kidsNames,
  });
}
