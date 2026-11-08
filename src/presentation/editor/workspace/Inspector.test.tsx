import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EditorAction } from '../state/editorState';
import { Inspector } from './Inspector';
import { makeButton, makeColumn, makeContainer, makeImage, makeListView, makeText } from '@test/editorFixtures';
import type { DataCollection } from '@domain/entities/appData';

const COLLECTION: DataCollection = {
  id: 'collection_students',
  projectId: 'project_1',
  databaseId: 'database',
  name: 'Students',
  fields: [
    { id: 'field_name', key: 'name', label: 'Name', type: 'text', required: true },
    { id: 'field_email', key: 'email', label: 'Email', type: 'text', required: false },
  ],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function renderInspector(
  node: Parameters<typeof Inspector>[0]['node'],
  onOpenLogic = vi.fn(),
  behaviors: Parameters<typeof Inspector>[0]['behaviors'] = [],
  collections: readonly DataCollection[] = [],
  device: Parameters<typeof Inspector>[0]['device'] = 'mobile',
  onEditItemTemplate = vi.fn(),
  itemFrame: Parameters<typeof Inspector>[0]['itemFrame'] = null,
) {
  const onAction = vi.fn<(action: EditorAction) => void>();
  render(<Inspector behaviors={behaviors} collections={collections} device={device} itemFrame={itemFrame} node={node} onAction={onAction} onEditItemTemplate={onEditItemTemplate} onOpenLogic={onOpenLogic} />);
  return { onAction, onOpenLogic, onEditItemTemplate };
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
      type: 'node/layout-position',
      nodeId: 'node_1',
      x: 200,
      y: 96,
    });

    fireEvent.change(screen.getByLabelText('Y'), { target: { value: '32' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/layout-position',
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
      type: 'node/layout-size',
      nodeId: 'node_1',
      w: 300,
      h: 44,
    });

    fireEvent.change(screen.getByLabelText('Height'), { target: { value: '60' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/layout-size',
      nodeId: 'node_1',
      w: 160,
      h: 60,
    });
  });

  it('edits typed appearance values', () => {
    const { onAction } = renderInspector(makeButton('node_1'));

    fireEvent.change(screen.getByLabelText('Background'), { target: { value: '#112233' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance',
      nodeId: 'node_1',
      appearance: { backgroundColor: '#112233' },
    });

    fireEvent.change(screen.getByLabelText('Corner radius'), { target: { value: '18' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance',
      nodeId: 'node_1',
      appearance: { borderRadius: 18 },
    });
  });

  it('shows effective desktop geometry and resets responsive overrides', () => {
    const node = makeButton('node_1', {
      responsive: { desktop: { x: 420, y: 64, w: 240, h: 52 } },
    });
    const { onAction } = renderInspector(node, vi.fn(), [], [], 'desktop');

    expect(screen.getByLabelText('X')).toHaveValue(420);
    expect(screen.getByLabelText('Width')).toHaveValue(240);
    fireEvent.click(screen.getByRole('button', { name: 'Reset responsive overrides' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'node/responsive-reset', nodeId: 'node_1' });
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

  it('edits ListView static items line by line', () => {
    const { onAction } = renderInspector(makeListView('node_1'));

    fireEvent.change(screen.getByLabelText('Static items'), { target: { value: 'Alpha\nBeta\nGamma' } });

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-listview',
      nodeId: 'node_1',
      props: {
        dataSource: {
          kind: 'static',
          fields: [{ id: 'value', label: 'Value', type: 'text' }],
          items: [
            { id: 'first', values: { value: 'Alpha' } },
            { id: 'second', values: { value: 'Beta' } },
            { id: 'node_1__static_3', values: { value: 'Gamma' } },
          ],
        },
      },
    });
  });

  it('opens the dedicated ListView item design scope', () => {
    const onEditItemTemplate = vi.fn();
    renderInspector(makeListView('node_1'), vi.fn(), [], [], 'mobile', onEditItemTemplate);
    fireEvent.click(screen.getByRole('button', { name: 'Edit item design' }));
    expect(onEditItemTemplate).toHaveBeenCalledWith('node_1');
  });

  it('hides item frame fields outside item design', () => {
    renderInspector(makeListView('node_1'));

    expect(screen.queryByLabelText('Item padding')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Item spacing')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Item border radius')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Show dividers')).not.toBeInTheDocument();
  });

  it('edits the repeated item frame only while item design is open', () => {
    const { onAction } = renderInspector(makeListView('list_frame'), vi.fn(), [], [], 'mobile', vi.fn(), makeListView('list_frame'));

    fireEvent.change(screen.getByLabelText('Item padding'), { target: { value: '12' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-listview',
      nodeId: 'list_frame',
      props: { padding: 12 },
    });

    fireEvent.change(screen.getByLabelText('Item spacing'), { target: { value: '10' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-listview',
      nodeId: 'list_frame',
      props: { itemSpacing: 10 },
    });

    fireEvent.change(screen.getByLabelText('Item border radius'), { target: { value: '16' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-listview',
      nodeId: 'list_frame',
      props: { itemBorderRadius: 16 },
    });

    const checkbox = screen.getByLabelText('Show dividers');
    fireEvent.click(checkbox);
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-listview',
      nodeId: 'list_frame',
      props: { showDividers: false },
    });

    expect(screen.queryByLabelText('Template widget gap')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cross axis alignment')).not.toBeInTheDocument();
  });

  it('edits structured static fields and commits them in one action', () => {
    const { onAction } = renderInspector(makeListView('node_1'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit structured items' }));
    const dialog = screen.getByRole('dialog', { name: 'Static ListView items' });
    fireEvent.change(within(dialog).getByLabelText('Field 1 label'), { target: { value: 'Title' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save items' }));

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-listview',
      nodeId: 'node_1',
      props: {
        dataSource: {
          kind: 'static',
          fields: [{ id: 'value', label: 'Title', type: 'text' }],
          items: [
            { id: 'first', values: { value: 'First' } },
            { id: 'second', values: { value: 'Second' } },
          ],
        },
      },
    });
  });

  it('binds a ListView to a collection display field', () => {
    const { onAction } = renderInspector(makeListView('node_list'), vi.fn(), [], [COLLECTION]);
    fireEvent.change(screen.getByLabelText('Data source'), { target: { value: 'collection' } });

    expect(onAction).toHaveBeenCalledWith({
      type: 'node/props-listview',
      nodeId: 'node_list',
      props: {
        dataSource: {
          kind: 'collection',
          collectionId: 'collection_students',
          displayFieldIds: ['field_name'],
        },
      },
    });
  });

  it('edits Column axis alignment and spacing', () => {
    const { onAction } = renderInspector(makeColumn('node_column'));

    fireEvent.change(screen.getByLabelText('Main axis alignment'), { target: { value: 'space-between' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-column',
      nodeId: 'node_column',
      props: { mainAxisAlignment: 'space-between' },
    });

    fireEvent.change(screen.getByLabelText('Gap'), { target: { value: '20' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-column',
      nodeId: 'node_column',
      props: { gap: 20 },
    });
  });

  it('describes containers as content-free and offers Logic handoff', () => {
    const { onAction, onOpenLogic } = renderInspector(makeContainer('node_1'));

    expect(screen.getByText('Containers keep free-form child positioning.')).toBeInTheDocument();
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

  it('lists the click bindings of the selected node in the Behavior section', () => {
    const bound = [
      { id: 'behavior_1', name: 'On click — Click me', event: 'click' as const, graphId: 'graph_1', targetNodeId: 'node_1' },
      { id: 'behavior_2', name: 'On load — Screen', event: 'load' as const, graphId: 'graph_2', targetNodeId: 'node_other' },
    ];
    renderInspector(makeButton('node_1'), vi.fn(), bound);

    const list = screen.getByTestId('bound-behaviors');
    expect(list).toHaveTextContent('On click');
    expect(list).not.toHaveTextContent('On load'); // bound to a different node
  });

  it('keeps the Behavior section lean for nodes without bindings', () => {
    renderInspector(makeButton('node_1'));

    expect(screen.queryByTestId('bound-behaviors')).not.toBeInTheDocument();
  });
});
