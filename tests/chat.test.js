import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildConversationPrompt } from '../src/chat.js';

describe('buildSystemPrompt', () => {
  it('includes kids names, personality, and content', () => {
    const prompt = buildSystemPrompt({
      kidsNames: ['Anna', 'Bjarki'],
      allContent: '## Matartími (kids/baby/feeding.md)\n\nFeeding schedule content',
    });

    expect(prompt).toContain('Anna');
    expect(prompt).toContain('Bjarki');
    expect(prompt).toContain('Matartími');
    expect(prompt).toContain('Icelandic');
  });

  it('includes image instructions', () => {
    const prompt = buildSystemPrompt({
      kidsNames: ['Anna'],
      allContent: '## Test\n\nContent',
    });

    expect(prompt).toContain('/content/');
    expect(prompt).toContain('image');
  });
});

describe('buildConversationPrompt', () => {
  it('formats conversation history', () => {
    const messages = [
      { role: 'user', content: 'Hæ' },
      { role: 'assistant', content: 'Hæ! Hvernig get ég hjálpað?' },
      { role: 'user', content: 'Hvenær borðar barnið?' },
    ];

    const prompt = buildConversationPrompt('system', messages);

    expect(prompt).toContain('Human: Hæ');
    expect(prompt).toContain('Assistant: Hæ! Hvernig get ég hjálpað?');
    expect(prompt).toContain('Human: Hvenær borðar barnið?');
  });

  it('handles single message', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const prompt = buildConversationPrompt('system', messages);

    expect(prompt).toContain('Human: Hello');
  });
});
