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
    process.env.PORT = '4000';
    process.env.CONTENT_DIR = './test-content';
    process.env.SESSION_TTL_HOURS = '12';
    process.env.KIDS_NAMES = '["Sigga","Tommi"]';

    const config = loadConfig();

    expect(config.port).toBe(4000);
    expect(config.contentDir).toBe('./test-content');
    expect(config.sessionTtlHours).toBe(12);
    expect(config.kidsNames).toEqual(['Sigga', 'Tommi']);
  });

  it('uses defaults for optional values', () => {
    const config = loadConfig();

    expect(config.port).toBe(3456);
    expect(config.contentDir).toBe('./content');
    expect(config.sessionTtlHours).toBe(24);
  });

  it('supports comma-separated kids names', () => {
    process.env.KIDS_NAMES = 'Anna, Bjarki';

    const config = loadConfig();

    expect(config.kidsNames).toEqual(['Anna', 'Bjarki']);
  });
});
