import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ButtonNode, CameraNode, ChatNode, ColumnNode, ComponentNode, ContainerNode, DropdownNode, FileInputNode, GestureDetectorNode, ImageNode, InputNode, ListViewNode, RowNode } from '@domain/entities/componentNode';
import { createEdgePadding, createPadding } from '@domain/entities/componentNode';
import type { Screen } from '@domain/entities/screen';
import type { DataCollection, DataRecord } from '@domain/entities/appData';
import { ComponentRenderer } from './ComponentRenderer';
import { CANVAS_PRESETS, ScreenFrame } from './ScreenFrame';
import { makeColumn, makeContainer, makeListView, makeText } from '@test/editorFixtures';
import { buildSectionPreset } from '@domain/sections/sectionPresets';
import { createComponentNode } from '@domain/factories/componentNode';

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
  it.each(['canvas', 'preview', 'thumbnail'] as const)('exposes authored Text color across all text-bearing widgets in %s', (mode) => {
    const types = ['button', 'text', 'input', 'checkbox', 'radio', 'switch', 'dropdown', 'slider', 'progress', 'file-input', 'chat', 'camera', 'image', 'listview'] as const;
    const nodes = types.map((type) => ({ ...createComponentNode(type), appearance: { textColor: '#7c3aed' } }));
    const { container } = render(<>{nodes.map((node) => <ComponentRenderer key={node.id} mode={mode} node={node} selected={false} />)}</>);

    for (const node of nodes) {
      expect(container.querySelector(`[data-node-id="${node.id}"]`)).toHaveStyle({ '--novy-component-text': '#7c3aed' });
    }
    expect(container.querySelector('.text-ink, .text-ink-muted')).toBeNull();
  });

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

  it('keeps File input inert on canvas and emits its transient media reference in preview', () => {
    const node: FileInputNode = {
      id: 'file_document',
      type: 'file-input',
      x: 10,
      y: 20,
      w: 320,
      h: 100,
      props: {
        label: 'Choose a document',
        helperText: 'Text or PDF',
        accept: ['text/plain', 'application/pdf'],
      },
    };
    const onNodeValueChange = vi.fn();
    const onNodeMediaChange = vi.fn();
    const { rerender } = render(
      <ComponentRenderer mode="canvas" node={node} selected={false} onNodeMediaChange={onNodeMediaChange} onNodeValueChange={onNodeValueChange} />,
    );
    expect(screen.queryByLabelText('Choose a document')).not.toBeInTheDocument();

    rerender(
      <ComponentRenderer mode="preview" node={node} selected={false} onNodeMediaChange={onNodeMediaChange} onNodeValueChange={onNodeValueChange} />,
    );
    const input = screen.getByLabelText('Choose a document');
    fireEvent.change(input, { target: { files: [new File(['hello'], 'handbook.txt', { type: 'text/plain' })] } });

    expect(onNodeValueChange).toHaveBeenCalledWith(node.id, 'media:handbook.txt');
    expect(onNodeMediaChange).toHaveBeenCalledWith(node.id, expect.any(File));
    expect(screen.getByText('handbook.txt')).toBeInTheDocument();
  });

  it('renders Chat messages and submits composer text only in preview', () => {
    const node: ChatNode = {
      id: 'chat_document',
      type: 'chat',
      x: 10,
      y: 20,
      w: 340,
      h: 500,
      props: {
        title: 'Ask your document',
        placeholder: 'Ask a question',
        sendLabel: 'Send',
        emptyText: 'Ask your first question.',
        showCitations: true,
      },
    };
    const onNodeValueChange = vi.fn();
    render(
      <ComponentRenderer
        dataContext={{
          collections: [],
          recordsByCollection: new Map(),
          localItemsByListView: new Map([[node.id, [{
            itemId: 'message_1',
            placement: 'append',
            values: { role: 'assistant', text: 'The answer is 42.', citations: 'Handbook' },
          }]]]),
        }}
        mode="preview"
        node={node}
        onNodeValueChange={onNodeValueChange}
        selected={false}
      />,
    );

    expect(screen.getByText('The answer is 42.')).toBeInTheDocument();
    expect(screen.getByText('Handbook')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ask a question'), { target: { value: 'What is the answer?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onNodeValueChange).toHaveBeenCalledWith(node.id, 'What is the answer?');
  });

  it('shows an accessible thinking bubble and locks the Chat composer while pending', () => {
    const node: ChatNode = {
      id: 'chat_pending',
      type: 'chat',
      x: 10,
      y: 20,
      w: 340,
      h: 500,
      props: {
        title: 'Ask your document',
        placeholder: 'Ask a question',
        sendLabel: 'Send',
        emptyText: 'Ask your first question.',
        showCitations: true,
      },
    };
    render(
      <ComponentRenderer
        dataContext={{
          collections: [],
          recordsByCollection: new Map(),
          localItemsByListView: new Map([[node.id, [{
            itemId: 'message_user',
            placement: 'append',
            values: { role: 'user', text: 'What is this about?', citations: '' },
          }]]]),
          pendingChatNodeIds: new Set([node.id]),
        }}
        mode="preview"
        node={node}
        selected={false}
      />,
    );

    expect(screen.getByRole('status', { name: 'Assistant is thinking' })).toBeInTheDocument();
    expect(screen.getByLabelText('Ask a question')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
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

  it('applies text font family, size, and weight overrides with a proportional line height', () => {
    const node = makeText('text_override', {
      props: { text: 'Custom type', level: 'title', fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 'bold' },
    });
    const { rerender } = render(<ComponentRenderer mode="canvas" node={node} selected={false} />);

    const paragraph = screen.getByText('Custom type');
    expect(paragraph).toHaveStyle({ fontFamily: 'Georgia, serif', fontSize: '32px', fontWeight: '700', lineHeight: '1.25' });

    rerender(<ComponentRenderer mode="canvas" node={makeText('text_override', {
      props: { text: 'Custom type', level: 'title' },
    })} selected={false} />);
    const preset = screen.getByText('Custom type');
    expect(preset.style.fontFamily).toBe('');
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

  it('renders authored italic text and exposes one text-color override to widget internals', () => {
    const text = makeText('styled_text', {
      appearance: { textColor: '#7c3aed' },
      props: { text: 'Italic text', level: 'body', fontStyle: 'italic' },
    });
    const { container, rerender } = render(<ComponentRenderer mode="canvas" node={text} selected={false} />);

    expect(screen.getByText('Italic text')).toHaveStyle({ fontStyle: 'italic' });
    expect(container.querySelector('[data-node-id="styled_text"]')).toHaveStyle({
      '--novy-component-text': '#7c3aed',
    });

    const button: ButtonNode = { ...BUTTON, appearance: { textColor: '#facc15' } };
    rerender(<ComponentRenderer mode="canvas" node={button} selected={false} />);
    expect(container.querySelector('[data-node-id="node_save"]')).not.toHaveClass('novy-node-background');
    expect(container.querySelector('[data-node-id="node_save"]')).not.toHaveClass('novy-node-radius');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({
      color: 'var(--novy-component-text, #ffffff)',
    });
  });

  it('keeps authored text color on action menus rendered outside the component frame', () => {
    const dropdown: DropdownNode = {
      id: 'colored_menu', type: 'dropdown', x: 0, y: 0, w: 44, h: 44,
      appearance: { textColor: '#7c3aed' },
      props: { label: 'Actions', placeholder: '', presentation: 'menu', selectedIndex: 0, options: ['Edit', 'Delete'] },
    };
    render(<ComponentRenderer mode="preview" node={dropdown} selected={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    expect(screen.getByRole('menu', { name: 'Actions' })).toHaveStyle({ '--novy-component-text': '#7c3aed' });
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveClass('novy-widget-text');
  });

  it('renders standalone decorative and labelled icons accessibly', () => {
    const decorative: ComponentNode = {
      id: 'icon_decorative', type: 'icon', x: 0, y: 0, w: 32, h: 32,
      props: { icon: 'graduation-cap', label: '', strokeWidth: 1.5 },
    };
    const { container, rerender } = render(<ComponentRenderer mode="canvas" node={decorative} selected={false} />);

    expect(container.querySelector('[data-app-icon="graduation-cap"] svg')).toHaveAttribute('aria-hidden', 'true');

    rerender(<ComponentRenderer mode="canvas" node={{ ...decorative, props: { ...decorative.props, label: 'Learning' } }} selected={false} />);
    expect(screen.getByRole('img', { name: 'Learning' })).toBeInTheDocument();
  });

  it('cascades responsive appearance and typography after base values', () => {
    const node = makeText('responsive_text', {
      appearance: { textColor: '#111111', backgroundColor: '#ffffff' },
      responsive: {
        tablet: {
          appearance: { backgroundColor: '#eeeeee' },
          textStyle: { fontSize: 22, textAlign: 'center' },
        },
        desktop: {
          appearance: { textColor: '#663399' },
          textStyle: { fontSize: 30, letterSpacing: 1.5 },
        },
      },
      props: { text: 'Responsive type', level: 'title', fontSize: 18 },
    });
    const { container } = render(<ComponentRenderer breakpoint="desktop" mode="preview" node={node} selected={false} />);

    expect(container.querySelector('[data-node-id="responsive_text"]')).toHaveStyle({
      backgroundColor: '#eeeeee',
      color: '#663399',
    });
    expect(screen.getByText('Responsive type')).toHaveStyle({
      fontSize: '30px',
      textAlign: 'center',
      letterSpacing: '1.5px',
    });
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

  it('prefills a date input from the current route record binding', () => {
    const input: InputNode = {
      id: 'node_purchase_date',
      type: 'input',
      x: 0,
      y: 0,
      w: 180,
      h: 60,
      props: { label: 'Purchase date', placeholder: '', inputType: 'date', multiline: false },
      bindings: [
        { target: 'input.value', value: { source: 'list-item', fieldId: 'purchase_date' } },
      ],
    };
    render(
      <ComponentRenderer
        itemContext={{
          listViewId: 'route-record',
          itemId: 'asset-1',
          values: { purchase_date: '2026-11-18' },
        }}
        mode="preview"
        node={input}
        selected={false}
      />,
    );

    expect(screen.getByLabelText('Purchase date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Purchase date')).toHaveValue('2026-11-18');
  });

  it('preserves an unbound dropdown default selection on the canvas', () => {
    const dropdown: DropdownNode = {
      id: 'node_category',
      type: 'dropdown',
      x: 0,
      y: 0,
      w: 180,
      h: 60,
      props: {
        label: 'Category',
        options: ['Laptop', 'Camera'],
        placeholder: 'Choose a category',
        selectedIndex: 1,
        presentation: 'select',
      },
    };

    render(<ComponentRenderer mode="canvas" node={dropdown} selected={false} />);

    expect(screen.getByLabelText('Category')).toHaveDisplayValue('Camera');
  });

  it('hides a Text field label without losing its accessible name and styles its actual border', () => {
    const input: InputNode = {
      id: 'node_email', type: 'input', x: 0, y: 0, w: 180, h: 60,
      appearance: { borderColor: '#334155', borderStyle: 'dashed', borderWidth: 3, borderRadius: 12 },
      props: { label: 'Email', showLabel: false, placeholder: 'you@school.edu', inputType: 'email', multiline: false },
    };
    const { container } = render(<ComponentRenderer mode="preview" node={input} selected={false} />);

    expect(screen.queryByText('Email')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveStyle({
      borderColor: '#334155', borderStyle: 'dashed', borderWidth: '3px', borderRadius: '12px',
    });
    expect(container.querySelector('[data-node-id="node_email"]')).not.toHaveStyle({ borderStyle: 'dashed' });
  });

  it('renders an underline field with a bottom edge only', () => {
    const input: InputNode = {
      id: 'node_underline', type: 'input', x: 0, y: 0, w: 240, h: 56,
      props: {
        label: 'Content', placeholder: 'Write your note', inputType: 'text',
        multiline: true, fieldStyle: 'underline',
      },
    };
    render(<ComponentRenderer mode="preview" node={input} selected={false} />);

    const control = screen.getByRole('textbox', { name: 'Content' });
    expect(control).toHaveClass('novy-field-underline');
    expect(control).toHaveStyle({
      borderStyle: 'none none solid',
      borderWidth: '0px 0px 1px',
      borderBottomStyle: 'solid',
    });
  });

  it('renders a filled field without a border', () => {
    const input: InputNode = {
      id: 'node_filled', type: 'input', x: 0, y: 0, w: 240, h: 56,
      props: {
        label: 'Email', placeholder: 'you@example.com', inputType: 'email',
        multiline: false, fieldStyle: 'filled',
      },
    };
    render(<ComponentRenderer mode="preview" node={input} selected={false} />);

    const control = screen.getByRole('textbox', { name: 'Email' });
    expect(control).toHaveClass('novy-field-filled');
    expect(control).toHaveStyle({ borderStyle: 'none', borderWidth: '0px' });
  });

  it('applies per-side border widths to the actual field', () => {
    const input: InputNode = {
      id: 'node_sides', type: 'input', x: 0, y: 0, w: 240, h: 56,
      appearance: { borderColor: '#334155', borderSides: { bottom: { width: 3 }, top: { width: 0 } } },
      props: { label: 'Title', placeholder: 'Title', inputType: 'text', multiline: false },
    };
    render(<ComponentRenderer mode="preview" node={input} selected={false} />);

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveStyle({
      borderTopWidth: '0px', borderBottomWidth: '3px', borderBottomColor: '#334155',
    });
  });

  it('applies Text field border controls to multiline fields and falls back to an accessible name', () => {
    const input: InputNode = {
      id: 'node_message', type: 'input', x: 0, y: 0, w: 240, h: 100,
      appearance: { borderStyle: 'none', borderWidth: 5 },
      props: { label: '', showLabel: false, placeholder: 'Your message', inputType: 'text', multiline: true },
    };
    render(<ComponentRenderer mode="preview" node={input} selected={false} />);

    expect(screen.getByRole('textbox', { name: 'Your message' })).toHaveStyle({ borderStyle: 'none', borderWidth: '0px' });
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

  it('renders website sections with a contrasting dark surface in dark mode', () => {
    document.documentElement.classList.add('dark');
    const hero = buildSectionPreset('hero');
    const websiteScreen: Screen = { ...homeScreen, nodes: [hero] };

    const { container } = render(
      <ScreenFrame mode="canvas" screen={websiteScreen} size={CANVAS_PRESETS.mobile} />,
    );

    expect(container.querySelector(`[data-node-id="${hero.id}"]`)).toHaveStyle({
      backgroundColor: '#1e1b4b',
      color: '#eef0f4',
    });
    expect(screen.getByText('Build something people remember')).toBeInTheDocument();
  });

  it('keeps an explicit preview app theme independent from the dark editor', () => {
    document.documentElement.classList.add('dark');
    const { container } = render(
      <ScreenFrame appTheme="light" mode="preview" screen={homeScreen} size={CANVAS_PRESETS.mobile} />,
    );

    expect(container.querySelector('[data-screen-id="screen_home"] > div'))
      .toHaveClass('novy-app-theme-light');
  });

  it('renders static and Logic-provided chart data as accessible SVGs', () => {
    const chart = createComponentNode('chart');
    if (chart.type !== 'chart') throw new Error('Expected a chart node.');
    const { rerender } = render(<ComponentRenderer mode="preview" node={chart} selected={false} />);

    const staticChart = screen.getByRole('img', { name: /bar chart with 4 categories and 1 series/ });
    expect(staticChart.querySelectorAll('rect').length).toBeGreaterThan(0);

    const logicData = { kind: 'static' as const, categories: ['Jan'], series: [{ id: 'total', label: 'Total', values: [42] }] };
    rerender(
      <ComponentRenderer
        dataContext={{ chartDataByNode: new Map([[chart.id, logicData]]), collections: [], recordsByCollection: new Map() }}
        mode="preview"
        node={chart}
        selected={false}
      />,
    );

    expect(screen.getByRole('img', { name: /bar chart with 1 categories and 1 series/ })).toBeInTheDocument();
    expect(screen.getAllByText('Jan').length).toBeGreaterThan(0);
  });

  it('shows the configured empty state when a chart has no data', () => {
    const chart = createComponentNode('chart');
    if (chart.type !== 'chart') throw new Error('Expected a chart node.');
    const emptyChart = {
      ...chart,
      props: {
        ...chart.props,
        emptyText: 'Nothing to plot',
        dataSource: { kind: 'static' as const, categories: [], series: [] },
      },
    };

    render(<ComponentRenderer mode="canvas" node={emptyChart} selected={false} />);

    expect(screen.getByText('Nothing to plot')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('adapts chart coordinates and secondary labels to compact geometry', () => {
    const chart = createComponentNode('chart');
    if (chart.type !== 'chart') throw new Error('Expected a chart node.');
    const compact = { ...chart, w: 180, h: 120 };

    const { container } = render(<ComponentRenderer mode="canvas" node={compact} selected={false} />);

    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 180 120');
    expect(screen.queryByText('Series 1')).not.toBeInTheDocument();
    expect(container.querySelector('[data-node-id]')).toHaveAttribute('data-content-size', 'compact');
  });
});

describe('unknown components', () => {
  it('renders nothing rather than crashing the editor', () => {
    const bogus = { id: 'bogus', type: 'nonexistent', x: 0, y: 0, w: 1, h: 1 } as unknown as ComponentNode;
    const { container } = render(<ComponentRenderer mode="canvas" node={bogus} selected={false} />);

    expect(container.firstElementChild).toBeNull();
  });
});
