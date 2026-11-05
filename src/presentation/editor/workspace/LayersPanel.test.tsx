import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentNode } from '@domain/entities/componentNode';
import { LayersPanel } from './LayersPanel';
import { makeButton, makeContainer, makeText } from '@test/editorFixtures';

function renderLayers(nodes: readonly ComponentNode[], selectedNodeId: string | null = null) {
  const props = {
    nodes,
    selectedNodeId,
    onSelect: vi.fn(),
    onOrder: vi.fn(),
  };
  render(<LayersPanel {...props} />);
  return props;
}

describe('LayersPanel', () => {
  it('lists nodes topmost-first, with container children nested underneath', () => {
    const tree = [
      makeText('node_text'),
      makeButton('node_button'),
      makeContainer('node_container', [
        makeText('child_first', { props: { text: 'Inner A', level: 'body' } }),
        makeButton('child_second'),
      ]),
    ];
    renderLayers(tree);

    const rowIds = screen.getAllByTestId(/^layer-row-/).map((row) => row.dataset.testid);
    expect(rowIds).toEqual([
      'layer-row-node_container',
      'layer-row-child_second',
      'layer-row-child_first',
      'layer-row-node_button',
      'layer-row-node_text',
    ]);
  });

  it('selects a row on click', () => {
    const props = renderLayers([makeButton('node_button')], null);

    fireEvent.click(
      within(screen.getByTestId('layer-row-node_button')).getByRole('button', { name: 'Button — Click me' }),
    );

    expect(props.onSelect).toHaveBeenCalledWith('node_button');
  });

  it('reorders through forward and backward actions', () => {
    const props = renderLayers([makeText('node_text'), makeButton('node_button')], 'node_button');

    fireEvent.click(screen.getByRole('button', { name: 'Bring Button — Click me forward' }));
    expect(props.onOrder).toHaveBeenLastCalledWith('node_button', 'forward');

    fireEvent.click(screen.getByRole('button', { name: 'Send Text — Hello, World! backward' }));
    expect(props.onOrder).toHaveBeenLastCalledWith('node_text', 'backward');
  });

  it('marks the selected row as pressed', () => {
    renderLayers([makeButton('node_button')], 'node_button');

    const row = within(screen.getByTestId('layer-row-node_button')).getByRole('button', {
      name: 'Button — Click me',
    });
    expect(row).toHaveAttribute('aria-pressed', 'true');
  });

  it('guides to the palette when empty', () => {
    renderLayers([]);

    expect(screen.getByText('No components yet — add one from the palette.')).toBeInTheDocument();
  });
});
