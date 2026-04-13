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
    const existing = this.db.getIndexEntry(entry.filePath);
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
      if (filePath.endsWith('.md')) this.indexFile(filePath).catch(err => {
        console.error(`Failed to index new file ${filePath}:`, err.message);
      });
    });

    this.watcher.on('change', (filePath) => {
      if (filePath.endsWith('.md')) this.indexFile(filePath).catch(err => {
        console.error(`Failed to re-index ${filePath}:`, err.message);
      });
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
