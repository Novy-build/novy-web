import { describe, expect, it } from 'vitest';
import { createPadding } from '@domain/entities/componentNode';
import { makeButton, makeColumn, makeContainer, makeListView, makeRow, makeText } from '@test/editorFixtures';
import { findFrameAtPoint, findMainAxisInsertIndex, getComponentTreeLocation, moveLayerInTree, reparentLayerInTree } from './componentTree';

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

describe('main-axis layer ordering', () => {
  it('inserts before a sibling under a Row in array order', () => {
    const first = makeButton('first', { x: 20, y: 30 });
    const second = makeText('second', { x: 20, y: 20 });
    const row = makeRow('row', [first, second], { x: 100, y: 120 });

    const moved = moveLayerInTree([row], 'second', 'first', 'before');
    const nextRow = moved[0] as { children: { id: string }[] };
    expect(nextRow.children.map((node) => node.id)).toEqual(['second', 'first']);
  });

  it('keeps free-form before semantics unchanged', () => {
    const child = makeButton('child', { x: 20, y: 30 });
    const frame = makeContainer('frame', [child], { x: 100, y: 120 });
    const sibling = makeText('sibling', { x: 20, y: 20 });

    const moved = moveLayerInTree([sibling, frame], 'child', 'frame', 'before');
    expect(moved.map((node) => node.id)).toEqual(['sibling', 'frame', 'child']);
  });

  it('computes a pointer-based insertion index for Rows', () => {
    const first = makeButton('first', { x: 16, y: 16, w: 40, h: 24 });
    const second = makeButton('second', { x: 72, y: 16, w: 40, h: 24 });
    const row = makeRow('row', [first, second], {
      x: 0,
      y: 0,
      w: 160,
      h: 64,
      props: { mainAxisAlignment: 'start', crossAxisAlignment: 'stretch', gap: 12, padding: createPadding(16) },
    });

    expect(findMainAxisInsertIndex(row, 10, 20)).toBe(0);
    expect(findMainAxisInsertIndex(row, 40, 20)).toBe(1);
    expect(findMainAxisInsertIndex(row, 140, 20)).toBe(2);
  });

  it('returns the child count for free-form parents', () => {
    const frame = makeContainer('frame', [makeButton('child')]);
    expect(findMainAxisInsertIndex(frame, 10, 20)).toBe(1);
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
