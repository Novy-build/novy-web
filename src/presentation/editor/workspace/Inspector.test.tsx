import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EditorAction } from '../state/editorState';
import { Inspector } from './Inspector';
import { makeButton, makeContainer, makeImage, makeList, makeText } from '@test/editorFixtures';

function renderInspector(node: Parameters<typeof Inspector>[0]['node'], onOpenLogic = vi.fn()) {
  const onAction = vi.fn<(action: EditorAction) => void>();
  render(<Inspector node={node} onAction={onAction} onOpenLogic={onOpenLogic} />);
  return { onAction, onOpenLogic };
}

describe('Inspector', () => {
  it('hints to select a component when nothing is selected', () => {
    renderInspector(null);

    expect(screen.getByText('Select a component on the canvas to edit its content, layout, and appearance.')).toBeInTheDocument();
  });

  it('edits button content and dispatches a typed patch', () => {
    const { onAction } = renderInspector(makeButton('node_1'));

    expect(screen.getByRole('heading', { name: 'Button' })).toBeInTheDocument();
    const label = screen.getByLabelText('Button label');
    expect(label).toHaveValue('Click me');
    fireEvent.change(label, { target: { value: 'Get started' } });

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-button',
      nodeId: 'node_1',
      props: { label: 'Get started' },
    });
  });

  it('switches the button variant from Appearance', () => {
    const { onAction } = renderInspector(makeButton('node_1'));

    const group = screen.getByRole('group', { name: 'Button variant' });
    expect(within(group).getByRole('button', { name: 'Solid' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Outline' }));

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-button',
      nodeId: 'node_1',
      props: { variant: 'outline' },
    });
  });

  it('moves nodes through the X/Y layout fields', () => {
    const node = makeButton('node_1', { x: 88, y: 96 });
    const { onAction } = renderInspector(node);

    fireEvent.change(screen.getByLabelText('X'), { target: { value: '200' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/move',
      nodeId: 'node_1',
      x: 200,
      y: 96,
    });

    fireEvent.change(screen.getByLabelText('Y'), { target: { value: '32' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/move',
      nodeId: 'node_1',
      x: 88,
      y: 32,
    });
  });

  it('resizes nodes through the W/H layout fields', () => {
    const node = makeButton('node_1', { w: 160, h: 44 });
    const { onAction } = renderInspector(node);

    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '300' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/resize',
      nodeId: 'node_1',
      geometry: { x: 120, y: 560, w: 300, h: 44 },
    });

    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '60' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/resize',
      nodeId: 'node_1',
      geometry: { x: 120, y: 560, w: 160, h: 60 },
    });
  });

  it('ignores non-numeric layout input', () => {
    const { onAction } = renderInspector(makeButton('node_1'));

    fireEvent.change(screen.getByLabelText('X'), { target: { value: '' } });
    expect(onAction).not.toHaveBeenCalled();
  });

  it('edits text levels for text nodes', () => {
    const { onAction } = renderInspector(makeText('node_1'));

    const group = screen.getByRole('group', { name: 'Text level' });
    fireEvent.click(within(group).getByRole('button', { name: 'Title' }));

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { level: 'title' },
    });
  });

  it('edits image source, alt text, and fit', () => {
    const { onAction } = renderInspector(makeImage('node_1'));

    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://x.test/a.png' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-image',
      nodeId: 'node_1',
      props: { src: 'https://x.test/a.png' },
    });

    fireEvent.change(screen.getByLabelText('Alt text'), { target: { value: 'Mountain' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-image',
      nodeId: 'node_1',
      props: { alt: 'Mountain' },
    });

    fireEvent.click(within(screen.getByRole('group', { name: 'Image fit' })).getByRole('button', { name: 'Contain' }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-image',
      nodeId: 'node_1',
      props: { fit: 'contain' },
    });
  });

  it('edits list items line by line', () => {
    const { onAction } = renderInspector(makeList('node_1'));

    fireEvent.change(screen.getByLabelText('List items'), { target: { value: 'Alpha\nBeta\nGamma' } });

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-list',
      nodeId: 'node_1',
      props: { items: ['Alpha', 'Beta', 'Gamma'] },
    });
  });

  it('describes containers as content-free and offers Logic handoff', () => {
    const { onAction, onOpenLogic } = renderInspector(makeContainer('node_1'));

    expect(screen.getByText('Containers have no content options in the MVP.')).toBeInTheDocument();
    expect(screen.getByText('Fixed for the MVP.')).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open Logic mode' }));
    expect(onOpenLogic).toHaveBeenCalledTimes(1);
  });

  it('opens Logic mode for any selected node', () => {
    const { onOpenLogic } = renderInspector(makeButton('node_1'));

    fireEvent.click(screen.getByRole('button', { name: 'Open Logic mode' }));
    expect(onOpenLogic).toHaveBeenCalledTimes(1);
  });
});
