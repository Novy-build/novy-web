import { describe, expect, it } from 'vitest';
import type { ActionNode } from '@domain/entities/logic';
import { runBehavior } from '@domain/logic/runtime';
import { validateProject } from '@domain/validation/projectValidation';
import { APP_TEMPLATES, TEMPLATE_CATALOG, WEBSITE_TEMPLATES } from './templateCatalog';
import { geometryAtBreakpoint, isHiddenAtBreakpoint, type ResponsiveBreakpoint } from '@domain/entities/componentNode';

describe('templateCatalog', () => {
  it('contains app and website starter templates', () => {
    expect(APP_TEMPLATES).toHaveLength(9);
    expect(WEBSITE_TEMPLATES).toHaveLength(5);
    expect(TEMPLATE_CATALOG).toHaveLength(14);
    expect(APP_TEMPLATES.every((template) => template.projectType === 'app')).toBe(true);
    expect(WEBSITE_TEMPLATES.every((template) => template.projectType === 'website')).toBe(true);
  });

  it('provides a blank website canvas without sections or widgets', () => {
    const blankWebsite = WEBSITE_TEMPLATES.find((template) => template.id === 'template_site_blank');

    expect(blankWebsite?.name).toBe('Blank canvas');
    expect(blankWebsite?.screens).toHaveLength(1);
    expect(blankWebsite?.screens[0]?.nodes).toEqual([]);
  });

  it('uses unique ids', () => {
    const ids = TEMPLATE_CATALOG.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every template a nonempty screen ready for the canvas', () => {
    TEMPLATE_CATALOG.forEach((template) => {
      expect(template.screens.length).toBeGreaterThan(0);
      expect(template.name.length).toBeGreaterThan(0);
      template.screens.forEach((screen) => {
        expect(screen.nodes.every((node) => node.id.length > 0)).toBe(true);
      });
    });
  });

  it('provides the student ListView example from the product spec', () => {
    const students = TEMPLATE_CATALOG.find((template) => template.id === 'template_students');

    expect(students).toBeDefined();
    const listNode = students?.screens[0].nodes.find((node) => node.type === 'listview');
    expect(listNode).toBeDefined();
    expect(listNode?.type === 'listview' ? listNode.children : []).toHaveLength(1);
  });

  it('provides a focused notes CRUD app with data and current-record workflows', () => {
    const notes = TEMPLATE_CATALOG.find((template) => template.id === 'template_notes');

    expect(notes?.screens.map((candidate) => candidate.name)).toEqual([
      'Notes',
      'Add Note',
      'Note Detail',
      'Edit Note',
    ]);
    expect(notes?.screens[0]?.path).toBe('/');
    expect(notes?.data?.databaseName).toBe('Notes Database');
    expect(notes?.data?.collections[0]).toMatchObject({ name: 'Notes' });
    expect(notes?.data?.collections[0]?.records).toHaveLength(3);

    const actions = notes?.screens.flatMap((screen) => screen.logicGraphs)
      .flatMap((graph) => graph.nodes)
      .filter((node) => node.kind === 'action') ?? [];
    expect(actions.some((node) => node.payload.type === 'insert-record')).toBe(true);
    expect(actions.some((node) => node.payload.type === 'get-record')).toBe(true);
    expect(actions.some((node) => node.payload.type === 'update-record')).toBe(true);
    expect(actions.filter((node) => node.payload.type === 'delete-record')).toHaveLength(2);
    expect(actions.some((node) => node.payload.type === 'navigate' && node.payload.recordContext)).toBe(true);

    const notesScreen = notes?.screens.find((candidate) => candidate.name === 'Notes');
    const list = notesScreen?.nodes.find((node) => node.type === 'listview');
    expect(list?.type === 'listview' ? list.children.some(
      (node) => node.type === 'dropdown' && node.props.presentation === 'menu',
    ) : false).toBe(true);
  });

  it('provides validated design-system showcases within mobile, tablet, and desktop viewports', () => {
    for (const id of ['template_notes', 'template_creative_workspace', 'template_learning_dashboard']) {
      const template = APP_TEMPLATES.find((candidate) => candidate.id === id);
      expect(template?.designSystem).toBeDefined();
      expect(template?.screens.flatMap((screen) => screen.nodes).length).toBeGreaterThan(0);
      expect(JSON.stringify(template?.screens)).toContain('"desktop"');
      if (id !== 'template_notes') expect(JSON.stringify(template?.screens)).toContain('"icon"');
      const collections = template?.data?.collections.map((collection) => ({
        id: collection.referenceId,
        projectId: 'template_project',
        databaseId: 'template_database',
        name: collection.name,
        fields: collection.fields,
        identifier: collection.identifier,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      })) ?? [];
      expect(validateProject({
        designSystem: template?.designSystem,
        screens: template?.screens ?? [],
      }, collections).issues.filter((issue) => issue.severity === 'error')).toEqual([]);

      const viewportByBreakpoint: Record<ResponsiveBreakpoint, { width: number; height: number }> = {
        mobile: { width: 390, height: 780 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1200, height: 800 },
      };
      for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
        const viewport = viewportByBreakpoint[breakpoint];
        for (const node of template?.screens.flatMap((screen) => screen.nodes) ?? []) {
          if (isHiddenAtBreakpoint(node, breakpoint)) continue;
          const geometry = geometryAtBreakpoint(node, breakpoint);
          expect(geometry.x, `${id}/${breakpoint}/${node.id} x`).toBeGreaterThanOrEqual(0);
          expect(geometry.y, `${id}/${breakpoint}/${node.id} y`).toBeGreaterThanOrEqual(0);
          expect(geometry.x + geometry.w, `${id}/${breakpoint}/${node.id} width`).toBeLessThanOrEqual(viewport.width);
          expect(geometry.y + geometry.h, `${id}/${breakpoint}/${node.id} height`).toBeLessThanOrEqual(viewport.height);
        }
      }
    }
  });

  it('wires the Face verification starter to safe CV inputs', () => {
    const template = APP_TEMPLATES.find((candidate) => candidate.id === 'template_cv_starter');
    const registration = template?.screens[0];
    const recognitionTest = template?.screens[1];
    const logicNodes = template?.screens.flatMap((screen) => screen.logicGraphs)
      .flatMap((graph) => graph.nodes)
      ?? [];
    const actions = logicNodes.filter((node): node is ActionNode => node.kind === 'action');
    const liveness = actions.find((node) => node.payload.type === 'cv-liveness');
    const enroll = actions.find((node) => node.payload.type === 'cv-enroll');
    const verify = actions.find((node) => node.payload.type === 'cv-verify');
    const recognizedCondition = logicNodes.find((node) =>
      node.kind === 'condition' &&
      node.left.source === 'node-output' &&
      node.left.nodeId === 'cv_test_action_verify' &&
      node.left.path === 'verified');

    expect(template).toMatchObject({ name: 'Face verification', projectType: 'app' });
    expect(template?.screens.map((screen) => [screen.name, screen.path])).toEqual([
      ['Biometric Registration', '/'],
      ['Recognition Test', '/test-recognition'],
    ]);
    expect(registration?.nodes.map((node) => node.type)).toEqual(expect.arrayContaining([
      'camera', 'checkbox', 'button', 'text',
    ]));
    expect(recognitionTest?.nodes.map((node) => node.type)).toEqual(expect.arrayContaining([
      'camera', 'button', 'text',
    ]));
    expect(recognitionTest?.nodes.some((node) => node.type === 'input')).toBe(false);
    expect(recognitionTest?.nodes.some((node) => node.id === 'cv_test_verify')).toBe(false);
    expect(template?.screens.flatMap((screen) => screen.nodes)
      .filter((node) => node.type === 'camera')
      .every((node) => node.type === 'camera' && node.props.captureMode === 'guided-face')).toBe(true);
    expect(registration?.behaviors).toHaveLength(2);
    expect(recognitionTest?.behaviors).toHaveLength(3);
    expect(recognitionTest?.behaviors.find((behavior) => behavior.id === 'cv_test_behavior_verify'))
      .toMatchObject({ event: 'change', targetNodeId: 'cv_test_camera' });
    expect(liveness?.inputMappings).toMatchObject({
      mediaReference: { source: 'component', nodeId: 'cv_test_camera', property: 'value' },
    });
    expect(enroll?.inputMappings).toMatchObject({
      mediaReference: { source: 'component', nodeId: 'cv_registration_camera', property: 'value' },
      consent: { source: 'component', nodeId: 'cv_registration_consent', property: 'value' },
    });
    expect(verify?.inputMappings).toMatchObject({
      mediaReference: { source: 'component', nodeId: 'cv_test_camera', property: 'value' },
    });
    expect(verify?.inputMappings).not.toHaveProperty('userId');
    expect(verify?.payload).toEqual({ type: 'cv-verify', mediaReference: '' });
    expect(recognizedCondition).toMatchObject({
      kind: 'condition',
      operator: 'equals',
      compareValue: 'true',
    });
    expect(actions.filter((node) => node.payload.type === 'change-text').map((node) =>
      node.payload.type === 'change-text' ? node.payload.text : '')).toEqual(expect.arrayContaining([
      'Recognition result: Face recognized. App unlocked.',
      'Recognition result: Face not recognized.',
    ]));
    expect(actions.filter((node) => node.payload.type === 'navigate').map((node) =>
      node.payload.type === 'navigate' ? node.payload.targetScreenId : '')).toEqual(expect.arrayContaining([
      'screen_cv_registration',
      'screen_cv_test',
    ]));
    expect(validateProject({ screens: template?.screens ?? [] }).issues.filter(
      (issue) => issue.severity === 'error',
    )).toEqual([]);
  });

  it('provides a runtime-upload RAG demo with a dedicated chat screen', () => {
    const template = APP_TEMPLATES.find((candidate) => candidate.id === 'template_rag_chat');
    expect(template?.screens.map((screen) => screen.name)).toEqual([
      'Upload Document',
      'Document Chat',
    ]);
    expect(template?.screens[0]?.nodes.some((node) => node.type === 'file-input')).toBe(true);
    expect(template?.screens[1]?.nodes.some((node) => node.type === 'chat')).toBe(true);

    const actions = template?.screens.flatMap((screen) => screen.logicGraphs)
      .flatMap((graph) => graph.nodes)
      .filter((node): node is ActionNode => node.kind === 'action') ?? [];
    expect(actions.some((node) => node.payload.type === 'document-upload')).toBe(true);
    expect(actions.filter((node) => node.payload.type === 'chat-message')).toHaveLength(2);
    expect(actions.some((node) => node.payload.type === 'ai-agent')).toBe(true);
    expect(actions.some((node) => node.payload.type === 'vector-store' && node.payload.operation === 'upsert')).toBe(true);
    expect(actions.some((node) => node.payload.type === 'vector-store' && node.payload.operation === 'retrieve-tool')).toBe(true);

    const project = {
      schemaVersion: 13 as const,
      id: 'project_rag_demo',
      name: 'RAG Demo',
      projectType: 'app' as const,
      createdAt: new Date('2026-11-17T00:00:00Z'),
      updatedAt: new Date('2026-11-17T00:00:00Z'),
      screens: template?.screens ?? [],
    };
    expect(validateProject(project, []).issues.filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('shows whether the recognition-test face was recognized', () => {
    const template = APP_TEMPLATES.find((candidate) => candidate.id === 'template_cv_starter')!;
    const recognitionTest = template.screens.find((screen) => screen.id === 'screen_cv_test')!;
    const componentValues = new Map([
      ['cv_test_camera', 'data:image/jpeg;base64,preview'],
    ]);

    const recognized = runBehavior(
      { screens: template.screens },
      recognitionTest,
      'cv_test_camera',
      'change',
      { componentValues },
    );
    const notRecognized = runBehavior(
      { screens: template.screens },
      recognitionTest,
      'cv_test_camera',
      'change',
      {
        componentValues,
        data: {
          getRecord: () => null,
          cvVerify: () => ({
            verified: false,
            confidence: 0.2,
            reason: 'not_matched',
          }),
        },
      },
    );

    expect(recognized).toContainEqual({
      kind: 'change-text',
      nodeId: 'cv_test_status',
      text: 'Recognition result: Face recognized. App unlocked.',
    });
    expect(notRecognized).toContainEqual({
      kind: 'change-text',
      nodeId: 'cv_test_status',
      text: 'Recognition result: Face not recognized.',
    });
  });
});
