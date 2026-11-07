import { describe, expect, it } from 'vitest';
import type { DataCollection } from '../entities/appData';
import type { ComponentNode } from '../entities/componentNode';
import type { ProjectDocument } from '../entities/screen';
import { makeButton, makeScreen, makeText } from '@test/editorFixtures';
import { validateProject } from './projectValidation';

function documentWith(...screens: ReturnType<typeof makeScreen>[]): ProjectDocument {
  return { screens };
}

describe('validateProject', () => {
  it('returns valid for a complete project', () => {
    const screen = makeScreen('screen_home', [makeText('node_text'), makeButton('node_button')]);
    const report = validateProject(documentWith(screen));

    expect(report.isValid).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('reports duplicate component IDs and invalid geometry', () => {
    const screen = makeScreen('screen_home', [
      makeText('node_text', { w: 0 }),
      makeText('node_text'),
    ]);
    const report = validateProject(documentWith(screen));

    expect(report.isValid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('component-duplicate-id');
    expect(report.issues.map((issue) => issue.code)).toContain('component-size-invalid');
  });

  it('reports missing logic targets, graphs, and cycles', () => {
    const screen = makeScreen('screen_home', [makeButton('node_button')]);
    screen.behaviors = [{ id: 'behavior_1', name: 'Broken', event: 'click', graphId: 'graph_1', targetNodeId: 'ghost' }];
    screen.logicGraphs = [{
      id: 'graph_1',
      name: 'Broken',
      sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 80, y: 160 } },
        { kind: 'action', id: 'action', payload: { type: 'navigate', targetScreenId: 'missing' }, position: { x: 312, y: 160 } },
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'trigger', fromPort: 'next', toNodeId: 'action', toPort: 'in' },
        { id: 'edge_2', fromNodeId: 'action', fromPort: 'next', toNodeId: 'trigger', toPort: 'in' },
      ],
    }];
    const report = validateProject(documentWith(screen));

    expect(report.isValid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'logic-missing-target',
      'logic-cycle',
      'logic-missing-screen',
    ]));
  });

  it('reports missing data collections and fields', () => {
    const screen = makeScreen('screen_home', [
      {
        ...makeButton('node_list'),
        type: 'list',
        props: { items: [], scrollable: true, showDividers: true, dataSource: { kind: 'collection', collectionId: 'ghost', displayFieldId: 'field' } },
      } as ComponentNode,
    ]);
    const collection: DataCollection = {
      id: 'students',
      projectId: 'project',
      name: '',
      fields: [
        { id: 'name', key: 'name', label: '', type: 'text', required: false },
        { id: 'name2', key: 'name', label: 'Name', type: 'text', required: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const report = validateProject(documentWith(screen), [collection]);

    expect(report.isValid).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'data-missing-collection',
      'data-collection-name',
      'data-field-duplicate-key',
      'data-field-label',
    ]));
  });

  it('validates unique routes, action mappings, async ports, email, and refresh references', () => {
    const home = makeScreen('screen_home', [makeButton('node_button')]);
    const duplicate = makeScreen('screen_other', [], 'Other');
    duplicate.path = '/';
    home.behaviors = [{
      id: 'behavior_1',
      name: 'Submit',
      event: 'click',
      graphId: 'graph_1',
      targetNodeId: 'node_button',
    }];
    home.logicGraphs = [{
      id: 'graph_1',
      name: 'Submit',
      sourceNodeId: 'node_button',
      nodes: [
        { kind: 'trigger', id: 'trigger', event: 'click', position: { x: 80, y: 160 } },
        {
          kind: 'action',
          id: 'email',
          position: { x: 312, y: 160 },
          payload: { type: 'send-email', to: '', subject: '', body: '' },
          inputMappings: {
            to: { source: 'component', nodeId: 'missing_input', property: 'value' },
          },
        },
        {
          kind: 'action',
          id: 'refresh',
          position: { x: 544, y: 160 },
          payload: { type: 'refresh-collection', collectionId: 'missing_collection' },
        },
      ],
      edges: [
        { id: 'edge_1', fromNodeId: 'trigger', fromPort: 'next', toNodeId: 'email', toPort: 'in' },
        { id: 'edge_2', fromNodeId: 'email', fromPort: 'next', toNodeId: 'refresh', toPort: 'in' },
      ],
    }];

    const report = validateProject(documentWith(home, duplicate));
    expect(report.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      'screen-path-duplicate',
      'logic-invalid-output-port',
      'logic-empty-email',
      'logic-empty-email-subject',
      'logic-missing-input-source',
      'data-missing-collection',
    ]));
  });
});
