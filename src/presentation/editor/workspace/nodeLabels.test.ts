import { describe, expect, it } from 'vitest';
import type { InputNode } from '@domain/entities/componentNode';
import { nodeDisplayLabel, nodeLayerName, NODE_TYPE_LABELS } from './nodeLabels';

function makeInput(overrides: Partial<InputNode> = {}): InputNode {
  return {
    id: 'node_input',
    type: 'input',
    x: 0,
    y: 0,
    w: 240,
    h: 56,
    props: {
      label: 'Field label',
      placeholder: 'Your title',
      inputType: 'text',
      multiline: false,
    },
    ...overrides,
  };
}

describe('nodeLabels', () => {
  it('uses the placeholder to name a Text field even when a label exists', () => {
    expect(nodeDisplayLabel(makeInput())).toBe('Your title');
    expect(nodeLayerName(makeInput())).toBe(`${NODE_TYPE_LABELS.input} — Your title`);
  });

  it('uses the placeholder when the field label is hidden', () => {
    const node = makeInput({
      props: { label: '', showLabel: false, placeholder: 'I’m thinking of……', inputType: 'text', multiline: false },
    });

    expect(nodeDisplayLabel(node)).toBe('I’m thinking of……');
  });

  it('falls back to the field label when the placeholder is blank', () => {
    const node = makeInput({ props: { label: 'Email', placeholder: '', inputType: 'email', multiline: false } });

    expect(nodeDisplayLabel(node)).toBe('Email');
  });

  it('uses a generic name when neither placeholder nor label is set', () => {
    const node = makeInput({ props: { label: '  ', placeholder: '', inputType: 'text', multiline: false } });

    expect(nodeDisplayLabel(node)).toBe('Untitled text field');
    expect(nodeLayerName(node)).toBe(`${NODE_TYPE_LABELS.input} — Untitled text field`);
  });

  it('keeps an explicit custom node name as the highest priority', () => {
    const node = makeInput({ name: 'Search box' });

    expect(nodeDisplayLabel(node)).toBe('Search box');
    expect(nodeLayerName(node)).toBe(`${NODE_TYPE_LABELS.input} — Search box`);
  });
});
