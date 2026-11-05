import { describe, expect, it } from 'vitest';
import type { Project } from '@domain/entities/project';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import type { ScreenDTO } from '../dto/project.dto';
import {
  mapProjectFromDto,
  mapProjectToDto,
  mapProjectToSummary,
  mapScreenFromDto,
  mapScreenToDto,
} from './project.mapper';

const FIXTURE_SCREEN: Screen = {
  id: 'screen_1',
  name: 'Home',
  nodes: [
    {
      id: 'node_container',
      name: 'Hero frame',
      isLocked: true,
      type: 'container',
      x: 20,
      y: 20,
      w: 200,
      h: 120,
      props: {},
      children: [
        { id: 'node_text', name: 'Hero copy', isHidden: true, type: 'text', x: 8, y: 8, w: 100, h: 20, props: { text: 'Inside', level: 'body' } },
      ],
    },
    { id: 'node_button', type: 'button', x: 40, y: 200, w: 120, h: 44, props: { label: 'Save', variant: 'solid' } },
    {
      id: 'node_form',
      type: 'form',
      x: 40,
      y: 280,
      w: 320,
      h: 260,
      props: {
        title: 'Contact us',
        fields: [{ label: 'Email', placeholder: 'you@example.com', type: 'email' }],
        submitLabel: 'Send',
        dataBinding: {
          collectionId: 'contacts',
          fields: [{ formFieldIndex: 0, dataFieldId: 'email' }],
        },
      },
    },
    {
      id: 'node_list',
      type: 'list',
      x: 40,
      y: 560,
      w: 280,
      h: 180,
      props: {
        items: [],
        dataSource: { kind: 'collection', collectionId: 'contacts', displayFieldId: 'email' },
      },
    },
  ],
  behaviors: [{ id: 'behavior_1', name: 'Greet', event: 'click', graphId: 'graph_1', targetNodeId: 'node_button' }],
  logicGraphs: [
    {
      id: 'graph_1',
      name: 'Greet',
      sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'logic_trigger', event: 'click', position: { x: 80, y: 160 } },
        { kind: 'action', id: 'logic_action', position: { x: 312, y: 160 }, payload: { type: 'show-message', message: 'Hello!' } },
      ],
      edges: [{ id: 'edge_1', fromNodeId: 'logic_trigger', fromPort: 'next', toNodeId: 'logic_action', toPort: 'in' }],
    },
  ],
};

const FIXTURE_DOCUMENT: ProjectDocument = { screens: [FIXTURE_SCREEN] };

const FIXTURE_PROJECT: Project = {
  id: 'project_1',
  name: 'Demo App',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T12:30:00.000Z'),
  document: FIXTURE_DOCUMENT,
};

// Verify mappers survive real serialization (what localStorage / HTTP does).
function roundTrip(dto: unknown): unknown {
  return JSON.parse(JSON.stringify(dto));
}

describe('project mapper', () => {
  it('serializes dates to ISO strings on the wire', () => {
    const dto = mapProjectToDto(FIXTURE_PROJECT);

    expect(dto.createdAt).toBe('2026-01-01T10:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-01-02T12:30:00.000Z');
    expect(dto.schemaVersion).toBe(2);
  });

  it('round-trips projects losslessly', () => {
    const restored = mapProjectFromDto(mapProjectToDto(FIXTURE_PROJECT) as never);

    expect(restored).toEqual(FIXTURE_PROJECT);
  });

  it('round-trips through actual JSON serialization', () => {
    const dto = roundTrip(mapProjectToDto(FIXTURE_PROJECT));
    const restored = mapProjectFromDto(dto as never);

    expect(restored).toEqual(FIXTURE_PROJECT);
  });

  it('builds summaries for listings', () => {
    const summary = mapProjectToSummary(FIXTURE_PROJECT);

    expect(summary).toEqual({
      id: 'project_1',
      name: 'Demo App',
      createdAt: FIXTURE_PROJECT.createdAt,
      updatedAt: FIXTURE_PROJECT.updatedAt,
      screenCount: 1,
      previewScreen: FIXTURE_SCREEN,
    });
  });

  it('summarizes projects with no screens', () => {
    const empty: Project = { ...FIXTURE_PROJECT, document: { screens: [] } };
    const summary = mapProjectToSummary(empty);

    expect(summary.screenCount).toBe(0);
    expect(summary.previewScreen).toBeNull();
  });
});

describe('screen mapper', () => {
  it('round-trips screens with container children and logic', () => {
    const dto = roundTrip(mapScreenToDto(FIXTURE_SCREEN));

    expect(mapScreenFromDto(dto as ScreenDTO)).toEqual(FIXTURE_SCREEN);
  });

  it('migrates legacy positionless nodes and untyped edges deterministically', () => {
    const legacy = {
      id: 'legacy_screen',
      name: 'Legacy',
      nodes: [],
      behaviors: [],
      logicGraphs: [{
        id: 'legacy_graph',
        name: 'Legacy graph',
        sourceNodeId: 'button',
        nodes: [
          { kind: 'trigger' as const, id: 'trigger', event: 'click' as const },
          { kind: 'action' as const, id: 'action', payload: { type: 'show-message' as const, message: 'Hi' } },
        ],
        edges: [{ fromNodeId: 'trigger', toNodeId: 'action' }],
      }],
    } satisfies ScreenDTO;

    const migrated = mapScreenFromDto(legacy);
    const graph = migrated.logicGraphs[0]!;
    expect(graph.nodes[0]!.position).toEqual({ x: 80, y: 160 });
    expect(graph.nodes[1]!.position).toEqual({ x: 312, y: 160 });
    expect(graph.edges[0]).toEqual({
      id: 'edge_legacy_graph_1',
      fromNodeId: 'trigger',
      fromPort: 'next',
      toNodeId: 'action',
      toPort: 'in',
    });
  });
});
