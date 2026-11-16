import { describe, expect, it } from 'vitest';
import type { ComponentNode } from '../entities/componentNode';
import type { Screen } from '../entities/screen';
import { BLANK_SECTION_HEIGHT, createBlankWebsiteSection } from './blankSection';
import { findSectionContentOverflows } from './sectionOverflow';

function textNode(id: string, height: number): ComponentNode {
  return {
    id,
    type: 'text',
    x: 0,
    y: 0,
    w: 200,
    h: height,
    props: { text: 'Short copy', level: 'body' },
  };
}

function screenWith(nodes: ComponentNode[]): Screen {
  return {
    id: 'screen_1',
    name: 'Home',
    path: '/',
    nodes,
    behaviors: [],
    logicGraphs: [],
  };
}

function sectionWithChildren(...children: ComponentNode[]): ComponentNode {
  const section = createBlankWebsiteSection('Hero');
  section.children = children;
  return section;
}

describe('findSectionContentOverflows', () => {
  it('reports a section whose content needs more height than authored', () => {
    const section = sectionWithChildren(textNode('a', 200), textNode('b', 200));

    const result = findSectionContentOverflows(screenWith([section]), 'mobile');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sectionId: section.id,
      sectionName: 'Hero',
      breakpoint: 'mobile',
      authoredHeight: BLANK_SECTION_HEIGHT,
    });
    expect(result[0]!.requiredHeight).toBeGreaterThan(BLANK_SECTION_HEIGHT);
  });

  it('returns nothing when the authored height already fits the content', () => {
    const section = sectionWithChildren(textNode('a', 20));

    expect(findSectionContentOverflows(screenWith([section]), 'mobile')).toEqual([]);
  });

  it('preserves the authored height of an empty blank section', () => {
    const section = createBlankWebsiteSection('Blank');

    expect(findSectionContentOverflows(screenWith([section]), 'mobile')).toEqual([]);
  });

  it('ignores hidden sections and non-section root nodes', () => {
    const hidden = createBlankWebsiteSection('Hidden');
    hidden.isHidden = true;
    hidden.children = [textNode('a', 200), textNode('b', 200)];

    expect(findSectionContentOverflows(screenWith([hidden, textNode('root', 200)]), 'mobile')).toEqual([]);
  });

  it('uses the authored height from the requested breakpoint', () => {
    const section = sectionWithChildren(textNode('a', 200), textNode('b', 200));
    section.responsive = { ...section.responsive, tablet: { h: 120 } };

    const result = findSectionContentOverflows(screenWith([section]), 'tablet');

    expect(result).toHaveLength(1);
    expect(result[0]!.authoredHeight).toBe(120);
    expect(result[0]!.breakpoint).toBe('tablet');
  });
});
