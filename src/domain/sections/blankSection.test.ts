import { describe, expect, it } from 'vitest';
import { geometryAtBreakpoint } from '../entities/componentNode';
import { BLANK_SECTION_HEIGHT, createBlankWebsiteSection } from './blankSection';

describe('createBlankWebsiteSection', () => {
  it('creates an empty full-width section at the authored height', () => {
    const section = createBlankWebsiteSection('Section 1');

    expect(BLANK_SECTION_HEIGHT).toBe(360);
    expect(section.type).toBe('column');
    expect(section.name).toBe('Section 1');
    expect(section.children).toEqual([]);
    expect(geometryAtBreakpoint(section, 'mobile')).toMatchObject({
      x: 0,
      y: 0,
      w: 390,
      h: BLANK_SECTION_HEIGHT,
    });
    expect(geometryAtBreakpoint(section, 'tablet')).toMatchObject({
      w: 768,
      h: BLANK_SECTION_HEIGHT,
    });
    expect(geometryAtBreakpoint(section, 'desktop')).toMatchObject({
      w: 1200,
      h: BLANK_SECTION_HEIGHT,
    });
  });

  it('uses a stretch column with 24px padding and a 16px gap', () => {
    const section = createBlankWebsiteSection('Canvas');

    expect(section.props).toMatchObject({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      gap: 16,
    });
    expect(section.props.padding).toMatchObject({
      mode: 'all',
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    });
  });

  it('ships a contrasting dark appearance', () => {
    const section = createBlankWebsiteSection('Canvas');

    expect(section.appearance).toMatchObject({ backgroundColor: '#ffffff', borderStyle: 'none' });
    expect(section.appearance?.dark).toMatchObject({
      backgroundColor: '#15181e',
      textColor: '#eef0f4',
      borderColor: '#262a33',
    });
  });

  it('gives each section a unique id', () => {
    expect(createBlankWebsiteSection('A').id).not.toBe(createBlankWebsiteSection('B').id);
  });
});
