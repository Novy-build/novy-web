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
    onRename: vi.fn(),
    onToggleVisibility: vi.fn(),
    onToggleLock: vi.fn(),
    onMove: vi.fn(),
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
    expect(screen.getByTestId('layer-row-node_button')).toHaveClass('bg-brand-500/15');
    expect(screen.getByTestId('layer-row-node_button')).not.toHaveClass('bg-brand-50');
  });

  it('collapses and expands frame children', () => {
    renderLayers([makeContainer('frame', [makeButton('child')])]);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse Container — Frame' }));
    expect(screen.queryByTestId('layer-row-child')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand Container — Frame' }));
    expect(screen.getByTestId('layer-row-child')).toBeInTheDocument();
  });

  it('renames a layer inline on double-click', () => {
    const props = renderLayers([makeButton('node_button')]);
    const row = screen.getByTestId('layer-row-node_button');

    fireEvent.doubleClick(within(row).getByRole('button', { name: 'Button — Click me' }));
    const input = within(row).getByRole('textbox', { name: 'Rename Button — Click me' });
    fireEvent.change(input, { target: { value: 'Primary CTA' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(props.onRename).toHaveBeenCalledWith('node_button', 'Primary CTA');
  });

  it('toggles visibility and locking from layer controls', () => {
    const props = renderLayers([makeButton('node_button')], 'node_button');

    fireEvent.click(screen.getByRole('button', { name: 'Hide Button — Click me' }));
    expect(props.onToggleVisibility).toHaveBeenCalledWith('node_button');

    fireEvent.click(screen.getByRole('button', { name: 'Lock Button — Click me' }));
    expect(props.onToggleLock).toHaveBeenCalledWith('node_button');
  });

  it('provides visible hover/focus labels for icon controls', () => {
    renderLayers([makeButton('node_button')], 'node_button');

    expect(screen.getByRole('button', { name: 'Hide Button — Click me' })).toHaveAttribute('title', 'Hide layer');
    expect(screen.getByRole('button', { name: 'Lock Button — Click me' })).toHaveAttribute('title', 'Lock layer');
    expect(screen.getByText('Hide layer')).toHaveClass(
      'group-hover/layer-control:opacity-100',
      'group-focus-within/layer-control:opacity-100',
    );
  });

  it('drags a layer into a frame and supports keyboard nesting', () => {
    const props = renderLayers([makeButton('node_button'), makeContainer('frame')]);
    const source = screen.getByTestId('layer-row-node_button');
    const target = screen.getByTestId('layer-row-frame');
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: vi.fn(),
      getData: vi.fn(() => 'node_button'),
    };

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    expect(target).toHaveClass('ring-2');
    fireEvent.drop(target, { dataTransfer });
    expect(props.onMove).toHaveBeenCalledWith('node_button', 'frame', 'inside');

    fireEvent.keyDown(
      within(source).getByRole('button', { name: 'Button — Click me' }),
      { altKey: true, key: 'ArrowRight' },
    );
    expect(props.onMove).toHaveBeenLastCalledWith('node_button', 'frame', 'inside');
  });

  it('guides to the palette when empty', () => {
    renderLayers([]);

    expect(screen.getByRole('status')).toHaveTextContent('No components yet — add one from Assets.');
  });
});
