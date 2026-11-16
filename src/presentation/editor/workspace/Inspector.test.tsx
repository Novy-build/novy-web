import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EditorAction } from '../state/editorState';
import { Inspector } from './Inspector';
import { makeButton, makeColumn, makeContainer, makeImage, makeListView, makeText } from '@test/editorFixtures';
import type { DataCollection } from '@domain/entities/appData';
import { createPadding } from '@domain/entities/componentNode';
import { createComponentNode } from '@domain/factories/componentNode';
import { measureSectionHeight } from '@domain/sections/sectionLayout';

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

const PINNED_COLLECTION: DataCollection = {
  ...COLLECTION,
  id: 'collection_tasks',
  name: 'Tasks',
  fields: [
    ...COLLECTION.fields,
    { id: 'field_pinned', key: 'pinned', label: 'Pinned', type: 'boolean', required: false },
  ],
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
  it('offers a reusable actions-menu presentation and accepts newline-separated options', () => {
    const node = createComponentNode('dropdown');
    const { onAction } = renderInspector(node);
    fireEvent.change(screen.getByLabelText('Presentation'), { target: { value: 'menu' } });
    expect(onAction).toHaveBeenCalledWith({ type: 'node/props-dropdown', nodeId: node.id, props: { presentation: 'menu' } });
    fireEvent.change(screen.getByLabelText('Options'), { target: { value: 'Edit\nDelete\n' } });
    expect(onAction).toHaveBeenCalledWith({ type: 'node/props-dropdown', nodeId: node.id, props: { options: ['Edit', 'Delete', ''] } });
  });

  it('can configure a switch to control the previewed app theme', () => {
    const node = createComponentNode('switch');
    const { onAction } = renderInspector(node);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Control app light/dark theme' }));
    expect(onAction).toHaveBeenCalledWith({ type: 'node/props-switch', nodeId: node.id, props: { controlsTheme: true } });
  });

  it('edits dark-theme colors without replacing the base appearance', () => {
    const node = makeButton('button', { appearance: { backgroundColor: '#ffffff' } });
    const { onAction } = renderInspector(node);
    fireEvent.click(screen.getByText('Dark theme colors'));
    fireEvent.change(screen.getByLabelText('Dark background'), { target: { value: '#222222' } });
    expect(onAction).toHaveBeenCalledWith({ type: 'node/appearance', nodeId: node.id, appearance: { backgroundColor: '#ffffff', dark: { backgroundColor: '#222222' } } });
  });

  it('binds item Text content to a collection field through the Inspector', () => {
    const node = makeText('note_title');
    const onAction = vi.fn<(action: EditorAction) => void>();
    render(<Inspector behaviors={[]} listItemFields={COLLECTION.fields} node={node} onAction={onAction} onOpenLogic={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Text content' }), { target: { value: 'field_name' } });
    expect(onAction).toHaveBeenCalledWith({
      type: 'node/bindings', nodeId: node.id,
      bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'field_name' } }],
    });
  });

  it('labels item bindings by property and field type instead of using one static option', () => {
    const node = makeText('note_title');
    render(<Inspector behaviors={[]} listItemFields={COLLECTION.fields} listItemSourceName="Students" node={node} onAction={vi.fn()} onOpenLogic={vi.fn()} />);

    const textContent = screen.getByRole('combobox', { name: 'Text content' });
    expect(textContent).toHaveDisplayValue('Fixed text');
    expect(within(textContent).getByRole('option', { name: 'Name (Text)' })).toBeInTheDocument();
    expect(screen.getByText('Item data · Students')).toBeInTheDocument();
    expect(screen.getByText('Always visible')).toBeInTheDocument();
    expect(screen.getByText('Add a Yes/No field to show or hide this per item.')).toBeInTheDocument();
  });

  it('offers a boolean field for Visibility when the item source has one', () => {
    const node = makeContainer('card');
    const onAction = vi.fn<(action: EditorAction) => void>();
    render(<Inspector behaviors={[]} listItemFields={PINNED_COLLECTION.fields} listItemSourceName="Tasks" node={node} onAction={onAction} onOpenLogic={vi.fn()} />);

    const visibility = screen.getByRole('combobox', { name: 'Visibility' });
    expect(visibility).toHaveDisplayValue('Always visible');
    fireEvent.change(visibility, { target: { value: 'field_pinned' } });
    expect(onAction).toHaveBeenCalledWith({
      type: 'node/bindings', nodeId: node.id,
      bindings: [{ target: 'component.visible', value: { source: 'list-item', fieldId: 'field_pinned' } }],
    });
  });
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

  it('adds a curated button icon and reveals its position control', () => {
    const { onAction } = renderInspector(makeButton('node_1'));

    expect(screen.queryByLabelText('Icon position')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Button icon'), { target: { value: 'check' } });

    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-button',
      nodeId: 'node_1',
      props: { icon: 'check' },
    });
  });

  it('changes the icon position, including center, and removes icon data without discarding content', () => {
    const { onAction } = renderInspector(makeButton('node_1', {
      props: { label: 'Save', variant: 'solid', icon: 'check', iconPosition: 'right' },
    }));

    const position = screen.getByLabelText('Icon position');
    expect(position).toHaveValue('right');
    expect(within(position).getByRole('option', { name: 'Center' })).toBeInTheDocument();
    fireEvent.change(position, { target: { value: 'center' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-button',
      nodeId: 'node_1',
      props: { iconPosition: 'center' },
    });

    fireEvent.change(screen.getByLabelText('Button icon'), { target: { value: '' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-button',
      nodeId: 'node_1',
      props: { icon: undefined, iconPosition: undefined },
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

  it('sets base and dark appearance colors through the color pickers', () => {
    const node = makeButton('node_1', {
      appearance: {
        backgroundColor: '#ffffff',
        dark: { textColor: '#eeeeee', backgroundColor: '#123456' },
      },
    });
    const { onAction } = renderInspector(node);

    fireEvent.change(screen.getByLabelText('Background picker'), { target: { value: '#112233' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance',
      nodeId: 'node_1',
      appearance: {
        backgroundColor: '#112233',
        dark: { textColor: '#eeeeee', backgroundColor: '#123456' },
      },
    });

    fireEvent.click(screen.getByText('Dark theme colors'));
    fireEvent.change(screen.getByLabelText('Dark background picker'), { target: { value: '#000000' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance',
      nodeId: 'node_1',
      appearance: {
        backgroundColor: '#ffffff',
        dark: { textColor: '#eeeeee', backgroundColor: '#000000' },
      },
    });
  });

  it('edits the border style for Column and Row layout nodes', () => {
    const node = makeColumn('column_1', [], {
      appearance: { backgroundColor: '#ffffff', borderColor: '#112233' },
    });
    const { onAction } = renderInspector(node);

    const group = screen.getByRole('group', { name: 'Border style' });
    expect(within(group).getByRole('button', { name: 'Dashed' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(group).getByRole('button', { name: 'None' }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance',
      nodeId: 'column_1',
      appearance: { backgroundColor: '#ffffff', borderColor: '#112233', borderStyle: 'none' },
    });
  });

  it('shows the solid border default for Container layout nodes', () => {
    const container = makeContainer('container_1');
    const { onAction } = renderInspector(container);

    const group = screen.getByRole('group', { name: 'Border style' });
    expect(within(group).getByRole('button', { name: 'Solid' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(group).getByRole('button', { name: 'Dashed' }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance',
      nodeId: 'container_1',
      appearance: { borderStyle: 'dashed' },
    });
  });

  it('hides the border style control for non-layout nodes', () => {
    renderInspector(makeText('text_1'));
    expect(screen.queryByRole('group', { name: 'Border style' })).not.toBeInTheDocument();
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

  it('shows the measured height as the effective height for a website section', () => {
    const node = makeColumn('section_1');
    const onAction = vi.fn<(action: EditorAction) => void>();

    render(
      <Inspector
        behaviors={[]}
        device="desktop"
        isWebsiteSection
        node={node}
        onAction={onAction}
        onOpenLogic={vi.fn()}
      />,
    );

    expect(screen.getByTestId('inspector-measured-height')).toHaveTextContent(
      `Measured height (effective): ${measureSectionHeight(node, 'desktop')} px`,
    );
  });

  it('hides the measured height for app columns and non-column nodes', () => {
    renderInspector(makeColumn('column_1'));
    expect(screen.queryByTestId('inspector-measured-height')).not.toBeInTheDocument();

    render(<Inspector behaviors={[]} isWebsiteSection node={makeButton('button_1')} onAction={vi.fn()} onOpenLogic={vi.fn()} />);
    expect(screen.queryByTestId('inspector-measured-height')).not.toBeInTheDocument();
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

  it('edits and clears text font family, size, and weight overrides', () => {
    const { onAction } = renderInspector(makeText('node_1', {
      props: { text: 'Hello, World!', level: 'body', fontFamily: 'Inter', fontSize: 20, fontWeight: 'bold' },
    }));

    fireEvent.change(screen.getByLabelText('Font family'), { target: { value: 'Georgia, serif' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { fontFamily: 'Georgia, serif' },
    });

    fireEvent.change(screen.getByLabelText('Font size (px)'), { target: { value: '32' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { fontSize: 32 },
    });

    fireEvent.change(screen.getByLabelText('Font weight'), { target: { value: 'semibold' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { fontWeight: 'semibold' },
    });

    fireEvent.change(screen.getByLabelText('Font size (px)'), { target: { value: '' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { fontSize: undefined },
    });

    fireEvent.change(screen.getByLabelText('Font weight'), { target: { value: '' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { fontWeight: undefined },
    });

    fireEvent.change(screen.getByLabelText('Font family'), { target: { value: '   ' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-text',
      nodeId: 'node_1',
      props: { fontFamily: undefined },
    });
  });

  it('toggles Text field labels and configures the full field border', () => {
    const node = createComponentNode('input');
    if (node.type !== 'input') throw new Error('Expected input node');
    node.props.showLabel = false;
    node.appearance = { borderColor: '#334155', borderStyle: 'solid', borderWidth: 1, borderRadius: 6 };
    const { onAction } = renderInspector(node);

    expect(screen.getByLabelText('Field label')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show field label' }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-input', nodeId: node.id, props: { showLabel: true },
    });

    fireEvent.click(within(screen.getByRole('group', { name: 'Border style' })).getByRole('button', { name: 'Dashed' }));
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance', nodeId: node.id,
      appearance: { borderColor: '#334155', borderStyle: 'dashed', borderWidth: 1, borderRadius: 6 },
    });

    fireEvent.change(screen.getByLabelText('Border width'), { target: { value: '4' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/appearance', nodeId: node.id,
      appearance: { borderColor: '#334155', borderStyle: 'solid', borderWidth: 4, borderRadius: 6 },
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
      props: { padding: createPadding(12) },
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

  it('binds a ListView to a collection with a sensible default record label', () => {
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

  it('keeps the ListView record label optional and independent from the item design', () => {
    const list = makeListView('node_list', {
      props: {
        ...makeListView('node_list').props,
        dataSource: { kind: 'collection', collectionId: COLLECTION.id, displayFieldIds: ['field_name'] },
      },
    });
    const { onAction } = renderInspector(list, vi.fn(), [], [COLLECTION]);

    expect(screen.queryByLabelText('Primary display field')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Record label')).toHaveDisplayValue('Name (Text)');
    expect(screen.getByText('Optional. Used for menus and screen readers; your item design stays unchanged.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Record label'), { target: { value: '' } });
    expect(onAction).toHaveBeenLastCalledWith({
      type: 'node/props-listview',
      nodeId: 'node_list',
      props: {
        dataSource: {
          kind: 'collection',
          collectionId: COLLECTION.id,
          displayFieldIds: [],
        },
      },
    });
  });

  it('edits the backend-generated item ID name from a collection ListView', async () => {
    const list = makeListView('node_list', {
      props: {
        ...makeListView('node_list').props,
        dataSource: { kind: 'collection', collectionId: COLLECTION.id, displayFieldIds: ['field_name'] },
      },
    });
    const onRecordIdentifierChange = vi.fn(async () => undefined);
    render(
      <Inspector
        behaviors={[]}
        collections={[COLLECTION]}
        node={list}
        onAction={vi.fn()}
        onOpenLogic={vi.fn()}
        onRecordIdentifierChange={onRecordIdentifierChange}
        recordRoutePaths={['/students/:studentId']}
      />,
    );

    const input = screen.getByLabelText('Item ID name');
    expect(input).toHaveValue('studentId');
    expect(screen.getByText('Linked route: /students/:studentId')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'learnerId' } });
    fireEvent.blur(input);
    await waitFor(() => expect(onRecordIdentifierChange).toHaveBeenCalledWith(COLLECTION.id, 'learnerId'));
  });

  it('shows the item ID name on the focused ListView item frame', () => {
    const list = makeListView('node_list', {
      props: {
        ...makeListView('node_list').props,
        dataSource: { kind: 'collection', collectionId: COLLECTION.id, displayFieldIds: ['field_name'] },
      },
    });
    render(
      <Inspector
        behaviors={[]}
        itemCollection={COLLECTION}
        itemFrame={list}
        node={list}
        onAction={vi.fn()}
        onOpenLogic={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Item ID name')).toHaveValue('studentId');
    expect(screen.getByText(/backend generates a unique value/i)).toBeInTheDocument();
  });

  it('explains how to connect records when no collections exist', () => {
    const list = makeListView('node_list', {
      props: {
        ...makeListView('node_list').props,
        dataSource: { kind: 'collection', collectionId: '', displayFieldIds: [] },
      },
    });
    renderInspector(list);

    expect(screen.getByText('No collections yet. Create one in the Data workspace.')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Wrap with Gesture Detector' })).not.toBeInTheDocument();
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
