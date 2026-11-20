import { describe, expect, it } from 'vitest';
import { getFieldHelp } from './fieldHelpContent';

describe('getFieldHelp', () => {
  it('resolves curated content by stable field name', () => {
    expect(getFieldHelp('screen-background', 'Background', 'design')).toEqual({
      description: expect.stringContaining('base fill'),
      docsQuery: 'What does the Background field under Screen surface control?',
    });
  });

  it('resolves curated content by label when no name is available', () => {
    expect(getFieldHelp(undefined, 'Event', 'logic').description).toContain('user interaction');
  });

  it('normalizes names and labels before lookup', () => {
    expect(getFieldHelp('inspector-button-label', 'Button label', 'design').docsQuery)
      .toBe('How do I change a button label?');
    expect(getFieldHelp(undefined, 'Collection', 'logic').description).toContain('data collection');
  });

  it('falls back to generic help for unmapped fields', () => {
    const help = getFieldHelp(undefined, 'Custom threshold', 'data');
    expect(help.description).toContain('Custom threshold');
    expect(help.docsQuery).toBe('What is “Custom threshold” in the Data editor used for?');
  });
});
