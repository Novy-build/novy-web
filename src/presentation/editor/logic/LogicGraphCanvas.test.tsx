import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createActionNode, createBehaviorBundle } from '@domain/factories/logic';
import { connectLogicPorts } from '@domain/logic/graph';
import type { LogicGraph } from '@domain/entities/logic';
import { LogicGraphCanvas } from './LogicGraphCanvas';
import { LOGIC_NODE_MIME } from './logicNodeRegistry';

function graphWithOrphan(): LogicGraph {
  const graph = createBehaviorBundle('On click — Button', 'button', 'click').graph;
  const action = createActionNode(
    { type: 'show-message', message: 'Done' },
    { x: 360, y: 180 },
  );
  return { ...graph, nodes: [...graph.nodes, action] };
}

function renderCanvas(graph: LogicGraph = graphWithOrphan()) {
  const props = {
    graph,
    selectedNodeId: null,
    onSelectNode: vi.fn(),
    onDropLibraryNode: vi.fn(),
    onNodeDragStart: vi.fn(),
    onMoveNode: vi.fn(),
    onConnect: vi.fn(),
    onDeleteEdge: vi.fn(),
    onDeleteNode: vi.fn(),
    targetLabelFor: vi.fn(() => 'Input'),
    screenNameFor: vi.fn(() => 'About'),
  };
  const view = render(<LogicGraphCanvas {...props} />);
  return { ...props, ...view };
}

