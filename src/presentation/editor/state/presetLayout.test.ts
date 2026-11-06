import { describe, expect, it } from 'vitest';
import type { ComponentNode } from '@domain/entities/componentNode';
import { centerNodesForViewport } from './presetLayout';

function node(id: string, x: number, w: number, overrides: Partial<ComponentNode> = {}): ComponentNode {
  return {
    id,
    type: 'text',
    x,
    y: 96,
    w,
    h: 24,
    props: { text: id, level: 'body' },
    ...overrides,
  } as ComponentNode;
}

describe('centerNodesForViewport', () => {
  it('centers a group in the target frame and preserves relative spacing', () => {
    const nodes = [node('a', 88, 100), node('b', 120, 160)];

    const centered = centerNodesForViewport(nodes, { width: 390, height: 780 });

    // Group spans 88..280 (192 wide); centered start = (390 - 192) / 2 = 99.
    expect(centered[0]).toMatchObject({ id: 'a', x: 99 });
    expect(centered[1]).toMatchObject({ id: 'b', x: 131 });
  });

  it('moves the same group back to the center of a wider frame', () => {
    const nodes = [node('a', 0, 100), node('b', 32, 160)];

    const centered = centerNodesForViewport(nodes, { width: 1200, height: 800 });

    // Group spans 0..192; centered start = (1200 - 192) / 2 = 504.
    expect(centered[0]!.x).toBe(504);
    expect(centered[1]!.x).toBe(536);
  });

  it('returns the original array when the group is already centered', () => {
    const nodes = [node('a', 99, 192)];

    expect(centerNodesForViewport(nodes, { width: 390, height: 780 })).toBe(nodes);
  });

  it('left-aligns content wider than the frame instead of clipping its leading edge', () => {
    const nodes = [node('wide', 40, 600)];

    expect(centerNodesForViewport(nodes, { width: 390, height: 780 })[0]!.x).toBe(0);
  });

  it('ignores hidden nodes when measuring but moves them with the group', () => {
    const nodes = [
      node('visible', 0, 100),
      node('hidden', 900, 20, { isHidden: true }),
    ];

    const centered = centerNodesForViewport(nodes, { width: 390, height: 780 });

    // Visible group spans 0..100, so it starts at 145.
    expect(centered[0]!.x).toBe(145);
    expect(centered[1]!.x).toBe(1045);
  });

  it('keeps vertical positions and nested children untouched', () => {
    const container = {
      ...node('container', 0, 100),
      type: 'container',
      children: [node('child', 8, 40)],
    } as ComponentNode;

    const [centered] = centerNodesForViewport([container], { width: 390, height: 780 });

    expect(centered).toMatchObject({ x: 145, y: 96 });
    expect(centered!.type).toBe('container');
    if (centered!.type === 'container') {
      expect(centered!.children[0]).toMatchObject({ x: 8, y: 96 });
    }
  });

  it('leaves an empty screen alone', () => {
    const nodes: ComponentNode[] = [];

    expect(centerNodesForViewport(nodes, { width: 390, height: 780 })).toBe(nodes);
  });
});
