function parseKidsNames(value) {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Support comma-separated format: "Anna,Bjarki"
  return value.split(',').map(n => n.trim()).filter(Boolean);
}

export function loadConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    apiKey,
    port: parseInt(process.env.PORT || '3456', 10),
    contentDir: process.env.CONTENT_DIR || './content',
    sessionTtlHours: parseInt(process.env.SESSION_TTL_HOURS || '24', 10),
    kidsNames: parseKidsNames(process.env.KIDS_NAMES || '[]'),
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6-20250514',
  };
}
