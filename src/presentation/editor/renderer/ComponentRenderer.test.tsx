import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ButtonNode, CameraNode, ColumnNode, ComponentNode, ContainerNode, GestureDetectorNode, ImageNode, InputNode, ListViewNode, RowNode } from '@domain/entities/componentNode';
import { createEdgePadding, createPadding } from '@domain/entities/componentNode';
import type { Screen } from '@domain/entities/screen';
import type { DataCollection, DataRecord } from '@domain/entities/appData';
import { ComponentRenderer } from './ComponentRenderer';
import { CANVAS_PRESETS, ScreenFrame } from './ScreenFrame';
import { makeColumn, makeContainer, makeListView, makeText } from '@test/editorFixtures';

const BUTTON: ButtonNode = {
  id: 'node_save',
  type: 'button',
  x: 10,
  y: 20,
  w: 120,
  h: 44,
  props: { label: 'Save', variant: 'solid' },
};

describe('ComponentRenderer', () => {
  it('renders a button with its label in canvas mode', () => {
    render(<ComponentRenderer mode="canvas" node={BUTTON} selected={false} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders a decorative icon on the configured side of the button label', () => {
    const node: ButtonNode = {
      ...BUTTON,
      props: { ...BUTTON.props, icon: 'check' },
    };
    const { rerender } = render(<ComponentRenderer mode="canvas" node={node} selected={false} />);

    const button = screen.getByRole('button', { name: 'Save' });
    const icon = button.querySelector('[data-button-icon="check"]');
    expect(button).toHaveAccessibleName('Save');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(button.firstElementChild?.firstElementChild).toBe(icon);

    rerender(<ComponentRenderer mode="canvas" node={{ ...node, props: { ...node.props, iconPosition: 'right' } }} selected={false} />);
    const rightButton = screen.getByRole('button', { name: 'Save' });
    const rightIcon = rightButton.querySelector('[data-button-icon="check"]');
    expect(rightIcon).not.toBeNull();
    expect(rightButton.firstElementChild?.lastElementChild).toBe(rightIcon);
  });

  it('centers an icon while keeping the button label accessible', () => {
    const node: ButtonNode = {
      ...BUTTON,
      props: { ...BUTTON.props, icon: 'check', iconPosition: 'center' },
    };
    render(<ComponentRenderer mode="canvas" node={node} selected={false} />);

    const button = screen.getByRole('button', { name: 'Save' });
    const icon = button.querySelector('[data-button-icon="check"]');
    const label = screen.getByText('Save');
    expect(icon).not.toBeNull();
    expect(label).toHaveClass('sr-only');
    expect(button).toHaveAccessibleName('Save');
  });

  it('keeps button icons in static thumbnail rendering', () => {
    const node: ButtonNode = {
      ...BUTTON,
      props: { ...BUTTON.props, icon: 'mail', iconPosition: 'right' },
    };
    const { container } = render(<ComponentRenderer mode="thumbnail" node={node} selected={false} />);

    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('[data-button-icon="mail"]')).not.toBeNull();
  });

  it('applies text font size and weight overrides with a proportional line height', () => {
    const node = makeText('text_override', {
      props: { text: 'Custom type', level: 'title', fontSize: 32, fontWeight: 'bold' },
    });
    const { rerender } = render(<ComponentRenderer mode="canvas" node={node} selected={false} />);

    const paragraph = screen.getByText('Custom type');
    expect(paragraph).toHaveStyle({ fontSize: '32px', fontWeight: '700', lineHeight: '1.25' });

    rerender(<ComponentRenderer mode="canvas" node={makeText('text_override', {
      props: { text: 'Custom type', level: 'title' },
    })} selected={false} />);
    const preset = screen.getByText('Custom type');
    expect(preset.style.fontSize).toBe('');
    expect(preset.style.fontWeight).toBe('');
    expect(preset.className).toContain('text-lg');
  });

  it('positions nodes absolutely by geometry', () => {
    const { container } = render(<ComponentRenderer mode="canvas" node={BUTTON} selected={false} />);

    const frame = container.querySelector('[data-node-id="node_save"]');
    expect(frame).not.toBeNull();
    expect(frame).toHaveStyle({ left: '10px', top: '20px', width: '120px', height: '44px' });
  });

  it('renders typed appearance and active responsive geometry', () => {
    const node: ButtonNode = {
      ...BUTTON,
      appearance: {
        backgroundColor: '#112233',
        textColor: '#ffffff',
        borderRadius: 14,
        opacity: 0.8,
      },
      responsive: { desktop: { x: 320, y: 80, w: 240, h: 52 } },
    };
    const { container } = render(
      <ComponentRenderer breakpoint="desktop" mode="preview" node={node} selected={false} />,
    );

    expect(container.querySelector('[data-node-id="node_save"]')).toHaveStyle({
      left: '320px',
      top: '80px',
      width: '240px',
      height: '52px',
      backgroundColor: '#112233',
      color: '#ffffff',
      borderRadius: '14px',
      opacity: '0.8',
    });
  });

  it('marks the selected node in canvas mode', () => {
    render(<ComponentRenderer mode="canvas" node={BUTTON} selected />);

    const frame = screen.getByRole('button', { name: 'Save' }).closest('[data-node-id]');
    expect(frame).toHaveAttribute('data-selected', 'true');
  });

  it('keeps solid borders for appearance values saved before border styles', () => {
    const node: ButtonNode = {
      ...BUTTON,
      appearance: { borderColor: '#112233' },
    };
    const { container } = render(<ComponentRenderer mode="canvas" node={node} selected={false} />);

    expect(container.querySelector('[data-node-id="node_save"]')).toHaveStyle({
      borderColor: '#112233',
      borderStyle: 'solid',
      borderWidth: '1px',
    });
  });

  it('applies dashed, solid, and none border styles to layout frames and shells', () => {
    const column = makeColumn('border_column', [], { appearance: { borderStyle: 'dashed' } });
    const { container, rerender } = render(<ComponentRenderer mode="canvas" node={column} selected={false} />);

    const frame = (): HTMLElement => container.querySelector('[data-node-id="border_column"]') as HTMLElement;
    const shell = (): HTMLElement => frame().querySelector('[data-layout-direction="column"]') as HTMLElement;

    expect(frame()).toHaveStyle({ borderStyle: 'dashed', borderWidth: '1px' });
    expect(shell()).toHaveStyle({ borderStyle: 'dashed' });

    rerender(<ComponentRenderer mode="canvas" node={{ ...column, appearance: { borderStyle: 'solid' } }} selected={false} />);
    expect(frame()).toHaveStyle({ borderStyle: 'solid' });
    expect(shell()).toHaveStyle({ borderStyle: 'solid' });

    rerender(<ComponentRenderer mode="canvas" node={{ ...column, appearance: { borderStyle: 'none' } }} selected={false} />);
    expect(frame()).toHaveStyle({ borderStyle: 'none', borderWidth: '0px' });
    expect(shell()).toHaveStyle({ borderStyle: 'none' });
  });

  it('applies border styles to Container shells', () => {
    const node = makeContainer('border_container', [], {
      appearance: { borderColor: '#112233', borderStyle: 'dashed' },
    });
    const { container } = render(<ComponentRenderer mode="canvas" node={node} selected={false} />);
    const frame = container.querySelector('[data-node-id="border_container"]') as HTMLElement;

    expect(frame).toHaveStyle({ borderColor: '#112233', borderStyle: 'dashed', borderWidth: '1px' });
    expect(frame.firstElementChild).toHaveStyle({ borderStyle: 'dashed' });
  });

  it('reports clicks on the node in canvas mode', () => {
    const onSelect = vi.fn();
    render(<ComponentRenderer mode="canvas" node={BUTTON} selected={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).toHaveBeenCalledWith('node_save');
  });

  it('is inert in preview mode', () => {
    const onSelect = vi.fn();
    render(<ComponentRenderer mode="preview" node={BUTTON} selected={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('fires onNodeAction with the node id when a preview node is clicked', () => {
    const onNodeAction = vi.fn();
    render(<ComponentRenderer mode="preview" node={BUTTON} selected={false} onNodeAction={onNodeAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onNodeAction).toHaveBeenCalledTimes(1);
    expect(onNodeAction).toHaveBeenCalledWith('node_save');
  });

  it('never wires runtime clicks in canvas or thumbnail mode', () => {
    const onNodeAction = vi.fn();

    const canvas = render(
      <ComponentRenderer mode="canvas" node={BUTTON} selected={false} onSelect={vi.fn()} onNodeAction={onNodeAction} />,
    );
    canvas.unmount();
    render(<ComponentRenderer mode="thumbnail" node={BUTTON} selected={false} onNodeAction={onNodeAction} />);

    fireEvent.click(screen.getByText('Save'));

    expect(onNodeAction).not.toHaveBeenCalled();
  });

  it('clicks without a runtime hook are harmless no-ops', () => {
    render(<ComponentRenderer mode="preview" node={BUTTON} selected={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });

  it('renders widgets statically in thumbnail mode to keep tiles valid HTML', () => {
    render(<ComponentRenderer mode="thumbnail" node={BUTTON} selected={false} />);

    // A clickable tile already owns the button role; nesting a widget
    // button inside it is invalid HTML and breaks React hydration.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('omits the input widget from thumbnail tiles', () => {
    const input: InputNode = {
      id: 'node_email',
      type: 'input',
      x: 0,
      y: 0,
      w: 180,
      h: 60,
      props: { label: 'Email', placeholder: 'you@school.edu', inputType: 'email', multiline: false },
    };

    render(<ComponentRenderer mode="thumbnail" node={input} selected={false} />);

    expect(screen.queryByPlaceholderText('you@school.edu')).not.toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('dispatches preview change events with the current input value', () => {
    const input: InputNode = {
      id: 'node_email',
      type: 'input',
      x: 0,
      y: 0,
      w: 180,
      h: 60,
      props: { label: 'Email', placeholder: 'you@school.edu', inputType: 'email', multiline: false },
    };
    const onNodeEvent = vi.fn();
    render(
      <ComponentRenderer
        mode="preview"
        node={input}
        onNodeEvent={onNodeEvent}
        selected={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    expect(onNodeEvent).toHaveBeenCalledWith('node_email', 'change', 'ada@example.com');
  });

  it('renders container children relative to the container', () => {
    const card: ContainerNode = {
      id: 'node_card',
      type: 'container',
      x: 24,
      y: 24,
      w: 220,
      h: 120,
      props: {},
      children: [
        {
          id: 'node_child',
          type: 'text',
          x: 12,
          y: 16,
          w: 120,
          h: 24,
          props: { text: 'Inside card', level: 'body' },
        },
      ],
    };

    const { container } = render(<ComponentRenderer mode="canvas" node={card} selected={false} />);
    const childFrame = container.querySelector('[data-node-id="node_child"]');

    expect(container.querySelector('[data-node-id="node_card"]')).not.toBeNull();
    expect(childFrame).toHaveStyle({ left: '12px', top: '16px' });
    expect(screen.getByText('Inside card')).toBeInTheDocument();
  });

  it('clicking a child selects the child, not the container', () => {
    const onSelect = vi.fn();
    const card: ContainerNode = {
      id: 'node_card',
      type: 'container',
      x: 0,
      y: 0,
      w: 220,
      h: 120,
      props: {},
      children: [BUTTON],
    };

    render(<ComponentRenderer mode="canvas" node={card} selected={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('node_save');
  });

  it('does not render hidden layers in canvas or preview', () => {
    const hidden = { ...BUTTON, isHidden: true };
    const { rerender } = render(
      <ComponentRenderer mode="canvas" node={hidden} selected={false} />,
    );
    expect(screen.queryByText('Save')).not.toBeInTheDocument();

    rerender(<ComponentRenderer mode="preview" node={hidden} selected={false} />);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('renders locked layers but ignores direct canvas selection', () => {
    const onSelect = vi.fn();
    render(
      <ComponentRenderer
        mode="canvas"
        node={{ ...BUTTON, isLocked: true }}
        onSelect={onSelect}
        selected={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('marks a nested layer selected through selectedNodeId', () => {
    const frame: ContainerNode = {
      id: 'frame',
      type: 'container',
      x: 0,
      y: 0,
      w: 240,
      h: 180,
      props: {},
      children: [BUTTON],
    };
    const { container } = render(
      <ComponentRenderer
        mode="canvas"
        node={frame}
        selected={false}
        selectedNodeId="node_save"
      />,
    );

    expect(container.querySelector('[data-node-id="frame"]')).toHaveAttribute('data-selected', 'false');
    expect(container.querySelector('[data-node-id="node_save"]')).toHaveAttribute('data-selected', 'true');
  });

  it('renders ListView items through its item template', () => {
    const list: ListViewNode = {
      id: 'node_list',
      type: 'listview',
      x: 0,
      y: 0,
      w: 200,
      h: 120,
      props: {
        emptyText: 'No students', showDividers: true, scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 6, itemBorderRadius: 10,
        dataSource: {
          kind: 'static',
          fields: [{ id: 'value', label: 'Value', type: 'text' }],
          items: [
            { id: 'student-1', values: { value: 'Bañares, Peter Andrew' } },
            { id: 'student-2', values: { value: 'Briñas, Andrei' } },
          ],
        },
      },
      children: [{
        id: 'node_list_item', type: 'text', x: 24, y: 16, w: 160, h: 44,
        props: { text: 'Student', level: 'body' },
        bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'value' } }],
      }],
    };

    render(<ComponentRenderer mode="preview" node={list} selected={false} />);

    expect(screen.getByText('Bañares, Peter Andrew')).toBeInTheDocument();
    expect(screen.getByText('Briñas, Andrei')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'ListView' })).toHaveStyle({ gap: '6px' });
    expect(screen.getAllByRole('listitem')[0]).toHaveStyle({ borderRadius: '10px', overflow: 'hidden' });
    expect(screen.getAllByRole('listitem')[0]).toHaveStyle({ height: '60px' });
    expect(document.querySelector('[data-node-id="node_list_item"]')).toHaveStyle({ left: '24px', top: '16px', width: '160px' });
  });

  it('activates Gesture Detector with Enter and isolates nested button clicks', () => {
    const gesture: GestureDetectorNode = {
      id: 'note_gesture',
      type: 'gesture-detector',
      x: 0,
      y: 0,
      w: 240,
      h: 100,
      props: { semanticLabel: 'Open note details' },
      children: [{ ...BUTTON, id: 'complete_note', x: 180, y: 24, props: { ...BUTTON.props, label: 'Complete note' } }],
    };
    const onNodeEvent = vi.fn();
    render(
      <ComponentRenderer
        interactiveNodeIds={new Set(['note_gesture', 'complete_note'])}
        mode="preview"
        node={gesture}
        onNodeEvent={onNodeEvent}
        selected={false}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open note details' }), { key: 'Enter' });
    expect(onNodeEvent).toHaveBeenCalledWith('note_gesture', 'click');

    onNodeEvent.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Complete note' }));
    expect(onNodeEvent).toHaveBeenCalledTimes(1);
    expect(onNodeEvent).toHaveBeenCalledWith('complete_note', 'click');
  });

  it('reserves an undesigned ListView for canvas chrome while preview keeps its runtime empty state', () => {
    const defaults = makeListView('empty-list');
    const list: ListViewNode = {
      ...defaults,
      children: [],
      props: {
        ...defaults.props,
        emptyText: 'Nothing saved yet',
        dataSource: {
          kind: 'static',
          fields: [{ id: 'value', label: 'Value', type: 'text' }],
          items: [],
        },
      },
    };
    const { rerender } = render(<ComponentRenderer mode="canvas" node={list} selected={false} />);

    expect(screen.queryByText('Nothing saved yet')).not.toBeInTheDocument();

    rerender(<ComponentRenderer mode="preview" node={list} selected={false} />);
    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
  });

  it('shows item-layout outlines on the canvas for a designed ListView with no records', () => {
    const defaults = makeListView('outlined-list');
    const list: ListViewNode = {
      ...defaults,
      y: 0,
      props: {
        ...defaults.props,
        padding: createPadding(12),
        itemSpacing: 10,
        itemBorderRadius: 14,
        dataSource: {
          kind: 'static',
          fields: [{ id: 'value', label: 'Value', type: 'text' }],
          items: [],
        },
      },
    };
    const { rerender } = render(<ComponentRenderer mode="canvas" node={list} selected={false} />);

    const outlines = screen.getByTestId('listview-item-outlines');
    const items = screen.getAllByTestId('listview-item-outline');
    expect(outlines).toHaveClass('flex-col');
    expect(outlines).toHaveStyle({ gap: '10px' });
    expect(items.length).toBeGreaterThan(1);
    expect(items[0]).toHaveStyle({ borderRadius: '14px', height: '56px' });
    expect(items[0]).toHaveAttribute('data-item-padding-gutter', '12');
    expect(items[0]).toHaveAttribute('data-item-padding-top', '12');
    expect(items[0]).toHaveAttribute('data-item-padding-right', '12');
    expect(items[0]).toHaveAttribute('data-item-padding-bottom', '12');
    expect(items[0]).toHaveAttribute('data-item-padding-left', '12');
    expect(items[0]?.querySelectorAll('span')).toHaveLength(4);
    expect(screen.queryByText('No items yet')).not.toBeInTheDocument();

    rerender(<ComponentRenderer mode="preview" node={list} selected={false} />);
    expect(screen.queryByTestId('listview-item-outlines')).not.toBeInTheDocument();
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('orients empty item outlines horizontally when the ListView scrolls sideways', () => {
    const defaults = makeListView('horizontal-list');
    const list: ListViewNode = {
      ...defaults,
      y: 0,
      props: {
        ...defaults.props,
        scrollDirection: 'horizontal',
        padding: createEdgePadding({ top: 2, right: 4, bottom: 6, left: 8 }),
        dataSource: {
          kind: 'static',
          fields: [{ id: 'value', label: 'Value', type: 'text' }],
          items: [],
        },
      },
    };
    render(<ComponentRenderer mode="canvas" node={list} selected={false} />);

    expect(screen.getByTestId('listview-item-outlines')).toHaveClass('flex-row');
    const outline = screen.getByTestId('listview-item-outline');
    expect(outline).toHaveStyle({ height: '100%' });
    expect(outline).toHaveAttribute('data-item-padding-top', '2');
    expect(outline).toHaveAttribute('data-item-padding-right', '4');
    expect(outline).toHaveAttribute('data-item-padding-bottom', '6');
    expect(outline).toHaveAttribute('data-item-padding-left', '8');
  });

  it('resolves collection-bound ListView items from renderer data context', () => {
    const onNodeEvent = vi.fn();
    const collection: DataCollection = {
      id: 'students', projectId: 'project', databaseId: 'database', name: 'Students',
      fields: [{ id: 'name', key: 'name', label: 'Name', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const record: DataRecord = {
      id: 'record', projectId: 'project', collectionId: 'students', values: { name: 'Ada Lovelace' },
      createdAt: new Date(), updatedAt: new Date(),
    };
    const list: ListViewNode = {
      id: 'list', type: 'listview', x: 0, y: 0, w: 240, h: 160,
      props: {
        emptyText: 'No students', showDividers: true, scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 0, itemBorderRadius: 0,
        dataSource: { kind: 'collection', collectionId: 'students', displayFieldIds: ['name'] },
      },
      children: [{
        id: 'student_name', type: 'text', x: 0, y: 0, w: 240, h: 44,
        props: { text: 'Name', level: 'body' },
        bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'name' } }],
      }],
    };

    render(
      <ComponentRenderer
        dataContext={{ collections: [collection], recordsByCollection: new Map([['students', [record]]]) }}
        mode="preview"
        node={list}
        onNodeEvent={onNodeEvent}
        selected={false}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ada Lovelace'));
    expect(onNodeEvent).toHaveBeenCalledWith('list', 'click', 'record', {
      listItem: expect.objectContaining({ listViewId: 'list', itemId: 'record' }),
    });
    expect(onNodeEvent.mock.calls.filter(([nodeId]) => nodeId === 'list')).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole('listitem', { name: /Ada Lovelace/ }), { key: 'Enter' });
    expect(onNodeEvent.mock.calls.filter(([nodeId]) => nodeId === 'list')).toHaveLength(2);
  });

  it('renders an image-only item template without requiring a record label', () => {
    const collection: DataCollection = {
      id: 'gallery', projectId: 'project', databaseId: 'database', name: 'Gallery',
      fields: [{ id: 'photo', key: 'photo', label: 'Photo URL', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const record: DataRecord = {
      id: 'photo_record', projectId: 'project', collectionId: 'gallery',
      values: { photo: 'https://example.com/photo.png' },
      createdAt: new Date(), updatedAt: new Date(),
    };
    const image: ImageNode = {
      id: 'gallery_image', type: 'image', x: 0, y: 0, w: 240, h: 160,
      props: { src: '', alt: 'Gallery photo', fit: 'cover' },
      bindings: [{ target: 'image.source', value: { source: 'list-item', fieldId: 'photo' } }],
    };
    const list: ListViewNode = {
      id: 'gallery_list', type: 'listview', x: 0, y: 0, w: 240, h: 160,
      props: {
        emptyText: 'No photos', showDividers: false, scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch', gap: 0, padding: createPadding(0), itemSpacing: 0, itemBorderRadius: 0,
        dataSource: { kind: 'collection', collectionId: 'gallery', displayFieldIds: [] },
      },
      children: [image],
    };

    render(
      <ComponentRenderer
        dataContext={{ collections: [collection], recordsByCollection: new Map([['gallery', [record]]]) }}
        mode="preview"
        node={list}
        selected={false}
      />,
    );

    expect(screen.getByRole('img', { name: 'Gallery photo' })).toHaveAttribute('src', 'https://example.com/photo.png');
    expect(screen.getByRole('listitem', { name: /Item 1/ })).toBeInTheDocument();
    expect(screen.queryByText('photo_record')).not.toBeInTheDocument();
  });

  it('keeps an actions menu selectable on the design canvas', () => {
    const onSelect = vi.fn();
    render(<ComponentRenderer mode="canvas" node={{
      id: 'menu', type: 'dropdown', x: 0, y: 0, w: 44, h: 44,
      props: { label: 'Actions', placeholder: '', options: ['Edit'], selectedIndex: -1, presentation: 'menu' },
    }} onSelect={onSelect} selected={false} />);
    fireEvent.click(screen.getByText('⋮'));
    expect(onSelect).toHaveBeenCalledWith('menu');
  });

  it('layers local additions around the active static runtime baseline', () => {
    const list = makeListView('node_list');
    render(
      <ComponentRenderer
        componentValues={new Map([['node_list', JSON.stringify([{ id: 'replacement', value: 'Replacement' }])]])}
        dataContext={{
          collections: [],
          recordsByCollection: new Map(),
          localItemsByListView: new Map([['node_list', [
            { itemId: 'before', placement: 'prepend', values: { value: 'Before' } },
            { itemId: 'after', placement: 'append', values: { value: 'After' } },
          ]]]),
        }}
        mode="preview"
        node={list}
        selected={false}
      />,
    );

    const items = within(screen.getByRole('list', { name: 'ListView' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Before', 'Replacement', 'After']);
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });

  it('lays out Column children vertically and Row children horizontally', () => {
    const row: RowNode = {
      id: 'node_row',
      type: 'row',
      x: 0,
      y: 0,
      w: 200,
      h: 60,
      props: { mainAxisAlignment: 'end', crossAxisAlignment: 'center', gap: 8, padding: createPadding(0) },
      children: [
        { ...BUTTON, id: 'row_first', x: 0, y: 0, w: 100, h: 44, props: { label: 'First', variant: 'solid' } },
        { ...BUTTON, id: 'row_second', x: 0, y: 0, w: 100, h: 44, props: { label: 'Second', variant: 'outline' } },
      ],
    };
    const column: ColumnNode = {
      id: 'node_column', type: 'column', x: 0, y: 0, w: 320, h: 180,
      props: { mainAxisAlignment: 'start', crossAxisAlignment: 'stretch', gap: 12, padding: createPadding(16) },
      children: [
        { id: 'column_title', type: 'text', x: 0, y: 0, w: 120, h: 28, props: { text: 'Contact us', level: 'title' } },
        row,
      ],
    };
    const { container } = render(<ComponentRenderer mode="canvas" node={column} selected={false} />);
    expect(container.querySelector('[data-node-id="column_title"]')).toHaveStyle({ left: '16px', top: '16px', width: '288px' });
    expect(container.querySelector('[data-node-id="node_row"]')).toHaveStyle({ left: '16px', top: '56px', width: '288px' });
    expect(container.querySelector('[data-node-id="row_first"]')).toHaveStyle({ left: '80px', top: '8px' });
    expect(container.querySelector('[data-node-id="row_second"]')).toHaveStyle({ left: '188px', top: '8px' });
  });

  it('shows an image placeholder until a src is set', () => {
    const image: ImageNode = {
      id: 'node_photo',
      type: 'image',
      x: 0,
      y: 0,
      w: 160,
      h: 120,
      props: { src: '', alt: 'Portrait', fit: 'cover' },
    };

    render(<ComponentRenderer mode="preview" node={image} selected={false} />);

    expect(screen.getByText('Add an image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps camera access inactive on canvas and requires an explicit preview action', () => {
    const camera: CameraNode = {
      id: 'node_camera',
      type: 'camera',
      x: 0,
      y: 0,
      w: 320,
      h: 220,
      props: { label: 'Face camera', facingMode: 'user', captureLabel: 'Capture face' },
    };
    const canvas = render(<ComponentRenderer mode="canvas" node={camera} selected={false} />);
    expect(screen.getByText('Camera activates only in Preview.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enable camera' })).not.toBeInTheDocument();

    canvas.unmount();
    render(<ComponentRenderer mode="preview" node={camera} selected={false} />);
    expect(screen.getByRole('button', { name: 'Enable camera' })).toBeInTheDocument();
  });
});

describe('ScreenFrame', () => {
  afterEach(() => document.documentElement.classList.remove('dark'));

  const homeScreen: Screen = {
    id: 'screen_home',
    name: 'Home',
    path: '/',
    nodes: [BUTTON],
    behaviors: [],
    logicGraphs: [],
  };

  it('renders every node of the screen into the device frame', () => {
    const { container } = render(
      <ScreenFrame mode="preview" screen={homeScreen} size={CANVAS_PRESETS.mobile} />,
    );

    expect(container.querySelector('[data-screen-id="screen_home"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('scales thumbnails via CSS transform', () => {
    const { container } = render(
      <ScreenFrame mode="preview" scale={0.5} screen={homeScreen} size={CANVAS_PRESETS.mobile} />,
    );

    const outer = container.querySelector('[data-screen-id="screen_home"]');
    expect(outer).toHaveStyle({ width: '195px', height: '390px' });
  });

  it('follows the editor dark theme by default', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(
      <ScreenFrame mode="canvas" screen={homeScreen} size={CANVAS_PRESETS.mobile} />,
    );

    expect(container.querySelector('[data-screen-id="screen_home"] > div'))
      .toHaveClass('novy-app-theme-dark');
  });

  it('uses dark appearance variants on a dark canvas so light cards cannot hide their text', () => {
    document.documentElement.classList.add('dark');
    const card: ContainerNode = {
      id: 'node_card',
      type: 'container',
      x: 0,
      y: 0,
      w: 320,
      h: 80,
      appearance: {
        backgroundColor: '#f8f9fc',
        dark: { backgroundColor: '#1f2937' },
      },
      props: {},
      children: [makeText('node_title', {
        x: 12,
        y: 12,
        w: 280,
        h: 24,
        props: { text: 'Readable title', level: 'title' },
      })],
    };
    const cardScreen: Screen = { ...homeScreen, nodes: [card] };

    const { container } = render(
      <ScreenFrame mode="canvas" screen={cardScreen} size={CANVAS_PRESETS.mobile} />,
    );

    expect(container.querySelector('[data-node-id="node_card"]'))
      .toHaveStyle({ backgroundColor: '#1f2937' });
    expect(screen.getByText('Readable title')).toBeInTheDocument();
  });

  it('keeps an explicit preview app theme independent from the dark editor', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(
      <ScreenFrame appTheme="light" mode="preview" screen={homeScreen} size={CANVAS_PRESETS.mobile} />,
    );

    expect(container.querySelector('[data-screen-id="screen_home"] > div'))
      .toHaveClass('novy-app-theme-light');
  });
});

describe('unknown components', () => {
  it('renders nothing rather than crashing the editor', () => {
    const bogus = { id: 'bogus', type: 'nonexistent', x: 0, y: 0, w: 1, h: 1 } as unknown as ComponentNode;
    const { container } = render(<ComponentRenderer mode="canvas" node={bogus} selected={false} />);

    expect(container.firstElementChild).toBeNull();
  });
});
