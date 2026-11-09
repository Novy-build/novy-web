import { describe, expect, it } from 'vitest';
import { createEdgePadding, createPadding } from '@domain/entities/componentNode';
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
  path: '/',
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
    {
      id: 'node_button',
      appearance: { backgroundColor: '#112233', borderRadius: 12, opacity: 0.9 },
      responsive: { desktop: { x: 80, w: 180 } },
      type: 'button',
      x: 40,
      y: 200,
      w: 120,
      h: 44,
      props: { label: 'Save', variant: 'solid' },
    },
    {
      id: 'node_column',
      type: 'column',
      x: 40,
      y: 280,
      w: 320,
      h: 260,
      props: {
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
        gap: 12,
        padding: createPadding(16),
      },
      children: [
        { id: 'node_form_title', type: 'text', x: 0, y: 0, w: 288, h: 28, props: { text: 'Contact us', level: 'title' } },
        { id: 'node_form_email', type: 'input', x: 0, y: 0, w: 288, h: 44, props: { label: 'Email', placeholder: 'you@example.com', inputType: 'email', multiline: false } },
        { id: 'node_form_submit', type: 'button', x: 0, y: 0, w: 288, h: 44, props: { label: 'Send', variant: 'solid' } },
      ],
    },
    {
      id: 'node_list',
      type: 'listview',
      x: 40,
      y: 560,
      w: 280,
      h: 180,
      props: {
        emptyText: 'No contacts yet',
        showDividers: true,
        scrollDirection: 'vertical',
        crossAxisAlignment: 'stretch',
        gap: 0,
        padding: createPadding(0),
        itemSpacing: 6,
        itemBorderRadius: 10,
        dataSource: { kind: 'collection', collectionId: 'contacts', displayFieldIds: ['email'] },
      },
      children: [{ id: 'node_list_item', type: 'text', x: 0, y: 0, w: 280, h: 44, props: { text: 'Email', level: 'body' }, bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'email' } }] }],
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
        {
          kind: 'action',
          id: 'logic_action',
          position: { x: 312, y: 160 },
          payload: { type: 'show-message', message: 'Hello!' },
          inputMappings: { message: { source: 'session', path: 'user.name' } },
        },
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
    expect(dto.schemaVersion).toBe(12);
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

  it('round-trips menu, app-theme, record-ID mapping and delete confirmation settings', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    project.document.screens[0]!.nodes.push(
      { id: 'menu', type: 'dropdown', x: 0, y: 0, w: 44, h: 44, props: { label: 'Actions', placeholder: '', options: ['Edit', 'Delete'], selectedIndex: -1, presentation: 'menu' } },
      { id: 'theme', type: 'switch', x: 0, y: 0, w: 160, h: 44, appearance: { backgroundColor: '#ffffff', dark: { backgroundColor: '#222222' } }, props: { label: 'Dark mode', checked: false, controlsTheme: true } },
    );
    project.document.screens[0]!.logicGraphs[0]!.nodes.push({
      kind: 'action', id: 'delete', position: { x: 0, y: 0 },
      payload: { type: 'delete-record', collectionId: 'contacts', recordId: '', confirm: true },
      inputMappings: { '$recordId': { source: 'list-item', fieldId: '$id' } },
    });
    const restored = mapProjectFromDto(roundTrip(mapProjectToDto(project)) as ReturnType<typeof mapProjectToDto>);
    expect(restored).toEqual(project);
  });

  it('round-trips Gesture Detector children and current-record navigation', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    project.document.screens[0]!.nodes.push({
      id: 'note_gesture',
      type: 'gesture-detector',
      x: 8,
      y: 8,
      w: 240,
      h: 80,
      props: { semanticLabel: 'Open note details' },
      children: [{ id: 'note_card', type: 'container', x: 0, y: 0, w: 240, h: 80, props: {}, children: [] }],
    });
    project.document.screens[0]!.logicGraphs[0]!.nodes.push({
      kind: 'action',
      id: 'open_note',
      position: { x: 544, y: 160 },
      payload: {
        type: 'navigate',
        targetScreenId: 'screen_detail',
        recordContext: { collectionId: 'contacts', recordId: '' },
      },
      inputMappings: { '$recordId': { source: 'list-item', fieldId: '$id' } },
    });

    const restored = mapProjectFromDto(roundTrip(mapProjectToDto(project)) as ReturnType<typeof mapProjectToDto>);
    expect(restored).toEqual(project);
  });

  it('round-trips asymmetric per-side padding without flattening it', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    const column = project.document.screens[0]!.nodes.find((node) => node.id === 'node_column');
    if (column?.type !== 'column') throw new Error('Fixture column is missing');
    column.props.padding = createEdgePadding({ top: 4, right: 8, bottom: 12, left: 16 });

    const dto = mapProjectToDto(project);
    expect(dto.screens[0]!.nodes.find((node) => node.id === 'node_column')).toMatchObject({
      props: { padding: { mode: 'only', top: 4, right: 8, bottom: 12, left: 16 } },
    });
    expect(mapProjectFromDto(roundTrip(dto) as ReturnType<typeof mapProjectToDto>)).toEqual(project);
  });

  it('round-trips layout border styles on appearance', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    const column = project.document.screens[0]!.nodes.find((node) => node.id === 'node_column');
    if (column?.type !== 'column') throw new Error('Fixture column is missing');
    column.appearance = { borderColor: '#112233', borderStyle: 'dashed', borderRadius: 8 };

    const dto = mapProjectToDto(project);
    expect(dto.screens[0]!.nodes.find((node) => node.id === 'node_column')).toMatchObject({
      appearance: { borderColor: '#112233', borderStyle: 'dashed', borderRadius: 8 },
    });
    expect(mapProjectFromDto(roundTrip(dto) as ReturnType<typeof mapProjectToDto>)).toEqual(project);
  });

  it('round-trips curated button icons and icon position', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    const button = project.document.screens[0]!.nodes.find((node) => node.id === 'node_button');
    if (button?.type !== 'button') throw new Error('Fixture button is missing');
    button.props = { ...button.props, icon: 'check', iconPosition: 'right' };

    const dto = mapProjectToDto(project);
    expect(dto.screens[0]!.nodes.find((node) => node.id === 'node_button')).toMatchObject({
      props: { label: 'Save', variant: 'solid', icon: 'check', iconPosition: 'right' },
    });
    expect(mapProjectFromDto(roundTrip(dto) as ReturnType<typeof mapProjectToDto>)).toEqual(project);
  });

  it('ignores unknown persisted button icons at the data boundary', () => {
    const dto = mapProjectToDto(FIXTURE_PROJECT);
    const button = dto.screens[0]!.nodes.find((node) => node.id === 'node_button');
    if (button?.type !== 'button') throw new Error('Fixture button is missing');
    button.props.icon = 'rocket' as typeof button.props.icon;

    const restored = mapProjectFromDto(dto);
    const node = restored.document.screens[0]!.nodes.find((candidate) => candidate.id === 'node_button');
    expect(node?.type === 'button' ? node.props : null).toEqual({ label: 'Save', variant: 'solid' });
  });

  it('round-trips text font size and weight overrides', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    const column = project.document.screens[0]!.nodes.find((node) => node.id === 'node_column');
    if (column?.type !== 'column') throw new Error('Fixture column is missing');
    const text = column.children.find((node) => node.id === 'node_form_title');
    if (text?.type !== 'text') throw new Error('Fixture text is missing');
    text.props = { ...text.props, fontSize: 32, fontWeight: 'bold' };

    const dto = mapProjectToDto(project);
    const dtoColumn = dto.screens[0]!.nodes.find((node) => node.id === 'node_column');
    if (dtoColumn?.type !== 'column') throw new Error('DTO column is missing');
    expect(dtoColumn.children.find((node) => node.id === 'node_form_title')).toMatchObject({
      props: { text: 'Contact us', level: 'title', fontSize: 32, fontWeight: 'bold' },
    });
    expect(mapProjectFromDto(roundTrip(dto) as ReturnType<typeof mapProjectToDto>)).toEqual(project);
  });

  it('ignores invalid persisted text typography values', () => {
    const dto = mapProjectToDto(FIXTURE_PROJECT);
    const column = dto.screens[0]!.nodes.find((node) => node.id === 'node_column');
    if (column?.type !== 'column') throw new Error('DTO column is missing');
    const text = column.children.find((node) => node.id === 'node_form_title');
    if (text?.type !== 'text') throw new Error('DTO text is missing');
    text.props.fontSize = -4;
    text.props.fontWeight = 'ultra' as typeof text.props.fontWeight;

    const restored = mapProjectFromDto(dto);
    const restoredColumn = restored.document.screens[0]!.nodes.find((node) => node.id === 'node_column');
    if (restoredColumn?.type !== 'column') throw new Error('Restored column is missing');
    const restoredText = restoredColumn.children.find((node) => node.id === 'node_form_title');
    expect(restoredText?.type === 'text' ? restoredText.props : null).toEqual({ text: 'Contact us', level: 'title' });
  });

  it('preserves schema-v9 dropdown and switch behavior when new options are absent', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    project.document.screens[0]!.nodes.push(
      { id: 'select', type: 'dropdown', x: 0, y: 0, w: 100, h: 44, props: { label: 'Choice', placeholder: 'Choose', options: ['A'], selectedIndex: -1 } },
      { id: 'toggle', type: 'switch', x: 0, y: 0, w: 100, h: 44, props: { label: 'Toggle', checked: false } },
    );
    const dto = mapProjectToDto(project);
    dto.schemaVersion = 9;
    expect(mapProjectFromDto(dto)).toEqual(project);
  });

  it('round-trips typed Add Local List Item actions', () => {
    const project = structuredClone(FIXTURE_PROJECT);
    project.document.screens[0]!.logicGraphs[0]!.nodes.push({
      kind: 'action',
      id: 'add_local_item',
      position: { x: 544, y: 160 },
      payload: {
        type: 'add-local-list-item',
        targetNodeId: 'node_static_list',
        placement: 'prepend',
        values: { title: 'Draft', priority: 2, selected: true, due: null },
      },
      inputMappings: { title: { source: 'component', nodeId: 'node_form_email', property: 'value' } },
    });

    const restored = mapProjectFromDto(roundTrip(mapProjectToDto(project)) as ReturnType<typeof mapProjectToDto>);
    const action = restored.document.screens[0]!.logicGraphs[0]!.nodes.find((node) => node.id === 'add_local_item');
    expect(action).toEqual(project.document.screens[0]!.logicGraphs[0]!.nodes.at(-1));
  });

  it('assigns unique routes while loading legacy projects with repeated screen names', () => {
    const dto = mapProjectToDto({
      ...FIXTURE_PROJECT,
      document: {
        screens: [
          FIXTURE_SCREEN,
          { ...FIXTURE_SCREEN, id: 'screen_2', path: '/copy' },
        ],
      },
    });
    dto.screens.forEach((candidate) => delete candidate.path);

    expect(mapProjectFromDto(dto).document.screens.map((screen) => screen.path)).toEqual([
      '/',
      '/home',
    ]);
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

  it('round-trips camera components and biometric action payloads', () => {
    const biometricScreen: Screen = {
      id: 'screen_biometric',
      name: 'Unlock',
      path: '/unlock',
      nodes: [{
        id: 'camera_face',
        type: 'camera',
        x: 24,
        y: 24,
        w: 320,
        h: 220,
        props: { label: 'Face camera', facingMode: 'user', captureLabel: 'Capture face' },
      }],
      behaviors: [{
        id: 'behavior_capture',
        name: 'Verify face',
        event: 'change',
        graphId: 'graph_capture',
        targetNodeId: 'camera_face',
      }],
      logicGraphs: [{
        id: 'graph_capture',
        name: 'Verify face',
        sourceNodeId: 'camera_face',
        nodes: [
          { kind: 'trigger', id: 'trigger_capture', event: 'change', position: { x: 80, y: 160 } },
          {
            kind: 'action',
            id: 'verify_capture',
            position: { x: 312, y: 160 },
            payload: { type: 'cv-verify', mediaReference: '', userId: 'preview-user', threshold: 0.9 },
            inputMappings: {
              mediaReference: { source: 'component', nodeId: 'camera_face', property: 'value' },
            },
          },
        ],
        edges: [{
          id: 'edge_capture',
          fromNodeId: 'trigger_capture',
          fromPort: 'next',
          toNodeId: 'verify_capture',
          toPort: 'in',
        }],
      }],
    };

    const dto = roundTrip(mapScreenToDto(biometricScreen));
    expect(mapScreenFromDto(dto as ScreenDTO)).toEqual(biometricScreen);
  });

  it('migrates schema-v3 monolithic RAG nodes into deterministic granular chains', () => {
    const legacy: ScreenDTO = {
      id: 'screen_legacy_rag',
      name: 'Legacy RAG',
      path: '/legacy-rag',
      nodes: [],
      behaviors: [],
      logicGraphs: [{
        id: 'graph_legacy_rag',
        name: 'Legacy RAG',
        sourceNodeId: '',
        nodes: [
          { kind: 'trigger', id: 'trigger_legacy', event: 'load', position: { x: 80, y: 160 } },
          { kind: 'action', id: 'legacy_index', payload: { type: 'rag-index', knowledgeBaseId: 'notes-index', documentId: 'note-1', title: 'First', content: 'Hello' }, position: { x: 312, y: 160 } },
          { kind: 'action', id: 'after_index', payload: { type: 'show-message', message: 'Done' }, position: { x: 544, y: 160 } },
        ],
        edges: [
          { id: 'edge_legacy_1', fromNodeId: 'trigger_legacy', fromPort: 'next', toNodeId: 'legacy_index', toPort: 'in' },
          { id: 'edge_legacy_2', fromNodeId: 'legacy_index', fromPort: 'success', toNodeId: 'after_index', toPort: 'in' },
        ],
      }],
    };

    const migrated = mapScreenFromDto(legacy);
    const graph = migrated.logicGraphs[0]!;
    const actionTypes = graph.nodes.flatMap((node) => node.kind === 'action' ? [node.payload.type] : []);

    expect(graph.purpose).toBe('ingestion');
    expect(actionTypes).toEqual([
      'document-load',
      'text-split',
      'embedding-generate',
      'vector-upsert',
      'show-message',
    ]);
    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'legacy_index',
      'legacy_index__split',
      'legacy_index__embedding',
      'legacy_index__upsert',
    ]));
    expect(graph.edges.some((edge) =>
      edge.fromNodeId === 'legacy_index__upsert' && edge.toNodeId === 'after_index')).toBe(true);
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
    expect(migrated.path).toBe('/');
  });

  it('migrates non-home legacy routes and async next ports', () => {
    const legacy = {
      id: 'legacy_settings',
      name: 'Account Settings',
      nodes: [],
      behaviors: [],
      logicGraphs: [{
        id: 'legacy_email_graph',
        name: 'Email',
        sourceNodeId: 'button',
        nodes: [
          { kind: 'trigger' as const, id: 'trigger', event: 'click' as const, position: { x: 80, y: 160 } },
          {
            kind: 'action' as const,
            id: 'email',
            payload: { type: 'send-email' as const, to: 'ada@example.com', subject: 'Hi', body: 'Hello' },
            position: { x: 312, y: 160 },
          },
          {
            kind: 'action' as const,
            id: 'toast',
            payload: { type: 'show-message' as const, message: 'Sent' },
            position: { x: 544, y: 160 },
          },
        ],
        edges: [
          { id: 'edge_1', fromNodeId: 'trigger', fromPort: 'next' as const, toNodeId: 'email', toPort: 'in' as const },
          { id: 'edge_2', fromNodeId: 'email', fromPort: 'next' as const, toNodeId: 'toast', toPort: 'in' as const },
        ],
      }],
    } satisfies ScreenDTO;

    const migrated = mapScreenFromDto(legacy, 1);
    expect(migrated.path).toBe('/account-settings');
    expect(migrated.logicGraphs[0]!.edges[1]!.fromPort).toBe('success');
  });
});