describe('LogicGraphCanvas', () => {
  it('connects ports through the keyboard-accessible output/input controls', () => {
    const graph = graphWithOrphan();
    const props = renderCanvas(graph);
    const trigger = graph.nodes[0]!;
    const action = graph.nodes[1]!;

    fireEvent.click(screen.getByRole('button', { name: 'next output of On click' }));
    const input = screen.getByRole('button', { name: 'Input of Show message' });
    expect(input).toHaveAttribute('data-connection-valid', 'true');
    fireEvent.click(input);

    expect(props.onConnect).toHaveBeenCalledWith(trigger.id, 'next', action.id, 'in');
    expect(screen.getAllByText('Connection created.')).toHaveLength(2);
  });

  it('supports pointer-drag connection creation', () => {
    const graph = graphWithOrphan();
    const props = renderCanvas(graph);
    const action = graph.nodes[1]!;
    const output = screen.getByRole('button', { name: 'next output of On click' });
    const input = screen.getByRole('button', { name: 'Input of Show message' });

    fireEvent.pointerDown(output, { clientX: 270, clientY: 208 });
    fireEvent.pointerUp(input, { clientX: 360, clientY: 228 });

    expect(props.onConnect).toHaveBeenCalledWith(graph.nodes[0]!.id, 'next', action.id, 'in');
  });

  it('renders and creates dashed typed resource connections', () => {
    const embedding = createActionNode({ type: 'embedding-generate', connectionProfileId: 'embed', model: 'model', batchSize: 32 }, { x: 120, y: 360 });
    const vectorStore = createActionNode({ type: 'vector-store', operation: 'upsert', connectionProfileId: 'vector', indexName: 'notes', namespace: '', documentInputMode: 'document-loader', conflictMode: 'upsert', documentId: '', topK: 5, minimumScore: 0 }, { x: 360, y: 160 });
    const graph: LogicGraph = {
      id: 'resource_graph', name: 'Resources', sourceNodeId: '', purpose: 'ingestion',
      nodes: [embedding, vectorStore],
      edges: [{ id: 'resource_edge', fromNodeId: embedding.id, fromPort: 'embeddings', toNodeId: vectorStore.id, toPort: 'embeddings', kind: 'resource' }],
    };
    const connectedView = renderCanvas(graph);

    expect(screen.getByRole('button', { name: 'embeddings resource output of Embedding model' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'embeddings resource input of Vector store' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connection from Embedding model embeddings to Vector store/ })).toHaveAttribute('stroke-dasharray', '5 4');
    connectedView.unmount();

    const props = renderCanvas({ ...graph, edges: [] });
    fireEvent.click(screen.getByRole('button', { name: 'embeddings resource output of Embedding model' }));
    fireEvent.click(screen.getByRole('button', { name: 'embeddings resource input of Vector store' }));
    expect(props.onConnect).toHaveBeenCalledWith(embedding.id, 'embeddings', vectorStore.id, 'embeddings');
  });

  it('reserves a non-overlapping slot for every resource-port label', () => {
    const agent = createActionNode(
      {
        type: 'ai-agent',
        instructions: 'Answer from the connected resources.',
        maxIterations: 4,
        returnIntermediateSteps: false,
      },
      { x: 120, y: 160 },
    );
    const graph: LogicGraph = {
      id: 'agent_graph',
      name: 'Agent',
      sourceNodeId: '',
      purpose: 'chat',
      nodes: [agent],
      edges: [],
    };
    const view = renderCanvas(graph);

    expect(screen.getByTestId(`logic-node-${agent.id}`).parentElement).toHaveStyle({ width: '320px' });
    const anchors = [...view.container.querySelectorAll<HTMLElement>('[data-resource-port-anchor]')];
    expect(anchors.map((anchor) => anchor.style.left)).toEqual(['40px', '120px', '200px', '280px']);
    for (const label of view.container.querySelectorAll('[data-resource-port-label]')) {
      expect(label).toHaveClass('w-20', 'truncate', 'text-center');
    }
  });

  it('moves a node with one drag-start transaction', () => {
    const graph = graphWithOrphan();
    const props = renderCanvas(graph);
    const action = graph.nodes[1]!;
    const card = screen.getByTestId(`logic-node-${action.id}`);

    fireEvent.pointerDown(card, { clientX: 360, clientY: 180 });
    act(() => window.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 220 })));
    act(() => window.dispatchEvent(new MouseEvent('pointermove', { clientX: 420, clientY: 240 })));
    act(() => window.dispatchEvent(new MouseEvent('pointerup')));

    expect(props.onNodeDragStart).toHaveBeenCalledTimes(1);
    expect(props.onMoveNode).toHaveBeenLastCalledWith(action.id, 420, 240);
  });

  it('selects an edge and deletes it from the keyboard', () => {
    const base = graphWithOrphan();
    const graph = connectLogicPorts(base, base.nodes[0]!.id, 'next', base.nodes[1]!.id)!;
    const props = renderCanvas(graph);

    fireEvent.click(screen.getByRole('button', { name: /Connection from On click next to Show message/ }));
    fireEvent.keyDown(window, { key: 'Delete' });

    expect(props.onDeleteEdge).toHaveBeenCalledWith(graph.edges[0]!.id);
  });

  it('deselects when clicking empty graph space', () => {
    const props = renderCanvas();

    fireEvent.pointerDown(screen.getByTestId('logic-world'));

    expect(props.onSelectNode).toHaveBeenCalledWith(null);
  });

  it('deletes a selected action node from the keyboard', () => {
    const graph = graphWithOrphan();
    const action = graph.nodes[1]!;
    const baseProps = {
      graph,
      selectedNodeId: action.id,
      onSelectNode: vi.fn(),
      onDeleteNode: vi.fn(),
      onDropLibraryNode: vi.fn(),
      onNodeDragStart: vi.fn(),
      onMoveNode: vi.fn(),
      onConnect: vi.fn(),
      onDeleteEdge: vi.fn(),
      targetLabelFor: vi.fn(() => 'Input'),
      screenNameFor: vi.fn(() => 'About'),
    };
    render(<LogicGraphCanvas {...baseProps} />);

    fireEvent.keyDown(window, { key: 'Backspace' });

    expect(baseProps.onDeleteNode).toHaveBeenCalledWith(action.id);
  });

  it('does not delete a trigger node from the keyboard', () => {
    const graph = graphWithOrphan();
    const trigger = graph.nodes[0]!;
    const baseProps = {
      graph,
      selectedNodeId: trigger.id,
      onSelectNode: vi.fn(),
      onDeleteNode: vi.fn(),
      onDropLibraryNode: vi.fn(),
      onNodeDragStart: vi.fn(),
      onMoveNode: vi.fn(),
      onConnect: vi.fn(),
      onDeleteEdge: vi.fn(),
      targetLabelFor: vi.fn(() => 'Input'),
      screenNameFor: vi.fn(() => 'About'),
    };
    render(<LogicGraphCanvas {...baseProps} />);

    fireEvent.keyDown(window, { key: 'Backspace' });

    expect(baseProps.onDeleteNode).not.toHaveBeenCalled();
  });

  it('accepts node-library drops and exposes pan/zoom controls', () => {
    const props = renderCanvas();
    const drop = new MouseEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: 320,
      clientY: 240,
    });
    Object.defineProperty(drop, 'dataTransfer', {
      value: {
        types: [LOGIC_NODE_MIME],
        getData: () => 'show-message',
      },
    });
    act(() => screen.getByTestId('logic-stage').dispatchEvent(drop));
    expect(props.onDropLibraryNode).toHaveBeenCalledWith(
      { kind: 'action', payload: { type: 'show-message', message: '' } },
      { x: 320, y: 240 },
    );

    const zoomWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: -100,
    });
    act(() => screen.getByTestId('logic-stage').dispatchEvent(zoomWheel));
    expect(zoomWheel.defaultPrevented).toBe(true);
    expect(screen.getByText('110%')).toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.pointerDown(screen.getByTestId('logic-stage'), { clientX: 100, clientY: 100 });
    act(() => window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 130 })));
    act(() => window.dispatchEvent(new MouseEvent('pointerup')));
    fireEvent.keyUp(window, { code: 'Space' });
    expect(screen.getByTestId('logic-world')).toHaveStyle({
      transform: 'translate(40px, 30px) scale(1.1)',
    });
  });

  it('announces invalid occupied-port connections', () => {
    const base = graphWithOrphan();
    const graph = connectLogicPorts(base, base.nodes[0]!.id, 'next', base.nodes[1]!.id)!;
    renderCanvas(graph);

    fireEvent.click(screen.getByRole('button', { name: 'next output of On click' }));
    fireEvent.click(screen.getByRole('button', { name: 'Input of Show message' }));

    expect(screen.getAllByText(/invalid or would create a cycle/)).toHaveLength(2);
  });
});
