import { describe, expect, it } from 'vitest';
import type { ColumnNode, ListViewNode, RowNode } from './componentNode';
import {
  BUTTON_ICON_NAMES,
  childGeometriesAtBreakpoint,
  createEdgePadding,
  createPadding,
  createSymmetricPadding,
  geometryAtBreakpoint,
  isButtonIconName,
  isTextFontWeight,
  listViewItemExtentAtBreakpoint,
  normalizePadding,
  resolveEdgeInsets,
} from './componentNode';
import { createComponentNode } from '../factories/componentNode';

describe('padding values', () => {
  it('creates uniform and symmetric padding', () => {
    expect(createPadding(12)).toEqual({ mode: 'all', top: 12, right: 12, bottom: 12, left: 12 });
    expect(createSymmetricPadding(8, 16)).toEqual({ mode: 'symmetric', top: 8, right: 16, bottom: 8, left: 16 });
  });

  it('infers a mode for edge values and preserves explicitly chosen modes', () => {
    expect(createEdgePadding({ top: 4, right: 8, bottom: 4, left: 8 }).mode).toBe('symmetric');
    expect(createEdgePadding({ top: 4, right: 8, bottom: 12, left: 16 }).mode).toBe('only');
    expect(createEdgePadding({ top: 4, right: 8, bottom: 12, left: 16, mode: 'all' }).mode).toBe('all');
  });

  it('normalizes legacy numeric padding without losing other sides', () => {
    expect(normalizePadding(12)).toEqual(createPadding(12));
    expect(resolveEdgeInsets(12)).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(resolveEdgeInsets({ top: 4, right: 8 })).toEqual({ top: 4, right: 8, bottom: 0, left: 0 });
    expect(resolveEdgeInsets(undefined)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('clamps invalid sides to zero', () => {
    expect(resolveEdgeInsets({ top: -4, right: Number.NaN, bottom: 8, left: 2 })).toEqual({
      top: 0,
      right: 0,
      bottom: 8,
      left: 2,
    });
  });
});

describe('button icon values', () => {
  it('only accepts curated button icon names', () => {
    expect(isButtonIconName('check')).toBe(true);
    expect(isButtonIconName(BUTTON_ICON_NAMES[0])).toBe(true);
    expect(isButtonIconName('rocket')).toBe(false);
    expect(isButtonIconName(undefined)).toBe(false);
    expect(isButtonIconName(42)).toBe(false);
  });
});

describe('text typography values', () => {
  it('only accepts curated font weights', () => {
    expect(isTextFontWeight('bold')).toBe(true);
    expect(isTextFontWeight('ultra')).toBe(false);
    expect(isTextFontWeight(undefined)).toBe(false);
  });
});

describe('childGeometriesAtBreakpoint', () => {
  it('uses each padding side for Column child layout', () => {
    const column: ColumnNode = {
      id: 'column',
      type: 'column',
      x: 0,
      y: 0,
      w: 320,
      h: 300,
      props: {
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
        gap: 10,
        padding: createEdgePadding({ top: 16, right: 8, bottom: 32, left: 24 }),
      },
      children: [
        { id: 'first', type: 'button', x: 0, y: 0, w: 100, h: 44, props: { label: 'First', variant: 'solid' } },
        { id: 'second', type: 'text', x: 0, y: 0, w: 100, h: 36, props: { text: 'Second', level: 'body' } },
      ],
    };

    const geometries = childGeometriesAtBreakpoint(column, 'mobile');

    expect(geometries.get('first')).toEqual({ x: 24, y: 16, w: 288, h: 44 });
    expect(geometries.get('second')).toEqual({ x: 24, y: 70, w: 288, h: 36 });
  });

  it('centers children inside the asymmetric content box', () => {
    const row: RowNode = {
      id: 'row',
      type: 'row',
      x: 0,
      y: 0,
      w: 300,
      h: 100,
      props: {
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'center',
        gap: 0,
        padding: createEdgePadding({ top: 10, right: 20, bottom: 30, left: 40 }),
      },
      children: [
        { id: 'child', type: 'button', x: 0, y: 0, w: 100, h: 20, props: { label: 'Child', variant: 'solid' } },
      ],
    };

    const geometry = childGeometriesAtBreakpoint(row, 'mobile').get('child');

    expect(geometry).toEqual({ x: 40, y: 30, w: 100, h: 20 });
  });
});

describe('listViewItemExtentAtBreakpoint', () => {
  it('returns the default empty extent for templates without children', () => {
    const list = createComponentNode('listview') as ListViewNode;
    expect(listViewItemExtentAtBreakpoint(list, 'mobile')).toBe(44);
  });

  it('adds the trailing padding side to the largest child extent', () => {
    const list = createComponentNode('listview') as ListViewNode;
    const child = createComponentNode('text');
    const withChild = {
      ...list,
      children: [child],
      props: { ...list.props, padding: createPadding(12) },
    } as ListViewNode;
    const extent = listViewItemExtentAtBreakpoint(withChild, 'mobile');
    const childGeometry = geometryAtBreakpoint(child, 'mobile');
    expect(extent).toBe(childGeometry.y + childGeometry.h + 12);
  });

  it('uses asymmetric top and bottom padding for vertical lists', () => {
    const list = createComponentNode('listview') as ListViewNode;
    const child = {
      id: 'item',
      type: 'text' as const,
      x: 12,
      y: 16,
      w: 286,
      h: 44,
      props: { text: 'Item', level: 'body' as const },
    };
    const withChild = {
      ...list,
      children: [child],
      props: {
        ...list.props,
        padding: createEdgePadding({ top: 16, right: 20, bottom: 24, left: 12 }),
      },
    } as ListViewNode;

    expect(listViewItemExtentAtBreakpoint(withChild, 'mobile')).toBe(84);

    const horizontal = {
      ...withChild,
      props: { ...withChild.props, scrollDirection: 'horizontal' as const },
    } as ListViewNode;
    expect(listViewItemExtentAtBreakpoint(horizontal, 'mobile')).toBe(318);
  });
});
