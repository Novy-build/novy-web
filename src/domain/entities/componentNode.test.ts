import { describe, expect, it } from 'vitest';
import type { ListViewNode } from './componentNode';
import { geometryAtBreakpoint } from './componentNode';
import { listViewItemExtentAtBreakpoint } from './componentNode';
import { createComponentNode } from '../factories/componentNode';

describe('listViewItemExtentAtBreakpoint', () => {
  it('returns the default empty extent for templates without children', () => {
    const list = createComponentNode('listview') as ListViewNode;
    expect(listViewItemExtentAtBreakpoint(list, 'mobile')).toBe(44);
  });

  it('adds padding to the largest child extent', () => {
    const list = createComponentNode('listview') as ListViewNode;
    const child = createComponentNode('text');
    const withChild = { ...list, children: [child], props: { ...list.props, padding: 12 } } as ListViewNode;
    const extent = listViewItemExtentAtBreakpoint(withChild, 'mobile');
    const childGeometry = geometryAtBreakpoint(child, 'mobile');
    expect(extent).toBe(childGeometry.y + childGeometry.h + 12);
  });
});