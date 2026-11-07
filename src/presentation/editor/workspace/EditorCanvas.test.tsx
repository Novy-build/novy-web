import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Screen } from '@domain/entities/screen';
import { COMPONENT_MIME } from './ComponentsPalette';
import { EditorCanvas } from './EditorCanvas';
import { makeButton, makeContainer, makeScreen, makeText } from '@test/editorFixtures';

function canvasProps(overrides: Record<string, unknown> = {}) {
  return {
    screen: makeScreen('screen_1', [makeText('node_text')]),
    device: 'mobile' as const,
    zoom: 1,
    isSnapEnabled: true,
    selectedNodeId: null as string | null,
    dropIndicator: null as { x: number; y: number } | null,
    onSelectNode: vi.fn(),
    onDragStart: vi.fn(),
    onNodeMove: vi.fn(),
    onNodeResize: vi.fn(),
    onDuplicateSelected: vi.fn(),
    onDeleteSelected: vi.fn(),
    onAddBehavior: vi.fn(),
    onDropAt: vi.fn(),
    onReparentNode: vi.fn(),
    onDropIndicatorChange: vi.fn(),
    onZoomChange: vi.fn(),
    onToggleSnap: vi.fn(),
    onDeviceChange: vi.fn(),
    ...overrides,
  };
}

function dispatchDragEvent(
  type: 'dragover' | 'drop',
  layer: Element,
  init: { clientX?: number; clientY?: number; types?: readonly string[]; getData?: (mimeType: string) => string },
): void {
  // jsdom lacks DragEvent, so fireEvent drops the init coordinates; a plain
  // MouseEvent carrying a dataTransfer property reaches the handler intact.
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
  });
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: init.types ?? [], getData: init.getData ?? (() => ''), dropEffect: '' },
  });
  act(() => {
    layer.dispatchEvent(event);
  });
}

