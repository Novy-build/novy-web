import { describe, expect, it } from 'vitest';
import { makeButton, makeColumn, makeContainer, makeListView, makeText } from '@test/editorFixtures';
import { findFrameAtPoint, getComponentTreeLocation, moveLayerInTree, reparentLayerInTree } from './componentTree';

describe('moveLayerInTree', () => {
  it('reparents a root layer into a frame without changing its absolute position', () => {
    const text = makeText('text', { x: 120, y: 140 });
    const frame = makeContainer('frame', [], { x: 40, y: 60 });

    const moved = moveLayerInTree([text, frame], 'text', 'frame', 'inside');
    const nextFrame = moved.find((node) => node.id === 'frame');

    expect(nextFrame?.type === 'container' ? nextFrame.children[0] : null).toMatchObject({
      id: 'text',
      x: 80,
      y: 80,
    });
  });

  it('moves a nested layer back beside its parent and preserves canvas coordinates', () => {
    const child = makeButton('child', { x: 20, y: 30 });
    const frame = makeContainer('frame', [child], { x: 100, y: 120 });
    const sibling = makeText('sibling', { x: 20, y: 20 });

    const moved = moveLayerInTree([sibling, frame], 'child', 'frame', 'before');
    const movedChild = moved.find((node) => node.id === 'child');

    expect(movedChild).toMatchObject({ x: 120, y: 150 });
    expect(moved.map((node) => node.id)).toEqual(['sibling', 'frame', 'child']);
  });

  it('rejects moving a frame into its own descendant or into a locked frame', () => {
    const nested = makeContainer('nested');
    const frame = makeContainer('frame', [nested]);
    const tree = [frame, makeContainer('locked', [], { isLocked: true })];

    expect(moveLayerInTree(tree, 'frame', 'nested', 'inside')).toBe(tree);
    expect(moveLayerInTree(tree, 'frame', 'locked', 'inside')).toBe(tree);
  });
});

describe('canvas frame targeting', () => {
  it('returns the deepest frame under a point and ignores hidden or locked frames', () => {
    const inner = makeContainer('inner', [], { x: 20, y: 20, w: 100, h: 80 });
    const outer = makeContainer('outer', [inner], { x: 40, y: 50, w: 240, h: 180 });

    expect(findFrameAtPoint([outer], 70, 80)?.id).toBe('inner');
    expect(findFrameAtPoint([{ ...outer, isLocked: true }], 70, 80)).toBeNull();
    expect(findFrameAtPoint([{ ...outer, isHidden: true }], 70, 80)).toBeNull();
  });

  it('treats ListView item templates as a separate hit-testing boundary', () => {
    const list = makeListView('list', {
      x: 40,
      y: 50,
      w: 240,
      h: 180,
      children: [makeContainer('item-frame', [], { x: 0, y: 0, w: 240, h: 80 })],
    });

    expect(findFrameAtPoint([list], 70, 80)).toBeNull();
  });

  it('reparents between a frame and root while preserving absolute geometry', () => {
    const child = makeButton('child', { x: 10, y: 15 });
    const frame = makeContainer('frame', [child], { x: 100, y: 120 });

    const atRoot = reparentLayerInTree([frame], 'child', null);
    expect(atRoot.find((node) => node.id === 'child')).toMatchObject({ x: 110, y: 135 });

    const nestedAgain = reparentLayerInTree(atRoot, 'child', 'frame');
    const restoredFrame = nestedAgain.find((node) => node.id === 'frame');
    expect(restoredFrame?.type === 'container' ? restoredFrame.children[0] : null).toMatchObject({
      id: 'child',
      x: 10,
      y: 15,
    });
  });

  it('uses the pointer destination when direct manipulation supplies one', () => {
    const frame = makeContainer('frame', [], { x: 100, y: 120 });
    const button = makeButton('button', { x: 300, y: 300 });

    const moved = reparentLayerInTree(
      [frame, button],
      'button',
      'frame',
      { x: 140, y: 160 },
    );
    const nextFrame = moved.find((node) => node.id === 'frame');

    expect(nextFrame?.type === 'container' ? nextFrame.children[0] : null).toMatchObject({
      x: 40,
      y: 40,
    });
  });

  it('nests into Column widgets and resolves child positions from axis layout', () => {
    const column = makeColumn('column', [], { x: 100, y: 120, w: 240, h: 220 });
    const text = makeText('text', { x: 360, y: 300, w: 120, h: 36 });

    const moved = reparentLayerInTree([column, text], 'text', 'column');
    const location = getComponentTreeLocation(moved, 'text');

    expect(moved.find((node) => node.id === 'column')?.type).toBe('column');
    expect(location).toMatchObject({
      parentId: 'column',
      absoluteX: 116,
      absoluteY: 136,
    });
    expect(findFrameAtPoint(moved, 130, 150)?.id).toBe('column');
  });
});
