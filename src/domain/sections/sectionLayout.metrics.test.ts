import { describe, expect, it } from 'vitest';
import type { ComponentNode } from '../entities/componentNode';
import type { Screen } from '../entities/screen';
import { createBlankWebsiteSection } from './blankSection';
import {
  WEBSITE_MIN_HEIGHTS,
  WEBSITE_PAGE_WIDTHS,
  ensureWebsiteSectionDarkAppearances,
  nextSectionOffset,
  websitePageHeight,
} from './sectionLayout';

function withPosition(node: ComponentNode, y: number, h: number): ComponentNode {
  return { ...node, y, h } as ComponentNode;
}

function screenWith(nodes: ComponentNode[]): Screen {
  return {
    id: 'home',
    name: 'Home',
    path: '/',
    nodes,
    behaviors: [],
    logicGraphs: [],
  };
}

function textNode(id: string): ComponentNode {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    w: 100,
    h: 24,
    props: { text: id, level: 'body' },
  };
}

describe('nextSectionOffset', () => {
  it('is zero for an empty page', () => {
    expect(nextSectionOffset([], 'mobile')).toBe(0);
  });

  it('returns the bottom edge of the lowest section, ignoring earlier ones', () => {
    const first = withPosition(createBlankWebsiteSection('First'), 0, 200);
    const earlier = withPosition(createBlankWebsiteSection('Earlier'), 10, 20);
    const last = withPosition(createBlankWebsiteSection('Last'), 200, 150);

    expect(nextSectionOffset([first, earlier, last], 'mobile')).toBe(350);
  });

  it('respects the requested breakpoint', () => {
    const section = createBlankWebsiteSection('Tablet');
    section.responsive = { ...section.responsive, tablet: { h: 500 } };

    expect(nextSectionOffset([section], 'tablet')).toBe(500);
    expect(nextSectionOffset([section], 'mobile')).toBe(section.h);
  });
});

describe('ensureWebsiteSectionDarkAppearances', () => {
  it('infers dark colours for a legacy light section without mutating it', () => {
    const legacy = createBlankWebsiteSection('Legacy');
    legacy.appearance = { backgroundColor: '#eef0ff' };

    const result = ensureWebsiteSectionDarkAppearances(screenWith([legacy]));

    expect(result.nodes[0]?.appearance?.backgroundColor).toBe('#eef0ff');
    expect(result.nodes[0]?.appearance?.dark).toMatchObject({
      backgroundColor: '#1e1b4b',
      borderColor: '#312e81',
    });
    expect(legacy.appearance?.dark).toBeUndefined();
  });

  it('uses distinct dark backgrounds for the brand and pale presets', () => {
    const brand = createBlankWebsiteSection('Brand');
    brand.appearance = { backgroundColor: '#5551f2' };
    const pale = createBlankWebsiteSection('Pale');
    pale.appearance = { backgroundColor: '#fafbfc' };

    const result = ensureWebsiteSectionDarkAppearances(screenWith([brand, pale]));

    expect(result.nodes[0]?.appearance?.dark?.backgroundColor).toBe('#4338ca');
    expect(result.nodes[1]?.appearance?.dark?.backgroundColor).toBe('#1a1e25');
  });

  it('preserves an explicit dark palette', () => {
    const section = createBlankWebsiteSection('Custom');
    section.appearance = {
      backgroundColor: '#ffffff',
      dark: { backgroundColor: '#010101', textColor: '#fefefe', borderColor: '#020202' },
    };

    const result = ensureWebsiteSectionDarkAppearances(screenWith([section]));

    expect(result.nodes[0]?.appearance?.dark).toEqual({
      backgroundColor: '#010101',
      textColor: '#fefefe',
      borderColor: '#020202',
    });
  });

  it('leaves non-section root nodes untouched and returns a new screen', () => {
    const text = textNode('intro');
    const screen = screenWith([text]);

    const result = ensureWebsiteSectionDarkAppearances(screen);

    expect(result.nodes[0]).toBe(text);
    expect(result).not.toBe(screen);
    expect(result.id).toBe(screen.id);
    expect(result.name).toBe(screen.name);
    expect(result.path).toBe(screen.path);
  });
});

describe('websitePageHeight', () => {
  it('uses the minimum height when the screen is null or empty', () => {
    expect(websitePageHeight(null, 'desktop')).toBe(WEBSITE_MIN_HEIGHTS.desktop);
    expect(websitePageHeight(screenWith([]), 'mobile')).toBe(WEBSITE_MIN_HEIGHTS.mobile);
  });

  it('grows past one viewport for a long page', () => {
    const tall = withPosition(createBlankWebsiteSection('Tall'), 900, 100);

    expect(websitePageHeight(screenWith([tall]), 'mobile')).toBe(1000);
  });

  it('exposes the per-breakpoint width and minimum-height constants', () => {
    expect(WEBSITE_PAGE_WIDTHS).toEqual({ mobile: 390, tablet: 768, desktop: 1200 });
    expect(WEBSITE_MIN_HEIGHTS).toEqual({ mobile: 780, tablet: 1024, desktop: 800 });
  });
});
