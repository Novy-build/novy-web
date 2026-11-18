import { describe, expect, it } from 'vitest';
import type { ButtonNode, ImageNode, ProgressNode, TextNode } from '../entities/componentNode';
import {
  bindingTargetsForComponent,
  isFieldTypeCompatible,
  resolveBoundBoolean,
  resolveBoundNumber,
  resolveBoundText,
} from './componentBindings';

const textNode: TextNode = {
  id: 'text',
  type: 'text',
  x: 0,
  y: 0,
  w: 100,
  h: 24,
  props: { text: 'Fallback', level: 'body' },
  bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'name' } }],
};

describe('component bindings', () => {
  it('resolves compatible item values and preserves fallbacks', () => {
    expect(resolveBoundText(textNode, 'text.content', {
      listViewId: 'list',
      itemId: 'record',
      values: { name: 'Ada' },
    }, textNode.props.text)).toBe('Ada');
    expect(resolveBoundText(textNode, 'text.content', {
      listViewId: 'list',
      itemId: 'record',
      values: { name: null },
    }, textNode.props.text)).toBe('Fallback');
  });

  it('uses strict runtime types for boolean bindings', () => {
    const visibleNode: TextNode = {
      ...textNode,
      bindings: [{ target: 'component.visible', value: { source: 'list-item', fieldId: 'active' } }],
    };
    expect(resolveBoundBoolean(visibleNode, 'component.visible', {
      listViewId: 'list',
      itemId: 'record',
      values: { active: false },
    }, true)).toBe(false);
    expect(resolveBoundBoolean(visibleNode, 'component.visible', {
      listViewId: 'list',
      itemId: 'record',
      values: { active: 'false' },
    }, true)).toBe(true);
  });

  it('publishes component and field compatibility metadata', () => {
    expect(bindingTargetsForComponent('image').map(({ target }) => target)).toEqual([
      'image.source',
      'image.alt',
      'component.visible',
    ]);
    expect(isFieldTypeCompatible('progress.value', 'number')).toBe(true);
    expect(isFieldTypeCompatible('progress.value', 'text')).toBe(false);
    expect(bindingTargetsForComponent('input').map(({ target }) => target)).toEqual([
      'input.value',
      'component.visible',
    ]);
    expect(isFieldTypeCompatible('input.value', 'date')).toBe(true);
    expect(isFieldTypeCompatible('dropdown.value', 'boolean')).toBe(false);
  });

  it('resolves image, button, and progress targets with typed fallbacks', () => {
    const item = {
      listViewId: 'list',
      itemId: 'record',
      values: { image: 'https://example.com/ada.png', alt: 'Ada', action: 42, progress: 75 },
    } as const;
    const image: ImageNode = {
      id: 'image', type: 'image', x: 0, y: 0, w: 100, h: 100,
      props: { src: '/fallback.png', alt: 'Fallback', fit: 'cover' },
      bindings: [
        { target: 'image.source', value: { source: 'list-item', fieldId: 'image' } },
        { target: 'image.alt', value: { source: 'list-item', fieldId: 'alt' } },
      ],
    };
    const button: ButtonNode = {
      id: 'button', type: 'button', x: 0, y: 0, w: 100, h: 44,
      props: { label: 'Open', variant: 'solid' },
      bindings: [{ target: 'button.label', value: { source: 'list-item', fieldId: 'action' } }],
    };
    const progress: ProgressNode = {
      id: 'progress', type: 'progress', x: 0, y: 0, w: 100, h: 20,
      props: { label: 'Progress', value: 0, indeterminate: false },
      bindings: [{ target: 'progress.value', value: { source: 'list-item', fieldId: 'progress' } }],
    };

    expect(resolveBoundText(image, 'image.source', item, image.props.src)).toBe('https://example.com/ada.png');
    expect(resolveBoundText(image, 'image.alt', item, image.props.alt)).toBe('Ada');
    expect(resolveBoundText(button, 'button.label', item, button.props.label)).toBe('42');
    expect(resolveBoundNumber(progress, 'progress.value', item, progress.props.value)).toBe(75);
  });
});
