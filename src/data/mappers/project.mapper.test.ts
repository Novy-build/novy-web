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
      type: 'container',
      x: 20,
      y: 20,
      w: 200,
      h: 120,
      props: {},
      children: [
        { id: 'node_text', type: 'text', x: 8, y: 8, w: 100, h: 20, props: { text: 'Inside', level: 'body' } },
      ],
    },
    { id: 'node_button', type: 'button', x: 40, y: 200, w: 120, h: 44, props: { label: 'Save', variant: 'solid' } },
  ],
  behaviors: [{ id: 'behavior_1', name: 'Greet', event: 'click', graphId: 'graph_1', targetNodeId: 'node_button' }],
  logicGraphs: [
    {
      id: 'graph_1',
      name: 'Greet',
      sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'logic_trigger', event: 'click' },
        { kind: 'action', id: 'logic_action', payload: { type: 'show-message', message: 'Hello!' } },
      ],
      edges: [{ fromNodeId: 'logic_trigger', toNodeId: 'logic_action' }],
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
});
