import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ButtonNode, ComponentNode, ContainerNode, FormNode, ImageNode, InputNode, ListNode } from '@domain/entities/componentNode';
import type { Screen } from '@domain/entities/screen';
import type { DataCollection, DataRecord } from '@domain/entities/appData';
import { ComponentRenderer } from './ComponentRenderer';
import { CANVAS_PRESETS, ScreenFrame } from './ScreenFrame';

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

  it('positions nodes absolutely by geometry', () => {
    const { container } = render(<ComponentRenderer mode="canvas" node={BUTTON} selected={false} />);

    const frame = container.querySelector('[data-node-id="node_save"]');
    expect(frame).not.toBeNull();
    expect(frame).toHaveStyle({ left: '10px', top: '20px', width: '120px', height: '44px' });
  });

  it('marks the selected node in canvas mode', () => {
    render(<ComponentRenderer mode="canvas" node={BUTTON} selected />);

    const frame = screen.getByRole('button', { name: 'Save' }).closest('[data-node-id]');
    expect(frame).toHaveAttribute('data-selected', 'true');
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
      props: { label: 'Email', placeholder: 'you@school.edu' },
    };

    render(<ComponentRenderer mode="thumbnail" node={input} selected={false} />);

    expect(screen.queryByPlaceholderText('you@school.edu')).not.toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
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

  it('renders list items', () => {
    const list: ListNode = {
      id: 'node_list',
      type: 'list',
      x: 0,
      y: 0,
      w: 200,
      h: 120,
      props: { items: ['Bañares, Peter Andrew', 'Briñas, Andrei'] },
    };

    render(<ComponentRenderer mode="preview" node={list} selected={false} />);

    expect(screen.getByText('Bañares, Peter Andrew')).toBeInTheDocument();
    expect(screen.getByText('Briñas, Andrei')).toBeInTheDocument();
  });

  it('resolves collection-bound List items from renderer data context', () => {
    const collection: DataCollection = {
      id: 'students', projectId: 'project', name: 'Students',
      fields: [{ id: 'name', key: 'name', label: 'Name', type: 'text', required: true }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    const record: DataRecord = {
      id: 'record', projectId: 'project', collectionId: 'students', values: { name: 'Ada Lovelace' },
      createdAt: new Date(), updatedAt: new Date(),
    };
    const list: ListNode = {
      id: 'list', type: 'list', x: 0, y: 0, w: 240, h: 160,
      props: { items: [], dataSource: { kind: 'collection', collectionId: 'students', displayFieldId: 'name' } },
    };

    render(
      <ComponentRenderer
        dataContext={{ collections: [collection], recordsByCollection: new Map([['students', [record]]]) }}
        mode="preview"
        node={list}
        selected={false}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('renders an editable Form control and a static thumbnail variant', () => {
    const form: FormNode = {
      id: 'node_form',
      type: 'form',
      x: 0,
      y: 0,
      w: 320,
      h: 260,
      props: {
        title: 'Contact us',
        fields: [{ label: 'Email', placeholder: 'you@example.com', type: 'email' }],
        submitLabel: 'Send',
      },
    };
    const canvas = render(<ComponentRenderer mode="canvas" node={form} selected={false} />);
    expect(screen.getByRole('form', { name: 'Contact us' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();

    canvas.unmount();
    render(<ComponentRenderer mode="thumbnail" node={form} selected={false} />);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Contact us')).toBeInTheDocument();
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
});

describe('ScreenFrame', () => {
  const homeScreen: Screen = {
    id: 'screen_home',
    name: 'Home',
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
});

describe('unknown components', () => {
  it('renders nothing rather than crashing the editor', () => {
    const bogus = { id: 'bogus', type: 'nonexistent', x: 0, y: 0, w: 1, h: 1 } as unknown as ComponentNode;
    const { container } = render(<ComponentRenderer mode="canvas" node={bogus} selected={false} />);

    expect(container.firstElementChild).toBeNull();
  });
});
