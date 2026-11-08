import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  LogicEdge,
  LogicGraph,
  LogicInputPort,
  LogicNode,
  LogicOutputPort,
  LogicResourcePort,
} from '@domain/entities/logic';
import {
  canConnectLogicPorts,
  connectLogicPorts,
  outputPortsFor,
  resourceInputPortsFor,
  resourceOutputPortsFor,
} from '@domain/logic/graph';
import { logicNodeTitle } from './logicLabels';
import {
  LOGIC_NODE_MIME,
  logicNodeDefinition,
  type LogicLibraryNode,
} from './logicNodeRegistry';

const CARD = { w: 192, h: 96 };
const CONDITION_HEIGHT = 124;
const RESOURCE_CARD = { w: 168, h: 76 };
const RESOURCE_PORT_SLOT_WIDTH = 80;
const DRAG_THRESHOLD = 4;

interface LogicGraphCanvasProps {
  graph: LogicGraph;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onDropLibraryNode: (node: LogicLibraryNode, position: { x: number; y: number }) => void;
  onNodeDragStart: () => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onConnect: (fromNodeId: string, fromPort: LogicOutputPort, toNodeId: string, toPort?: LogicInputPort) => void;
  onDeleteEdge: (edgeId: string) => void;
  targetLabelFor: (nodeId: string) => string | null;
  screenNameFor: (screenId: string) => string | null;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface ConnectionSource {
  nodeId: string;
  port: LogicOutputPort;
}

export function LogicGraphCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  onDropLibraryNode,
  onNodeDragStart,
  onMoveNode,
  onConnect,
  onDeleteEdge,
  targetLabelFor,
  screenNameFor,
}: LogicGraphCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const spacePressed = useRef(false);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [connectionSource, setConnectionSource] = useState<ConnectionSource | null>(null);
  const [connectionPoint, setConnectionPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      );
    }
    function down(event: KeyboardEvent): void {
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.code === 'Space') {
        spacePressed.current = true;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEdgeId) {
          event.preventDefault();
          onDeleteEdge(selectedEdgeId);
          setSelectedEdgeId(null);
          return;
        }
        if (selectedNodeId) {
          const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);
          if (selectedNode && selectedNode.kind !== 'trigger') {
            event.preventDefault();
            onDeleteNode(selectedNodeId);
            onSelectNode(null);
          }
          return;
        }
      }
      if (event.key === 'Escape') {
        setConnectionSource(null);
        setConnectionPoint(null);
        onSelectNode(null);
        setSelectedEdgeId(null);
      }
    }
    function up(event: KeyboardEvent): void {
      if (event.code === 'Space') {
        spacePressed.current = false;
      }
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [graph, onDeleteEdge, onDeleteNode, onSelectNode, selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    function handleWheel(event: WheelEvent): void {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      setViewport((current) => ({
        ...current,
        zoom: clampZoom(current.zoom + (event.deltaY < 0 ? 0.1 : -0.1)),
      }));
    }
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, []);

  function worldPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = stageRef.current?.getBoundingClientRect();
    return {
      x: (clientX - (rect?.left ?? 0) - viewport.x) / viewport.zoom,
      y: (clientY - (rect?.top ?? 0) - viewport.y) / viewport.zoom,
    };
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 1 && !spacePressed.current) {
      return;
    }
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, viewport };
    function move(moveEvent: PointerEvent): void {
      setViewport({
        ...start.viewport,
        x: start.viewport.x + moveEvent.clientX - start.x,
        y: start.viewport.y + moveEvent.clientY - start.y,
      });
    }
    function finish(): void {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
  }

  function handleLibraryDragOver(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes(LOGIC_NODE_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleLibraryDrop(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes(LOGIC_NODE_MIME)) return;
    event.preventDefault();
    const definition = logicNodeDefinition(event.dataTransfer.getData(LOGIC_NODE_MIME));
    if (definition) {
      onDropLibraryNode(definition.create(), worldPoint(event.clientX, event.clientY));
    }
  }

  function beginNodeDrag(event: ReactPointerEvent<HTMLDivElement>, node: LogicNode): void {
    if (event.button !== 0 || spacePressed.current) {
      return;
    }
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, position: node.position };
    let started = false;
    function move(moveEvent: PointerEvent): void {
      const dx = (moveEvent.clientX - start.x) / viewport.zoom;
      const dy = (moveEvent.clientY - start.y) / viewport.zoom;
      if (!started) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
          return;
        }
        started = true;
        onNodeDragStart();
      }
      onMoveNode(node.id, Math.max(16, start.position.x + dx), Math.max(16, start.position.y + dy));
    }
    function finish(): void {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      if (!started) {
        onSelectNode(node.id);
      }
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
  }

  function requestConnection(source: ConnectionSource, toNodeId: string, toPort: LogicInputPort = 'in'): void {
    const valid = connectLogicPorts(graph, source.nodeId, source.port, toNodeId, toPort);
    if (!valid) {
      setFeedback('That connection is invalid or would create a cycle.');
      return;
    }
    onConnect(source.nodeId, source.port, toNodeId, toPort);
    setFeedback('Connection created.');
    setConnectionSource(null);
    setConnectionPoint(null);
  }

  function beginConnection(
    event: ReactPointerEvent<HTMLButtonElement>,
    source: ConnectionSource,
  ): void {
    event.stopPropagation();
    setConnectionSource(source);
    setConnectionPoint(worldPoint(event.clientX, event.clientY));
    function move(moveEvent: PointerEvent): void {
      setConnectionPoint(worldPoint(moveEvent.clientX, moveEvent.clientY));
    }
    function finish(upEvent: PointerEvent): void {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      const element = upEvent.target instanceof Element
        ? upEvent.target.closest<HTMLElement>('[data-input-node]')
        : null;
      const targetId = element?.dataset.inputNode;
      const targetPort = element?.dataset.inputPort as LogicInputPort | undefined;
      if (targetId) {
        requestConnection(source, targetId, targetPort ?? 'in');
      } else {
        setConnectionPoint(null);
      }
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
  }

  function fitView(): void {
    const stage = stageRef.current;
    if (!stage || stage.clientWidth <= 0 || stage.clientHeight <= 0 || graph.nodes.length === 0) {
      return;
    }
    const minX = Math.min(...graph.nodes.map((node) => node.position.x));
    const minY = Math.min(...graph.nodes.map((node) => node.position.y));
    const maxX = Math.max(...graph.nodes.map((node) => node.position.x + nodeWidth(node)));
    const maxY = Math.max(...graph.nodes.map((node) => node.position.y + nodeHeight(node)));
    const zoom = clampZoom(Math.min((stage.clientWidth - 96) / (maxX - minX), (stage.clientHeight - 96) / (maxY - minY)));
    setViewport({ x: 48 - minX * zoom, y: 48 - minY * zoom, zoom });
  }

  useEffect(() => {
    fitView();
    // Fit when opening/switching workflows; user pan/zoom remains untouched afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.id]);

  const temporaryStart = connectionSource
    ? connectionSourcePoint(graph.nodes.find((node) => node.id === connectionSource.nodeId), connectionSource.port)
    : null;

  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden"
      data-testid="logic-stage"
      onDragOver={handleLibraryDragOver}
      onDrop={handleLibraryDrop}
      onPointerDown={beginPan}
      ref={stageRef}
      style={{
        backgroundImage: 'radial-gradient(circle, var(--color-grid-dot) 1px, transparent 1px)',
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        backgroundSize: `${16 * viewport.zoom}px ${16 * viewport.zoom}px`,
      }}
    >
      <div
        className="absolute inset-0"
        data-testid="logic-world"
        onPointerDown={(event) => {
          if (event.button !== 0 || spacePressed.current || event.target !== event.currentTarget) {
            return;
          }
          onSelectNode(null);
          setSelectedEdgeId(null);
        }}
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}
      >
        <svg aria-label="Logic connections" className="absolute left-0 top-0 overflow-visible" height="1" width="1">
          {graph.edges.map((edge) => (
            <LogicEdgePath
              edge={edge}
              graph={graph}
              isSelected={selectedEdgeId === edge.id}
              key={edge.id}
              onSelect={() => {
                onSelectNode(null);
                setSelectedEdgeId(edge.id);
              }}
            />
          ))}
          {temporaryStart && connectionPoint ? (
            <path
              className="text-brand-500"
              d={bezierPath(temporaryStart, connectionPoint)}
              fill="none"
              stroke="currentColor"
              strokeDasharray="5 4"
              strokeWidth={2}
            />
          ) : null}
        </svg>

        {graph.nodes.map((node) => (
          <div
            className={`absolute rounded-panel border shadow-sm ${isResourceOnlyNode(node) ? 'bg-canvas' : 'bg-surface'} ${
              selectedNodeId === node.id ? 'border-brand-600 ring-2 ring-brand-500' : 'border-hairline'
            }`}
            key={node.id}
            onPointerDown={(event) => beginNodeDrag(event, node)}
            style={{ height: nodeHeight(node), left: node.position.x, top: node.position.y, width: nodeWidth(node) }}
          >
            {node.kind !== 'trigger' && !isResourceOnlyNode(node) ? (
              <button
                aria-label={`Input of ${logicNodeTitle(node)}`}
                className={`absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-surface ${
                  connectionSource
                    ? canConnectLogicPorts(
                        graph,
                        connectionSource.nodeId,
                        connectionSource.port,
                        node.id,
                      )
                      ? 'border-emerald-500 ring-2 ring-emerald-200'
                      : 'border-red-500'
                    : 'border-brand-600'
                }`}
                data-input-node={node.id}
                data-connection-valid={
                  connectionSource
                    ? canConnectLogicPorts(
                        graph,
                        connectionSource.nodeId,
                        connectionSource.port,
                        node.id,
                      )
                    : undefined
                }
                data-input-port="in"
                onClick={() => connectionSource && requestConnection(connectionSource, node.id, 'in')}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              />
            ) : null}

            <button
              aria-label={logicNodeTitle(node)}
              className="h-full w-full rounded-panel p-3 text-left"
              data-testid={`logic-node-${node.id}`}
              onClick={() => {
                setSelectedEdgeId(null);
                onSelectNode(node.id);
              }}
              type="button"
            >
              <span className="block text-sm font-semibold text-ink">{logicNodeTitle(node)}</span>
              <span className="mt-1 block truncate text-xs text-ink-muted">
                {detailFor(node, targetLabelFor, screenNameFor)}
              </span>
            </button>

            {canvasControlOutputPorts(node).map((port) => (
              <button
                aria-label={`${port} output of ${logicNodeTitle(node)}`}
                className={`absolute -right-2 h-4 w-4 rounded-full border-2 bg-surface ${
                  connectionSource?.nodeId === node.id && connectionSource.port === port
                    ? 'border-brand-600 bg-brand-100'
                    : 'border-ink-muted'
                }`}
                data-output-node={node.id}
                data-output-port={port}
                key={port}
                onClick={() => setConnectionSource({ nodeId: node.id, port })}
                onPointerDown={(event) => beginConnection(event, { nodeId: node.id, port })}
                style={{ top: outputPortTop(node, port) }}
                type="button"
              >
                <span className="sr-only">{port}</span>
              </button>
            ))}
            {canvasControlOutputPorts(node).length > 1
              ? canvasControlOutputPorts(node).map((port) => (
                  <span
                    className="absolute right-3 text-[10px] font-medium text-ink-muted"
                    key={`label-${port}`}
                    style={{ top: outputPortTop(node, port) + 7 }}
                  >
                    {port}
                  </span>
                ))
              : null}

            {resourceInputPortsFor(node).map((port, index, ports) => (
              <span
                className="absolute bottom-0"
                data-resource-port-anchor={port}
                key={`resource-input-${port}`}
                style={{ left: resourcePortLeft(index, ports.length, nodeWidth(node)) }}
              >
                <button
                  aria-label={`${port} resource input of ${logicNodeTitle(node)}`}
                  className={`absolute -bottom-2 h-4 w-4 -translate-x-1/2 rounded-full border-2 bg-surface ${
                    connectionSource
                      ? canConnectLogicPorts(graph, connectionSource.nodeId, connectionSource.port, node.id, port)
                        ? 'border-cyan-500 ring-2 ring-cyan-200'
                        : 'border-red-500'
                      : 'border-cyan-600'
                  }`}
                  data-input-node={node.id}
                  data-input-port={port}
                  onClick={() => connectionSource && requestConnection(connectionSource, node.id, port)}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                />
                <span
                  className="pointer-events-none absolute top-3 w-20 -translate-x-1/2 truncate text-center text-[9px] text-ink-muted"
                  data-resource-port-label={port}
                  title={port}
                >
                  {port}
                </span>
              </span>
            ))}

            {resourceOutputPortsFor(node).map((port, index, ports) => (
              <span
                className="absolute top-0"
                data-resource-port-anchor={port}
                key={`resource-output-${port}`}
                style={{ left: resourcePortLeft(index, ports.length, nodeWidth(node)) }}
              >
                <button
                  aria-label={`${port} resource output of ${logicNodeTitle(node)}`}
                  className={`absolute -top-2 h-4 w-4 -translate-x-1/2 rounded-full border-2 bg-surface ${
                    connectionSource?.nodeId === node.id && connectionSource.port === port
                      ? 'border-cyan-600 bg-cyan-100'
                      : 'border-cyan-600'
                  }`}
                  data-output-node={node.id}
                  data-output-port={port}
                  onClick={() => setConnectionSource({ nodeId: node.id, port })}
                  onPointerDown={(event) => beginConnection(event, { nodeId: node.id, port })}
                  type="button"
                />
                <span
                  className="pointer-events-none absolute bottom-3 w-20 -translate-x-1/2 truncate text-center text-[9px] text-ink-muted"
                  data-resource-port-label={port}
                  title={port}
                >
                  {port}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="absolute left-4 top-4 z-30 flex flex-wrap gap-2 rounded-panel border border-hairline bg-surface p-2 shadow-sm">
        <button aria-label="Zoom out logic" className="px-2 text-sm" onClick={() => setViewport((current) => ({ ...current, zoom: clampZoom(current.zoom - 0.1) }))} type="button">−</button>
        <span aria-live="polite" className="min-w-10 py-1 text-center text-xs text-ink-muted">{Math.round(viewport.zoom * 100)}%</span>
        <button aria-label="Zoom in logic" className="px-2 text-sm" onClick={() => setViewport((current) => ({ ...current, zoom: clampZoom(current.zoom + 0.1) }))} type="button">+</button>
        <button className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-canvas" onClick={fitView} type="button">Fit</button>
      </div>

      <p aria-live="polite" className="sr-only">{feedback}</p>
      {feedback ? <p className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-xs text-surface">{feedback}</p> : null}
    </div>
  );
}

function LogicEdgePath({ edge, graph, isSelected, onSelect }: { edge: LogicEdge; graph: LogicGraph; isSelected: boolean; onSelect: () => void }) {
  const from = graph.nodes.find((node) => node.id === edge.fromNodeId);
  const to = graph.nodes.find((node) => node.id === edge.toNodeId);
  if (!from || !to) {
    return null;
  }
  const isResource = edge.kind === 'resource' || edge.toPort !== 'in';
  const start = isResource
    ? resourceOutputPoint(from, edge.fromPort as LogicResourcePort)
    : outputPoint(from, edge.fromPort);
  const end = isResource
    ? resourceInputPoint(to, edge.toPort as LogicResourcePort)
    : { x: to.position.x, y: to.position.y + nodeHeight(to) / 2 };
  if (!start || !end) return null;
  return (
    <path
      aria-label={`Connection from ${logicNodeTitle(from)} ${edge.fromPort} to ${logicNodeTitle(to)}`}
      className={isSelected ? 'text-brand-700' : 'text-brand-500'}
      d={bezierPath(start, end)}
      fill="none"
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(); }}
      role="button"
      stroke="currentColor"
      strokeDasharray={isResource ? '5 4' : undefined}
      strokeLinecap="round"
      strokeWidth={isSelected ? 4 : 2}
      tabIndex={0}
    />
  );
}

function detailFor(node: LogicNode, targetLabelFor: (nodeId: string) => string | null, screenNameFor: (screenId: string) => string | null): string {
  if (node.kind === 'trigger') return 'Starts the workflow';
  if (node.kind === 'condition') {
    const leftNodeId = node.left.source === 'component' || node.left.source === 'node-output'
      ? node.left.nodeId
      : '';
    const target = leftNodeId ? targetLabelFor(leftNodeId) ?? 'Choose a component' : node.left.source;
    return `${target} · ${node.operator}${node.compareValue ? ` · “${truncate(node.compareValue)}”` : ''}`;
  }
  switch (node.payload.type) {
    case 'change-text': return `${targetLabelFor(node.payload.targetNodeId) ?? 'Target not set'} → “${truncate(node.payload.text)}”`;
    case 'show-message': return node.payload.message ? `“${truncate(node.payload.message)}”` : 'Message not set';
    case 'navigate': return `Go to ${screenNameFor(node.payload.targetScreenId) ?? 'screen not set'}`;
    case 'get-records': return node.payload.collectionId ? `Read ${node.payload.collectionId}` : 'Collection not set';
    case 'insert-record': return node.payload.collectionId ? `Insert into ${node.payload.collectionId}` : 'Collection not set';
    case 'update-record': return node.payload.collectionId ? `Update ${node.payload.collectionId}` : 'Collection not set';
    case 'delete-record': return node.payload.collectionId ? `Delete from ${node.payload.collectionId}` : 'Collection not set';
    case 'send-email': return node.payload.to ? `Email ${node.payload.to}` : 'Recipient not set';
    case 'refresh-collection': return node.payload.collectionId ? `Refresh ${node.payload.collectionId}` : 'Collection not set';
    case 'set-variable': return node.payload.name ? `Set ${node.payload.name}` : 'Variable not set';
    case 'set-component-value': return node.payload.targetNodeId ? `Set ${node.payload.targetNodeId}` : 'Component not set';
    case 'add-local-list-item': return node.payload.targetNodeId
      ? `${node.payload.placement === 'prepend' ? 'Prepend to' : 'Append to'} ${targetLabelFor(node.payload.targetNodeId) ?? node.payload.targetNodeId}`
      : 'Static ListView not set';
    case 'document-load': return `${node.payload.source} document source`;
    case 'text-split': return `${node.payload.chunkSize} size · ${node.payload.chunkOverlap} overlap`;
    case 'embedding-generate': return node.payload.connectionProfileId || 'Embedding profile not set';
    case 'vector-upsert': return node.payload.indexName || 'Vector index not set';
    case 'vector-delete': return node.payload.documentId || 'Document not set';
    case 'chat-input': return node.payload.componentId ? `Read ${targetLabelFor(node.payload.componentId) ?? node.payload.componentId}` : 'Input not set';
    case 'query-embedding': return node.payload.connectionProfileId || 'Embedding profile not set';
    case 'vector-retrieve': return `Top ${node.payload.topK} · score ≥ ${node.payload.minimumScore}`;
    case 'rerank': return `Top ${node.payload.topN} · score ≥ ${node.payload.minimumScore}`;
    case 'prompt-template': return truncate(node.payload.template);
    case 'llm-generate': return node.payload.connectionProfileId || 'LLM profile not set';
    case 'chat-output': return node.payload.targetNodeId ? `Render to ${targetLabelFor(node.payload.targetNodeId) ?? node.payload.targetNodeId}` : 'Output target not set';
    case 'memory': return `${node.payload.operation} · ${node.payload.scope}`;
    case 'vector-store': return `${node.payload.operation} · ${node.payload.indexName || 'index not set'}`;
    case 'chat-model': return node.payload.connectionProfileId || 'Chat model profile not set';
    case 'ai-agent': return `${node.payload.maxIterations} max iterations`;
    case 'cv-liveness': return 'Check liveness';
    case 'cv-enroll': return 'Enroll biometric';
    case 'cv-verify': return 'Verify biometric';
    default: return '';
  }
}

function outputPoint(node: LogicNode | undefined, port: LogicOutputPort): { x: number; y: number } | null {
  return node ? { x: node.position.x + nodeWidth(node), y: node.position.y + outputPortTop(node, port) + 8 } : null;
}

function connectionSourcePoint(node: LogicNode | undefined, port: LogicOutputPort): { x: number; y: number } | null {
  if (!node) return null;
  return resourceOutputPortsFor(node).includes(port as LogicResourcePort)
    ? resourceOutputPoint(node, port as LogicResourcePort)
    : outputPoint(node, port);
}

function resourceOutputPoint(node: LogicNode | undefined, port: LogicResourcePort): { x: number; y: number } | null {
  if (!node) return null;
  const ports = resourceOutputPortsFor(node);
  const index = ports.indexOf(port);
  return index === -1 ? null : {
    x: node.position.x + resourcePortLeft(index, ports.length, nodeWidth(node)),
    y: node.position.y,
  };
}

function resourceInputPoint(node: LogicNode, port: LogicResourcePort): { x: number; y: number } | null {
  const ports = resourceInputPortsFor(node);
  const index = ports.indexOf(port);
  return index === -1 ? null : {
    x: node.position.x + resourcePortLeft(index, ports.length, nodeWidth(node)),
    y: node.position.y + nodeHeight(node),
  };
}

function outputPortTop(node: LogicNode, port: LogicOutputPort): number {
  const ports = outputPortsFor(node);
  if (ports.length === 1) return CARD.h / 2 - 8;
  return port === 'true' || port === 'success' ? 40 : 76;
}

function nodeHeight(node: LogicNode): number {
  if (isResourceOnlyNode(node)) return RESOURCE_CARD.h;
  return outputPortsFor(node).length > 1 ? CONDITION_HEIGHT : CARD.h;
}

function nodeWidth(node: LogicNode): number {
  const baseWidth = isResourceOnlyNode(node) ? RESOURCE_CARD.w : CARD.w;
  const resourcePortCount = Math.max(
    resourceInputPortsFor(node).length,
    resourceOutputPortsFor(node).length,
  );
  return Math.max(baseWidth, resourcePortCount * RESOURCE_PORT_SLOT_WIDTH);
}

function resourcePortLeft(index: number, count: number, width: number): number {
  const slotWidth = width / count;
  return (index + 0.5) * slotWidth;
}

function isResourceOnlyNode(node: LogicNode): boolean {
  if (node.kind !== 'action') return false;
  return node.payload.type === 'document-load' ||
    node.payload.type === 'text-split' ||
    node.payload.type === 'embedding-generate' ||
    node.payload.type === 'chat-model' ||
    node.payload.type === 'memory' ||
    node.payload.type === 'rerank' ||
    node.payload.type === 'prompt-template' ||
    (node.payload.type === 'vector-store' && node.payload.operation === 'retrieve-tool');
}

function canvasControlOutputPorts(node: LogicNode): readonly LogicOutputPort[] {
  return isResourceOnlyNode(node) ? [] : outputPortsFor(node);
}

function bezierPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const bend = Math.max(48, Math.abs(to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
}

function clampZoom(value: number): number {
  return Math.min(2, Math.max(0.4, Number(value.toFixed(2))));
}

function truncate(value: string, max = 24): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
