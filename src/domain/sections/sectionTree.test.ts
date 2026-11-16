import { describe, expect, it } from 'vitest';
import type { ComponentNode } from '../entities/componentNode';
import { createBlankWebsiteSection } from './blankSection';
import { moveWebsiteSection, websiteSections } from './sectionTree';

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

describe('websiteSections', () => {
  it('returns only root columns in their original order', () => {
    const first = createBlankWebsiteSection('First');
    const second = createBlankWebsiteSection('Second');
    const nodes = [textNode('intro'), first, textNode('middle'), second];

    expect(websiteSections(nodes).map((node) => node.id)).toEqual([first.id, second.id]);
  });

  it('returns an empty array when there are no sections', () => {
    expect(websiteSections([textNode('a'), textNode('b')])).toEqual([]);
    expect(websiteSections([])).toEqual([]);
  });
});

describe('moveWebsiteSection', () => {
  it('swaps a section down past an unrelated root node without mutating the input', () => {
    const first = createBlankWebsiteSection('First');
    const second = createBlankWebsiteSection('Second');
    const spacer = textNode('spacer');
    const nodes = [first, spacer, second];

    const moved = moveWebsiteSection(nodes, first.id, 'down');

    expect(moved.map((node) => node.id)).toEqual([second.id, spacer.id, first.id]);
    expect(nodes.map((node) => node.id)).toEqual([first.id, spacer.id, second.id]);
    expect(moved).not.toBe(nodes);
  });

  it('swaps a section up while keeping non-section nodes in place', () => {
    const first = createBlankWebsiteSection('First');
    const second = createBlankWebsiteSection('Second');
    const spacer = textNode('spacer');
    const nodes = [first, spacer, second];

    const moved = moveWebsiteSection(nodes, second.id, 'up');

    expect(moved.map((node) => node.id)).toEqual([second.id, spacer.id, first.id]);
  });

  it('refuses to move past the first or last section', () => {
    const first = createBlankWebsiteSection('First');
    const second = createBlankWebsiteSection('Second');
    const nodes = [first, second];

    expect(moveWebsiteSection(nodes, first.id, 'up')).toEqual(nodes);
    expect(moveWebsiteSection(nodes, second.id, 'down')).toEqual(nodes);
  });

  it('returns an unchanged copy for an unknown id or a non-section node', () => {
    const first = createBlankWebsiteSection('First');
    const spacer = textNode('spacer');
    const nodes = [first, spacer];

    expect(moveWebsiteSection(nodes, 'missing', 'down')).toEqual(nodes);
    expect(moveWebsiteSection(nodes, spacer.id, 'down')).toEqual(nodes);
  });

  it('moves across more than two sections', () => {
    const first = createBlankWebsiteSection('First');
    const second = createBlankWebsiteSection('Second');
    const third = createBlankWebsiteSection('Third');
    const nodes = [first, second, third];

    expect(moveWebsiteSection(nodes, first.id, 'down').map((node) => node.id)).toEqual([
      second.id,
      first.id,
      third.id,
    ]);
    expect(moveWebsiteSection(nodes, third.id, 'up').map((node) => node.id)).toEqual([
      first.id,
      third.id,
      second.id,
    ]);
  });
});
