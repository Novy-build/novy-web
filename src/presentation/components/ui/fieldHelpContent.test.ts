import { describe, expect, it } from 'vitest';
import { describeOption, getFieldHelp, hasCuratedOptionHelp } from './fieldHelpContent';

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

  it('adds notes and dynamic option hints where configured', () => {
    expect(getFieldHelp(undefined, 'Data source', 'design').note).toContain('re-check the record label');
    expect(getFieldHelp(undefined, 'Collection', 'logic').dynamicOptionHint)
      .toBe('Uses records from this collection.');
  });
});

describe('describeOption', () => {
  it('uses curated use cases for static options', () => {
    expect(describeOption('Static items')).toContain('Hard-code a short, fixed list');
    expect(describeOption('Collection')).toContain('Read records from a project data collection');
    expect(describeOption('On Change')).toContain('value changes');
    expect(hasCuratedOptionHelp('guided-face (automatic)')).toBe(true);
    expect(hasCuratedOptionHelp('System')).toBe(true);
    expect(hasCuratedOptionHelp('Space between')).toBe(true);
    expect(hasCuratedOptionHelp('Equals')).toBe(true);
  });

  it('falls back to the field category hint, then to neutral copy', () => {
    expect(describeOption('Tasks', 'Uses records from this collection.'))
      .toBe('Uses records from this collection.');
    expect(describeOption('Custom choice')).toBe('Selects “Custom choice” as the value for this field.');
  });
});
