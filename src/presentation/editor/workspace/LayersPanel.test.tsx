import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentNode } from '@domain/entities/componentNode';
import { LayersPanel } from './LayersPanel';
import { makeButton, makeColumn, makeContainer, makeImage, makeListView, makeRow, makeText } from '@test/editorFixtures';

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

  it('lists Row and Column children in layout order while keeping stacks topmost-first', () => {
    const tree = [
      makeRow('node_row', [makeButton('row_first'), makeButton('row_second')]),
      makeColumn('node_column', [makeText('column_first', { props: { text: 'A', level: 'body' } }), makeText('column_second', { props: { text: 'B', level: 'body' } })]),
    ];
    renderLayers(tree);

    const rowIds = screen.getAllByTestId(/^layer-row-/).map((row) => row.dataset.testid);
    expect(rowIds).toEqual([
      'layer-row-node_column',
      'layer-row-column_first',
      'layer-row-column_second',
      'layer-row-node_row',
      'layer-row-row_first',
      'layer-row-row_second',
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

  it('keeps ListView template widgets hidden outside item design', () => {
    renderLayers([makeListView('list')]);

    expect(screen.getByTestId('layer-row-list')).toBeInTheDocument();
    expect(screen.queryByTestId('layer-row-list_item')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Collapse ListView/ })).not.toBeInTheDocument();
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

  it('reorders beside a ListView instead of nesting into its item template', () => {
    const props = renderLayers([makeButton('node_button'), makeListView('list')]);
    const source = screen.getByTestId('layer-row-node_button');
    const target = screen.getByTestId('layer-row-list');
    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: vi.fn(),
      getData: vi.fn(() => 'node_button'),
    };

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(props.onMove).toHaveBeenCalledWith('node_button', 'list', 'before');
  });

  it('guides to the palette when empty', () => {
    renderLayers([]);

    expect(screen.getByRole('status')).toHaveTextContent('No components yet — add one from Assets.');
  });
});
  
describe('LayersPanel item frame root', () => {
  it('renders a selectable item frame root above template children', () => {
    const frame = makeListView('frame_1');
    const props = {
      nodes: [makeText('node_text')],
      frame,
      selectedNodeId: 'frame_1',
      onSelect: vi.fn(),
      onOrder: vi.fn(),
      onRename: vi.fn(),
      onToggleVisibility: vi.fn(),
      onToggleLock: vi.fn(),
      onMove: vi.fn(),
    };
    render(<LayersPanel {...props} />);

    expect(screen.getByTestId('layer-row-frame_1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item frame' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('layer-row-node_text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rename/i })).not.toBeInTheDocument();
  });

  it('collapses the item frame children', () => {
    const frame = makeListView('frame_1');
    render(<LayersPanel frame={frame} nodes={[makeText('node_text')]} selectedNodeId={null} onSelect={vi.fn()} onOrder={vi.fn()} onRename={vi.fn()} onToggleVisibility={vi.fn()} onToggleLock={vi.fn()} onMove={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Item frame' }));
    expect(screen.queryByTestId('layer-row-node_text')).not.toBeInTheDocument();
  });

  it('uses layout-order wording for Row children', () => {
    renderLayers([makeRow('node_row', [makeButton('row_child')])]);

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Button — Click me' }));
    expect(screen.getByRole('menuitem', { name: 'Move to end' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Move to start' })).toBeInTheDocument();
  });

  it('opens a layer order menu and sends a node to front or back', () => {
    const props = renderLayers(
      [makeText('node_text'), makeButton('node_button'), makeImage('node_image')],
      'node_button',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Button — Click me' }));
    expect(screen.getByRole('menu', { name: 'Layer order for Button — Click me' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Bring to front' }));
    expect(props.onOrder).toHaveBeenLastCalledWith('node_button', 'front');
    expect(screen.queryByRole('menu', { name: 'Layer order for Button — Click me' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Button — Click me' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Send to back' }));
    expect(props.onOrder).toHaveBeenLastCalledWith('node_button', 'back');
  });

  it('disables boundary layer-order actions', () => {
    renderLayers([makeText('node_text'), makeButton('node_button')]);

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Button — Click me' }));
    expect(screen.getByRole('menuitem', { name: 'Bring to front' })).toBeDisabled();
    fireEvent.keyDown(document.body, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Text — Hello, World!' }));
    expect(screen.getByRole('menuitem', { name: 'Send to back' })).toBeDisabled();
  });

  it('closes the layer order menu on Escape or outside click', () => {
    renderLayers([makeButton('node_button')]);

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Button — Click me' }));
    expect(screen.getByRole('menu', { name: 'Layer order for Button — Click me' })).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Layer order for Button — Click me' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Layer order for Button — Click me' }));
    expect(screen.getByRole('menu', { name: 'Layer order for Button — Click me' })).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Layer order for Button — Click me' })).not.toBeInTheDocument();
  });

  it('sends a focused layer to front or back with Alt+Shift arrows', () => {
    const props = renderLayers([makeText('node_text'), makeButton('node_button')], 'node_button');
    const rowButton = within(screen.getByTestId('layer-row-node_button')).getByRole('button', {
      name: 'Button — Click me',
    });
    rowButton.focus();

    fireEvent.keyDown(rowButton, { key: 'ArrowUp', altKey: true, shiftKey: true });
    expect(props.onOrder).toHaveBeenLastCalledWith('node_button', 'front');

    fireEvent.keyDown(rowButton, { key: 'ArrowDown', altKey: true, shiftKey: true });
    expect(props.onOrder).toHaveBeenLastCalledWith('node_button', 'back');
  });
});