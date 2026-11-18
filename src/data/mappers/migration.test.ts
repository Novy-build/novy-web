import { describe, expect, it } from 'vitest';

import { createPadding, geometryAtBreakpoint } from '@domain/entities/componentNode';
import { CV_STARTER_TEMPLATE } from '@data/templates/cvStarterTemplate';
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

  it('normalizes untouched Face verification starter projects to account-free device unlock', () => {
    const dto = mapProjectToDto({
      id: 'legacy_face_starter',
      name: 'Face verification',
      projectType: 'app',
      createdAt: new Date('2026-11-16T00:00:00Z'),
      updatedAt: new Date('2026-11-16T00:00:00Z'),
      document: { screens: structuredClone(CV_STARTER_TEMPLATE.screens) },
    });
    const registration = dto.screens.find((screen) => screen.id === 'screen_cv_registration')!;
    const test = dto.screens.find((screen) => screen.id === 'screen_cv_test')!;
    const registrationIntro = registration.nodes.find((node) => node.id === 'cv_registration_intro')!;
    if (registrationIntro.type !== 'text') throw new Error('Expected registration intro text.');
    registrationIntro.props.text = 'Capture a clear face image and grant consent to register the signed-in app user.';
    const registrationStatus = registration.nodes.find((node) => node.id === 'cv_registration_status')!;
    if (registrationStatus.type !== 'text') throw new Error('Expected registration status text.');
    registrationStatus.props.text = 'Registration status: sign in, capture a face, and grant consent.';
    const registrationCamera = registration.nodes.find((node) => node.id === 'cv_registration_camera')!;
    if (registrationCamera.type !== 'camera') throw new Error('Expected registration camera.');
    delete registrationCamera.props.captureMode;
    registrationCamera.props.captureLabel = 'Capture face';

    const testIntro = test.nodes.find((node) => node.id === 'cv_test_intro')!;
    if (testIntro.type !== 'text') throw new Error('Expected recognition intro text.');
    testIntro.props.text = 'Capture a face and enter the account email used by the enrolled app user.';
    const testCamera = test.nodes.find((node) => node.id === 'cv_test_camera')!;
    if (testCamera.type !== 'camera') throw new Error('Expected recognition camera.');
    delete testCamera.props.captureMode;
    testCamera.props.captureLabel = 'Capture face';
    test.nodes.push({
      id: 'cv_test_email',
      type: 'input',
      x: 24,
      y: 368,
      w: 342,
      h: 64,
      props: {
        label: 'Enrolled account email',
        placeholder: 'you@example.com',
        inputType: 'email',
        multiline: false,
      },
    });
    test.nodes.push({
      id: 'cv_test_verify',
      type: 'button',
      x: 24,
      y: 504,
      w: 342,
      h: 44,
      props: { label: 'Recognize face', variant: 'solid' },
    });
    for (const [id, y] of [
      ['cv_test_liveness', 448],
      ['cv_test_verify', 504],
      ['cv_test_status', 568],
      ['cv_test_back', 640],
    ] as const) {
      const node = test.nodes.find((candidate) => candidate.id === id)!;
      node.y = y;
      if (id === 'cv_test_verify' && node.type === 'button') node.props.label = 'Recognize face';
    }
    const verifyGraph = test.logicGraphs.find((graph) => graph.id === 'cv_test_graph_verify')!;
    verifyGraph.name = 'Recognize face';
    verifyGraph.sourceNodeId = 'cv_test_verify';
    const verifyTrigger = verifyGraph.nodes.find((node) => node.id === 'cv_test_verify_trigger')!;
    if (verifyTrigger.kind !== 'trigger') throw new Error('Expected CV Verify trigger.');
    verifyTrigger.event = 'click';
    const verifyBehavior = test.behaviors.find((behavior) => behavior.id === 'cv_test_behavior_verify')!;
    verifyBehavior.name = 'Recognize face';
    verifyBehavior.event = 'click';
    verifyBehavior.targetNodeId = 'cv_test_verify';
    const verify = verifyGraph.nodes.find((node) => node.id === 'cv_test_action_verify')!;
    if (verify.kind !== 'action' || verify.payload.type !== 'cv-verify') {
      throw new Error('Expected CV Verify action.');
    }
    verify.inputMappings = {
      ...verify.inputMappings,
      userId: { source: 'component', nodeId: 'cv_test_email', property: 'value' },
    };
    const recognized = verifyGraph.nodes.find((node) => node.id === 'cv_test_status_recognized')!;
    const verifyError = verifyGraph.nodes.find((node) => node.id === 'cv_test_status_verify_error')!;
    if (recognized.kind !== 'action' || recognized.payload.type !== 'change-text'
      || verifyError.kind !== 'action' || verifyError.payload.type !== 'change-text') {
      throw new Error('Expected recognition status actions.');
    }
    recognized.payload.text = 'Recognition result: Face recognized.';
    verifyError.payload.text = 'Recognition result: capture a face and enter the enrolled account email.';

    const restored = mapProjectFromDto(dto);
    const restoredRegistration = restored.document.screens.find((screen) => screen.id === registration.id)!;
    const restoredTest = restored.document.screens.find((screen) => screen.id === test.id)!;
    expect(restoredRegistration.nodes.find((node) => node.id === 'cv_registration_intro')).toMatchObject({
      props: { text: 'Capture a clear face image and grant consent. No account or email is required.' },
    });
    expect(restoredTest.nodes.some((node) => node.id === 'cv_test_email')).toBe(false);
    expect(restoredRegistration.nodes.find((node) => node.id === 'cv_registration_camera')).toMatchObject({
      props: { captureMode: 'guided-face', captureLabel: 'Capture now' },
    });
    expect(restoredTest.nodes.find((node) => node.id === 'cv_test_camera')).toMatchObject({
      props: { captureMode: 'guided-face', captureLabel: 'Capture now' },
    });
    expect(restoredTest.nodes.find((node) => node.id === 'cv_test_liveness')?.y).toBe(384);
    expect(restoredTest.nodes.some((node) => node.id === 'cv_test_verify')).toBe(false);
    expect(restoredTest.nodes.find((node) => node.id === 'cv_test_status')?.y).toBe(448);
    expect(restoredTest.behaviors.find((behavior) => behavior.id === 'cv_test_behavior_verify')).toMatchObject({
      name: 'Verify captured face',
      event: 'change',
      targetNodeId: 'cv_test_camera',
    });
    expect(restoredTest.logicGraphs.find((graph) => graph.id === 'cv_test_graph_verify')).toMatchObject({
      name: 'Recognize face automatically',
      sourceNodeId: 'cv_test_camera',
      nodes: expect.arrayContaining([
        expect.objectContaining({ id: 'cv_test_verify_trigger', kind: 'trigger', event: 'change' }),
      ]),
    });
    const restoredVerify = restoredTest.logicGraphs
      .flatMap((graph) => graph.nodes)
      .find((node) => node.id === 'cv_test_action_verify');
    expect(restoredVerify?.kind === 'action' ? restoredVerify.inputMappings : null).not.toHaveProperty('userId');
    expect(restoredTest.logicGraphs
      .flatMap((graph) => graph.nodes)
      .find((node) => node.id === 'cv_test_status_recognized')).toMatchObject({
      payload: { text: 'Recognition result: Face recognized. App unlocked.' },
    });
  });

  it('preserves a customized input that reuses the legacy Face starter email ID', () => {
    const dto = mapProjectToDto({
      id: 'custom_face_starter',
      name: 'Customized Face verification',
      projectType: 'app',
      createdAt: new Date('2026-11-16T00:00:00Z'),
      updatedAt: new Date('2026-11-16T00:00:00Z'),
      document: { screens: structuredClone(CV_STARTER_TEMPLATE.screens) },
    });
    const test = dto.screens.find((screen) => screen.id === 'screen_cv_test')!;
    test.nodes.push({
      id: 'cv_test_email',
      type: 'input',
      x: 24,
      y: 368,
      w: 342,
      h: 64,
      props: {
        label: 'Optional contact email',
        placeholder: 'you@example.com',
        inputType: 'email',
        multiline: false,
      },
    });

    const restored = mapProjectFromDto(dto);

    expect(restored.document.screens
      .find((screen) => screen.id === 'screen_cv_test')?.nodes
      .find((node) => node.id === 'cv_test_email')).toMatchObject({
      props: { label: 'Optional contact email' },
    });
  });

  it('migrates schema-v6 ListView data and item layout to the current schema', () => {
    const restored = mapProjectFromDto({
      schemaVersion: 6,
      id: 'schema_6',
      name: 'Schema 6',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      screens: [{
        id: 'screen',
        name: 'Home',
        path: '/',
        nodes: [{
          id: 'list', type: 'listview', x: 0, y: 0, w: 280, h: 160,
          props: {
            emptyText: 'No items', showDividers: true, scrollDirection: 'vertical',
            crossAxisAlignment: 'stretch', gap: 0, padding: 0,
            dataSource: { kind: 'static', items: ['First'] },
          },
          children: [{
            id: 'title', type: 'text', x: 0, y: 0, w: 280, h: 44,
            props: { text: 'Fallback', level: 'body', dataBinding: { source: 'list-item', fieldId: 'value' } },
          }],
        }],
        behaviors: [],
        logicGraphs: [],
      }],
    } as never);
    const list = restored.document.screens[0]!.nodes[0];
    expect(list?.type === 'listview' ? list.props.dataSource : null).toEqual({
      kind: 'static',
      fields: [{ id: 'value', label: 'Value', type: 'text' }],
      items: [{ id: 'list__static_1', values: { value: 'First' } }],
    });
    expect(list?.type === 'listview' ? list.children[0]?.bindings : null).toEqual([{
      target: 'text.content',
      value: { source: 'list-item', fieldId: 'value' },
    }]);
    expect(list?.type === 'listview' ? list.props.itemSpacing : null).toBe(0);
    expect(list?.type === 'listview' ? list.props.itemBorderRadius : null).toBe(0);
    expect(mapProjectToDto(restored).schemaVersion).toBe(14);
  });

  it('materializes schema-v8 ListView flow layouts as free-form item geometry', () => {
    const restored = mapProjectFromDto({
      schemaVersion: 8,
      id: 'schema_8',
      name: 'Schema 8',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      screens: [{
        id: 'screen', name: 'Home', path: '/', behaviors: [], logicGraphs: [],
        nodes: [
          {
            id: 'vertical', type: 'listview', x: 0, y: 0, w: 320, h: 240,
            responsive: { desktop: { w: 400 } },
            props: {
              emptyText: 'Empty', showDividers: false, scrollDirection: 'vertical',
              crossAxisAlignment: 'center', gap: 8, padding: 12,
              itemSpacing: 8, itemBorderRadius: 8,
              dataSource: { kind: 'static', fields: [], items: [] },
            },
            children: [
              {
                id: 'title', type: 'text', x: 0, y: 0, w: 100, h: 20,
                responsive: { desktop: { w: 140 } },
                props: { text: 'Title', level: 'body' },
              },
              {
                id: 'action', type: 'button', x: 0, y: 0, w: 120, h: 40,
                props: { label: 'Open', variant: 'solid' },
              },
            ],
          },
          {
            id: 'horizontal', type: 'listview', x: 0, y: 260, w: 320, h: 200,
            props: {
              emptyText: 'Empty', showDividers: false, scrollDirection: 'horizontal',
              crossAxisAlignment: 'center', gap: 8, padding: 12,
              itemSpacing: 8, itemBorderRadius: 8,
              dataSource: { kind: 'static', fields: [], items: [] },
            },
            children: [{
              id: 'card', type: 'text', x: 0, y: 0, w: 100, h: 40,
              props: { text: 'Card', level: 'body' },
            }],
          },
        ],
      }],
    } as never);

    const vertical = restored.document.screens[0]!.nodes[0];
    const horizontal = restored.document.screens[0]!.nodes[1];
    expect(vertical?.type === 'listview' ? vertical.children[0] : null).toMatchObject({
      x: 110, y: 12, w: 100, h: 20,
    });
    expect(vertical?.type === 'listview' ? vertical.children[1] : null).toMatchObject({
      x: 100, y: 40, w: 120, h: 40,
    });
    const desktopTitle = vertical?.type === 'listview' ? vertical.children[0] : undefined;
    expect(desktopTitle ? geometryAtBreakpoint(desktopTitle, 'desktop') : null).toEqual({
      x: 130, y: 12, w: 140, h: 20,
    });
    expect(horizontal?.type === 'listview' ? horizontal.children[0] : null).toMatchObject({
      x: 12, y: 80, w: 100, h: 40,
    });

    const reloaded = mapProjectFromDto(mapProjectToDto(restored));
    expect(reloaded).toEqual(restored);
  });

  it('migrates schema-v10 numeric padding to per-side padding', () => {
    const restored = mapProjectFromDto({
      schemaVersion: 10,
      id: 'schema_10',
      name: 'Schema 10',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      screens: [{
        id: 'screen', name: 'Home', path: '/', behaviors: [], logicGraphs: [],
        nodes: [
          {
            id: 'column', type: 'column', x: 0, y: 0, w: 320, h: 240,
            props: { mainAxisAlignment: 'start', crossAxisAlignment: 'stretch', gap: 8, padding: 16 },
            children: [],
          },
          {
            id: 'list', type: 'listview', x: 0, y: 260, w: 320, h: 200,
            props: {
              emptyText: 'Empty', showDividers: false, scrollDirection: 'vertical',
              crossAxisAlignment: 'stretch', gap: 0, padding: 12,
              itemSpacing: 4, itemBorderRadius: 8,
              dataSource: { kind: 'static', fields: [], items: [] },
            },
            children: [],
          },
        ],
      }],
    } as never);

    const [column, list] = restored.document.screens[0]!.nodes;
    expect(column?.type === 'column' ? column.props.padding : null).toEqual(createPadding(16));
    expect(list?.type === 'listview' ? list.props.padding : null).toEqual(createPadding(12));

    const repersisted = mapProjectToDto(restored);
    expect(repersisted.schemaVersion).toBe(14);
    expect(repersisted.screens[0]!.nodes[0]).toMatchObject({
      props: { padding: createPadding(16) },
    });
  });

  it('migrates legacy List, Repeater, and Form widgets without dropping content or bindings', () => {
    const restored = mapProjectFromDto({
      id: 'legacy_widgets',
      name: 'Legacy widgets',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      screens: [{
        id: 'screen_widgets',
        name: 'Widgets',
        nodes: [
          {
            id: 'legacy_list', type: 'list', x: 0, y: 0, w: 280, h: 160,
            props: { items: ['First', 'Second'], scrollable: true, showDividers: true },
          },
          {
            id: 'legacy_repeater', type: 'repeater', x: 0, y: 180, w: 280, h: 160,
            props: {
              emptyText: 'No notes',
              showDividers: true,
              dataSource: { kind: 'collection', collectionId: 'notes', displayFieldIds: ['title'] },
            },
          },
          {
            id: 'legacy_form', type: 'form', x: 0, y: 360, w: 320, h: 240,
            props: {
              title: 'Add note',
              fields: [{ label: 'Title', placeholder: 'Note title', type: 'text' }],
              submitLabel: 'Create note',
              dataBinding: {
                collectionId: 'notes',
                fields: [{ formFieldIndex: 0, dataFieldId: 'title' }],
              },
            },
          },
        ],
        behaviors: [],
        logicGraphs: [],
      }],
    } as never);

    const migratedScreen = restored.document.screens[0]!;
    expect(migratedScreen.nodes.map((node) => node.type)).toEqual(['listview', 'listview', 'column']);
    const migratedList = migratedScreen.nodes[0];
    expect(migratedList?.type === 'listview' ? migratedList.props.dataSource : null).toEqual({
      kind: 'static',
      fields: [{ id: 'value', label: 'Value', type: 'text' }],
      items: [
        { id: 'legacy_list__static_1', values: { value: 'First' } },
        { id: 'legacy_list__static_2', values: { value: 'Second' } },
      ],
    });
    const migratedForm = migratedScreen.nodes[2];
    expect(migratedForm?.type === 'column' ? migratedForm.children.map((node) => node.type) : []).toEqual([
      'text', 'input', 'button',
    ]);
    expect(migratedScreen.behaviors).toContainEqual(expect.objectContaining({
      targetNodeId: 'legacy_form__submit',
      event: 'click',
    }));
    const submitAction = migratedScreen.logicGraphs
      .flatMap((graph) => graph.nodes)
      .find((node) => node.kind === 'action');
    expect(submitAction).toMatchObject({
      kind: 'action',
      payload: { type: 'insert-record', collectionId: 'notes', values: { title: '' } },
      inputMappings: {
        title: { source: 'component', nodeId: 'legacy_form__field_0', property: 'value' },
      },
    });

    const repersisted = mapProjectToDto(restored);
    expect(repersisted.schemaVersion).toBe(14);
    expect(repersisted.screens[0]!.nodes.map((node) => node.type)).toEqual(['listview', 'listview', 'column']);
  });
});