describe('EditorCanvas', () => {
  it('renders the live screen behind per-node interaction shims', () => {
    const props = canvasProps();

    render(<EditorCanvas {...props} />);

    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-frame').style.width).toBe('390px');
    expect(screen.getByTestId('canvas-frame').style.height).toBe('780px');
    expect(screen.getByTestId('interaction-node_text')).toBeInTheDocument();
  });

  it('exposes a canvas device toggle that reports changes', () => {
    const onDeviceChange = vi.fn();
    render(<EditorCanvas {...canvasProps({ device: 'desktop', onDeviceChange })} />);

    expect(screen.getByTestId('canvas-frame').style.width).toBe('1200px');
    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));

    expect(onDeviceChange).toHaveBeenCalledWith('tablet');
  });

  it('omits hidden layers and prevents direct interaction with locked layers', () => {
    const hidden = makeText('hidden', { isHidden: true, props: { text: 'Hidden copy', level: 'body' } });
    const locked = makeButton('locked', { isLocked: true, props: { label: 'Locked CTA', variant: 'solid' } });
    render(
      <EditorCanvas
        {...canvasProps({ screen: makeScreen('screen_1', [hidden, locked]) })}
      />,
    );

    expect(screen.queryByText('Hidden copy')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Locked CTA' })).toBeInTheDocument();
    expect(screen.queryByTestId('interaction-hidden')).not.toBeInTheDocument();
    expect(screen.queryByTestId('interaction-locked')).not.toBeInTheDocument();
  });

  it('scales the frame by the zoom factor', () => {
    render(<EditorCanvas {...canvasProps({ zoom: 2 })} />);

    const frame = screen.getByTestId('canvas-frame');
    expect(frame.style.width).toBe('780px');
    expect(screen.getByTestId('interaction-node_text').style.left).toBe('176px'); // 88 * 2
  });

  it('selects a node on a click without travel', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    const shim = screen.getByTestId('interaction-node_text');
    fireEvent.pointerDown(shim, { clientX: 50, clientY: 50 });
    fireEvent.pointerUp(shim);

    expect(props.onSelectNode).toHaveBeenCalledWith('node_text');
    expect(props.onDragStart).not.toHaveBeenCalled();
  });

  it('drags with zoom-adjusted deltas and starts history once', () => {
    const props = canvasProps({ zoom: 2 });
    render(<EditorCanvas {...props} />);

    const shim = screen.getByTestId('interaction-node_text');
    fireEvent.pointerDown(shim, { clientX: 100, clientY: 100 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 132, clientY: 140 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 148 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'));
    });

    expect(props.onDragStart).toHaveBeenCalledTimes(1);
    // Node starts at (88, 96); deltas divided by zoom 2.
    expect(props.onNodeMove).toHaveBeenNthCalledWith(1, 'node_text', 104, 116);
    expect(props.onNodeMove).toHaveBeenNthCalledWith(2, 'node_text', 108, 120);
    expect(props.onSelectNode).not.toHaveBeenCalled();
  });

  it('treats sub-threshold travel as a click, not a drag', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    const shim = screen.getByTestId('interaction-node_text');
    fireEvent.pointerDown(shim, { clientX: 50, clientY: 50 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 52, clientY: 51 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'));
    });

    expect(props.onDragStart).not.toHaveBeenCalled();
    expect(props.onNodeMove).not.toHaveBeenCalled();
    expect(props.onSelectNode).toHaveBeenCalledWith('node_text');
  });

  it('deselects when pressing the empty canvas background', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    fireEvent.pointerDown(screen.getByTestId('canvas-interactions'));

    expect(props.onSelectNode).toHaveBeenCalledWith(null);
  });

  it('shows the snap indicator while a palette item is dragged over', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    dispatchDragEvent('dragover', screen.getByTestId('canvas-interactions'), {
      clientX: 100,
      clientY: 0,
      types: [COMPONENT_MIME],
    });

    // The indicator element itself renders when the workspace feeds the
    // dispatched position back through props (covered in the state-prop test).
    expect(props.onDropIndicatorChange).toHaveBeenCalledWith({ x: 104, y: 0 });
  });

  it('clears the indicator when the drop leaves the canvas', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    const layer = screen.getByTestId('canvas-interactions');
    fireEvent.dragOver(layer, { clientX: 100, clientY: 0, dataTransfer: { types: [COMPONENT_MIME] } });
    fireEvent.dragLeave(layer, { relatedTarget: null });

    expect(props.onDropIndicatorChange).toHaveBeenLastCalledWith(null);
  });

  it('drops palette components at the snapped point', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    dispatchDragEvent('drop', screen.getByTestId('canvas-interactions'), {
      clientX: 96,
      clientY: 96,
      types: [COMPONENT_MIME],
      getData: (mimeType) => (mimeType === COMPONENT_MIME ? 'button' : ''),
    });

    expect(props.onDropIndicatorChange).toHaveBeenLastCalledWith(null);
    expect(props.onDropAt).toHaveBeenCalledWith('button', 96, 96, null);
  });

  it('targets the deepest frame for palette drops', () => {
    const frame = makeContainer('frame', [], { x: 24, y: 24, w: 240, h: 220 });
    const props = canvasProps({ screen: makeScreen('screen_1', [frame]) });
    render(<EditorCanvas {...props} />);
    const layer = screen.getByTestId('canvas-interactions');

    dispatchDragEvent('dragover', layer, {
      clientX: 100,
      clientY: 100,
      types: [COMPONENT_MIME],
    });
    expect(screen.getByTestId('frame-drop-target')).toBeInTheDocument();

    dispatchDragEvent('drop', layer, {
      clientX: 100,
      clientY: 100,
      types: [COMPONENT_MIME],
      getData: () => 'button',
    });
    expect(props.onDropAt).toHaveBeenCalledWith('button', 104, 104, 'frame');
  });

  it('reparents a directly dragged layer when released over a frame', () => {
    const frame = makeContainer('frame', [], { x: 24, y: 24, w: 220, h: 220 });
    const button = makeButton('button', { x: 280, y: 280 });
    const props = canvasProps({ screen: makeScreen('screen_1', [frame, button]) });
    render(<EditorCanvas {...props} />);

    const shim = screen.getByTestId('interaction-button');
    fireEvent.pointerDown(shim, { clientX: 300, clientY: 300 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 }));
    });
    expect(screen.getByTestId('frame-drop-target')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'));
    });

    expect(props.onReparentNode).toHaveBeenCalledWith('button', 'frame', { x: 84, y: 80 });
  });

  it('positions selection handles for a nested frame child', () => {
    const child = makeButton('child', { x: 16, y: 24, w: 120, h: 44 });
    const frame = makeContainer('frame', [child], { x: 40, y: 56, w: 240, h: 220 });
    render(
      <EditorCanvas
        {...canvasProps({
          screen: makeScreen('screen_1', [frame]),
          selectedNodeId: 'child',
        })}
      />,
    );

    expect(screen.getByTestId('selection-outline')).toHaveStyle({
      left: '56px',
      top: '80px',
      width: '120px',
      height: '44px',
    });
    expect(screen.getByTestId('resize-handle-se')).toBeInTheDocument();
  });

  it('pans the canvas with Space-drag without moving a component', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);
    const viewport = screen.getByTestId('canvas-viewport');
    viewport.scrollLeft = 10;
    viewport.scrollTop = 20;

    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.pointerDown(screen.getByTestId('interaction-node_text'), {
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 75, clientY: 60 }));
    });
    expect(viewport.scrollLeft).toBe(35);
    expect(viewport.scrollTop).toBe(60);
    expect(props.onNodeMove).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new MouseEvent('pointerup')));
    fireEvent.keyUp(window, { code: 'Space' });
  });

  it('zooms with Ctrl/Command plus the mouse wheel', () => {
    const props = canvasProps({ zoom: 1 });
    render(<EditorCanvas {...props} />);

    const viewport = screen.getByTestId('canvas-viewport');
    const zoomWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -100,
    });
    act(() => viewport.dispatchEvent(zoomWheel));

    expect(zoomWheel.defaultPrevented).toBe(true);
    expect(props.onZoomChange).toHaveBeenCalledWith(1.25);

    const scrollWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
    act(() => viewport.dispatchEvent(scrollWheel));
    expect(scrollWheel.defaultPrevented).toBe(false);
    expect(props.onZoomChange).toHaveBeenCalledTimes(1);
  });

  it('ignores drops that carry no Novy component payload', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    dispatchDragEvent('drop', screen.getByTestId('canvas-interactions'), {
      clientX: 96,
      clientY: 96,
      types: ['text/plain'],
      getData: () => 'button',
    });

    expect(props.onDropAt).not.toHaveBeenCalled();
  });

  it('rejects unknown component payloads without dispatching', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    dispatchDragEvent('drop', screen.getByTestId('canvas-interactions'), {
      clientX: 96,
      clientY: 96,
      types: [COMPONENT_MIME],
      getData: () => 'not-a-type',
    });

    expect(props.onDropAt).not.toHaveBeenCalled();
  });

  it('drives zoom, snap, and fit from the pill controls', () => {
    const props = canvasProps();
    render(<EditorCanvas {...props} />);

    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(props.onZoomChange).toHaveBeenLastCalledWith(1.25);

    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(props.onZoomChange).toHaveBeenLastCalledWith(0.75);

    fireEvent.click(screen.getByRole('button', { name: 'Fit' }));
    // jsdom reports no layout, so fit falls back to 1.
    expect(props.onZoomChange).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Snap' }));
    expect(props.onToggleSnap).toHaveBeenCalledTimes(1);
  });

  it('mounts the selection overlay for top-level selected nodes', () => {
    render(<EditorCanvas {...canvasProps({ selectedNodeId: 'node_text' })} />);

    const layer = screen.getByTestId('canvas-interactions');
    expect(within(layer).getByTestId('selection-outline')).toBeInTheDocument();
    expect(within(layer).getByRole('group', { name: 'Selection actions' })).toBeInTheDocument();
    expect(within(layer).getByTestId('resize-handle-se')).toBeInTheDocument();
  });

  it('shows the drop indicator passed through state', () => {
    render(<EditorCanvas {...canvasProps({ dropIndicator: { x: 96, y: 96 } })} />);

    expect(screen.getByTestId('drop-indicator').style.left).toBe('96px');
  });

  it('supports container children as shims at absolute positions', () => {
    const containerShim0 = makeContainer('cont_1', [
      makeButton('child_1', { x: 24, y: 48, w: 160, h: 44 }),
    ]);
    const screenTree: Screen = makeScreen('screen_1', [containerShim0]);
    render(<EditorCanvas {...canvasProps({ screen: screenTree })} />);

    expect(screen.getByTestId('interaction-cont_1')).toBeInTheDocument();
    const childShim = screen.getByTestId('interaction-child_1');
    expect(childShim.style.left).toBe('48px'); // container 24 + child 24
    expect(childShim.style.top).toBe('72px'); // container 24 + child 48
  });

  it('routes selected node actions through the overlay', () => {
    const props = canvasProps({ selectedNodeId: 'node_text' });
    render(<EditorCanvas {...props} />);

    fireEvent.click(screen.getByLabelText('Delete selected component'));
    fireEvent.click(screen.getByLabelText('Duplicate selected component'));
    fireEvent.click(screen.getByLabelText('Add behavior to selected component'));

    expect(props.onDeleteSelected).toHaveBeenCalledTimes(1);
    expect(props.onDuplicateSelected).toHaveBeenCalledTimes(1);
    expect(props.onAddBehavior).toHaveBeenCalledTimes(1);
  });

  it('shows alignment and pixel-distance feedback while dragging and clears it on release', () => {
    const peer = makeText('node_peer', {
      x: 400,
      y: 300,
      w: 160,
      props: { text: 'Peer', level: 'body' },
    });
    const props = canvasProps({
      screen: makeScreen('screen_1', [makeText('node_text'), peer]),
    });
    render(<EditorCanvas {...props} />);

    fireEvent.pointerDown(screen.getByTestId('interaction-node_text'), {
      clientX: 100,
      clientY: 100,
    });
    act(() => {
      // Candidate left is 403; the peer's left edge is at 400 (delta -3).
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 415, clientY: 100 }));
    });

    expect(props.onNodeMove).toHaveBeenLastCalledWith('node_text', 400, 96);
    expect(screen.getByTestId('alignment-guide')).toHaveAttribute('data-guide-axis', 'x');
    expect(screen.getByTestId('distance-indicator')).toHaveAttribute('data-distance-axis', 'y');
    expect(screen.getByTestId('distance-label')).toHaveTextContent('168 px');

    act(() => window.dispatchEvent(new MouseEvent('pointerup')));

    expect(screen.queryByTestId('alignment-guides')).not.toBeInTheDocument();
    expect(screen.queryByTestId('distance-indicators')).not.toBeInTheDocument();
  });
});
