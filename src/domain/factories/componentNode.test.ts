import { describe, expect, it } from 'vitest';
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
    const types = ['text', 'input', 'image', 'container', 'list', 'form'] as const;

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

  it('creates a configurable Form with accessible starter fields', () => {
    const node = createComponentNode('form');

    expect(node.type).toBe('form');
    if (node.type === 'form') {
      expect(node.props.title).toBe('Contact us');
      expect(node.props.fields).toHaveLength(2);
      expect(node.props.submitLabel).toBe('Submit');
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
