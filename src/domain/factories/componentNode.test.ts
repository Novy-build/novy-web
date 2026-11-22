import { describe, expect, it } from 'vitest';
import { createPadding } from '../entities/componentNode';
import { createComponentNode, getDefaultNodeSize } from './componentNode';

describe('createComponentNode', () => {
  it('creates a button with draft-style defaults', () => {
    const node = createComponentNode('button');

    expect(node.type).toBe('button');
    if (node.type === 'button') {
      expect(node.props.label).toBe('Click me');
      expect(node.props.variant).toBe('solid');
    }
  });

  it('creates one node per palette type', () => {
    const types = ['text', 'input', 'image', 'container', 'column', 'row', 'listview'] as const;

    types.forEach((type) => {
      expect(createComponentNode(type).type).toBe(type);
    });
  });

  it('container nodes start with no children', () => {
    const node = createComponentNode('container');
    expect(node.type).toBe('container');
    if (node.type === 'container') {
      expect(node.children).toEqual([]);
    }
  });

  it('creates layout widgets with zero default padding', () => {
    const column = createComponentNode('column');
    const row = createComponentNode('row');
    const listView = createComponentNode('listview');

    expect(column.type === 'column' ? column.props.padding : null).toEqual(createPadding(0));
    expect(row.type === 'row' ? row.props.padding : null).toEqual(createPadding(0));
    expect(listView.type === 'listview' ? listView.props.padding : null).toEqual(createPadding(0));
  });

  it('creates an empty ListView ready for item-design setup', () => {
    const node = createComponentNode('listview');

    expect(node.type).toBe('listview');
    if (node.type === 'listview') {
      expect(node.props).toMatchObject({
        padding: createPadding(0),
        itemSpacing: 8,
        itemBorderRadius: 8,
      });
      expect(node.props.dataSource).toEqual({
        kind: 'static',
        fields: [{ id: 'value', label: 'Value', type: 'text' }],
        items: [],
      });
      expect(node.children).toEqual([]);
    }
  });

  it('creates a camera that starts inactive and faces the user', () => {
    const node = createComponentNode('camera');

    expect(node.type).toBe('camera');
    if (node.type === 'camera') {
      expect(node.props).toEqual({
        label: 'Camera',
        facingMode: 'user',
        captureLabel: 'Capture',
      });
      expect(node).toMatchObject({ w: 320, h: 220 });
    }
  });

  it('creates a chart with static demo series and a default palette', () => {
    const node = createComponentNode('chart');

    expect(node.type).toBe('chart');
    if (node.type === 'chart') {
      expect(node.props.chartType).toBe('bar');
      expect(node.props.dataSource.kind).toBe('static');
      if (node.props.dataSource.kind === 'static') {
        expect(node.props.dataSource.categories).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
        expect(node.props.dataSource.series).toHaveLength(1);
        expect(node.props.dataSource.series[0]?.values).toHaveLength(4);
      }
      expect(node.props.palette.length).toBeGreaterThan(0);
      expect(node.props.showLegend).toBe(true);
    }
    expect(getDefaultNodeSize('chart')).toEqual({ w: 360, h: 260 });
  });

  it('generates unique ids', () => {
    const a = createComponentNode('button');
    const b = createComponentNode('button');
    expect(a.id).not.toBe(b.id);
  });
});

describe('getDefaultNodeSize', () => {
  it('returns the default size of each component type', () => {
    expect(getDefaultNodeSize('button')).toEqual({ w: 160, h: 44 });
    expect(getDefaultNodeSize('text')).toEqual({ w: 220, h: 28 });
  });
});
