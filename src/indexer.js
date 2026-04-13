import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function scanFile(filePath, contentDir) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);

  const relativePath = path.relative(contentDir, filePath);

  // Extract title: first # heading or filename
  const headingMatch = content.match(/^#\s+(.+)$/m);
  const title = headingMatch
    ? headingMatch[1].trim()
    : path.basename(filePath, '.md');

  // Summary: from frontmatter or null (to be filled by AI later)
  const summary = frontmatter.summary || null;

  // Tags from frontmatter
  const tags = frontmatter.tags || [];

  // Extract image references: ![alt](path)
  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const images = [];
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    images.push(match[1]);
  }

  // Last modified
  const stat = fs.statSync(filePath);
  const lastModified = Math.floor(stat.mtimeMs);

  return { filePath: relativePath, title, summary, tags, images, lastModified };
}

export function buildIndex(contentDir) {
  const entries = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (item.name.endsWith('.md')) {
        entries.push(scanFile(full, contentDir));
      }
    }
  }

  walk(contentDir);
  return entries;
}

export async function generateSummary(anthropicClient, model, content) {
  const response = await anthropicClient.messages.create({
    model,
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Summarize the following content in exactly one sentence (in English). This summary will be used as an index entry so a language model can decide whether to read the full file.\n\n${content}`,
      },
    ],
  });

  return response.content[0].text;
}
