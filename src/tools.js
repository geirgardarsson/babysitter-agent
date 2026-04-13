import fs from 'fs';
import path from 'path';

export function getToolDefinitions() {
  return [
    {
      name: 'read_file',
      description: 'Read the contents of a markdown file from the content directory. Use this to get detailed information before answering a question.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file within the content directory (e.g. "kids/baby/feeding-schedule.md")',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'list_folder',
      description: 'List files and subfolders in a directory within the content directory. Use this to explore available content.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the folder within the content directory (e.g. "kids/baby" or "." for root)',
          },
        },
        required: ['path'],
      },
    },
  ];
}

export function executeTool(toolName, input, contentDir) {
  const resolvedContentDir = path.resolve(contentDir);
  const targetPath = path.resolve(resolvedContentDir, input.path);

  // Security: prevent path traversal
  if (!targetPath.startsWith(resolvedContentDir)) {
    return 'Error: Access denied — path is outside the content directory.';
  }

  if (toolName === 'read_file') {
    try {
      return fs.readFileSync(targetPath, 'utf-8');
    } catch {
      return `Error: Could not read file "${input.path}". It may not exist.`;
    }
  }

  if (toolName === 'list_folder') {
    try {
      const items = fs.readdirSync(targetPath, { withFileTypes: true });
      const listing = items.map(item => {
        const suffix = item.isDirectory() ? '/' : '';
        return `${item.name}${suffix}`;
      });
      return listing.join('\n');
    } catch {
      return `Error: Could not list folder "${input.path}". It may not exist.`;
    }
  }

  return `Error: Unknown tool "${toolName}".`;
}
