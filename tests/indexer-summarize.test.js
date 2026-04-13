import { describe, it, expect, vi } from 'vitest';
import { generateSummary } from '../src/indexer.js';
import { execFile } from 'child_process';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

describe('generateSummary', () => {
  it('calls claude --print and returns the summary text', async () => {
    execFile.mockImplementation((cmd, args, opts, callback) => {
      const child = {
        stdin: { write: vi.fn(), end: vi.fn() },
      };
      // Simulate async callback
      setTimeout(() => callback(null, 'A schedule for baby feeding times and formula prep.', ''), 0);
      return child;
    });

    const summary = await generateSummary(
      'Matartími\n\nBarnið borðar á þessum tímum:\n- 07:00 morgunmatur'
    );

    expect(summary).toBe('A schedule for baby feeding times and formula prep.');
    expect(execFile).toHaveBeenCalledWith(
      'claude',
      ['--print'],
      expect.any(Object),
      expect.any(Function),
    );
  });
});
