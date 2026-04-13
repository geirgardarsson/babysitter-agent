import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads config from environment variables', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';
    process.env.PORT = '4000';
    process.env.CONTENT_DIR = './test-content';
    process.env.SESSION_TTL_HOURS = '12';
    process.env.KIDS_NAMES = '["Sigga","Tommi"]';
    process.env.CLAUDE_MODEL = 'claude-sonnet-4-6-20250514';

    const config = loadConfig();

    expect(config.apiKey).toBe('sk-test-key');
    expect(config.port).toBe(4000);
    expect(config.contentDir).toBe('./test-content');
    expect(config.sessionTtlHours).toBe(12);
    expect(config.kidsNames).toEqual(['Sigga', 'Tommi']);
    expect(config.model).toBe('claude-sonnet-4-6-20250514');
  });

  it('uses defaults for optional values', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';

    const config = loadConfig();

    expect(config.port).toBe(3456);
    expect(config.contentDir).toBe('./content');
    expect(config.sessionTtlHours).toBe(24);
    expect(config.model).toBe('claude-sonnet-4-6-20250514');
  });

  it('throws if ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY');
  });
});
