import { describe, expect, it } from 'vitest';

import { mapProjectFromDto, mapProjectToDto } from './project.mapper';

function legacyProjectDto() {
  return {
    id: 'legacy_project',
    name: 'Legacy',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    screens: [{
      id: 'screen_1',
      name: 'Home',
      nodes: [
        { id: 'node_text', type: 'text', x: 10, y: 10, w: 120, h: 30, props: { text: 'Hello', level: 'body' } },
        { id: 'node_button', type: 'button', x: 10, y: 60, w: 120, h: 40, props: { label: 'Click', variant: 'solid' } },
      ],
      behaviors: [{
        id: 'behavior_1',
        name: 'On click',
        event: 'click',
        graphId: 'graph_1',
        targetNodeId: 'node_button',
      }],
      logicGraphs: [{
        id: 'graph_1',
        name: 'On click',
        sourceNodeId: 'node_button',
        nodes: [
          { kind: 'trigger', id: 'trigger', event: 'click' },
          { kind: 'action', id: 'action', payload: { type: 'change-text', targetNodeId: 'node_text', text: 'Changed' } },
        ],
        edges: [{ fromNodeId: 'trigger', toNodeId: 'action' }],
      }],
    }],
  };
}

describe('project migration', () => {
  it('migrates legacy DTOs without losing supported data', () => {
    const restored = mapProjectFromDto(legacyProjectDto() as never);
    const graph = restored.document.screens[0]!.logicGraphs[0]!;
    expect(graph.nodes[0]).toMatchObject({ kind: 'trigger', position: { x: 80, y: 160 } });
    expect(graph.nodes[1]).toMatchObject({ kind: 'action', position: { x: 312, y: 160 } });
    expect(graph.edges[0]).toMatchObject({
      id: 'edge_graph_1_1',
      fromPort: 'next',
      toPort: 'in',
    });
    expect(restored.document.screens[0]!.nodes).toHaveLength(2);
  });

  it('round-trips migrated documents losslessly', () => {
    const restored = mapProjectFromDto(legacyProjectDto() as never);
    const repersisted = mapProjectToDto(restored);
    const reloaded = mapProjectFromDto(repersisted);
    expect(reloaded).toEqual(restored);
  });
});
