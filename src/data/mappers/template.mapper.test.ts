import { describe, expect, it } from 'vitest';
import type { Template } from '@domain/entities/template';
import { mapTemplateToDto } from './template.mapper';

const TEMPLATE: Template = {
  id: 'template_notes',
  name: 'Notes',
  description: 'Track notes',
  projectType: 'app',
  screens: [
    {
      id: 'screen_notes',
      name: 'Notes',
      path: '/',
      nodes: [],
      behaviors: [],
      logicGraphs: [],
    },
  ],
  data: {
    databaseName: 'Notes Database',
    collections: [
      {
        referenceId: 'template-notes-collection',
        name: 'Notes',
        fields: [
          { id: 'field_title', key: 'title', label: 'Title', type: 'text', required: true },
        ],
        identifier: { key: 'noteId', type: 'string', generation: 'backend' },
        records: [{ title: 'First' }],
      },
    ],
  },
};

describe('mapTemplateToDto', () => {
  it('maps screens and the starter data blueprint to the backend contract', () => {
    const dto = mapTemplateToDto(TEMPLATE);

    expect(dto).toMatchObject({
      id: 'template_notes',
      name: 'Notes',
      description: 'Track notes',
      data: {
        databaseName: 'Notes Database',
        collections: [
          {
            referenceId: 'template-notes-collection',
            name: 'Notes',
            fields: [
              { id: 'field_title', key: 'title', label: 'Title', type: 'text', required: true },
            ],
            identifier: { key: 'noteId', type: 'string', generation: 'backend' },
            records: [{ title: 'First' }],
          },
        ],
      },
    });
    expect(dto.screens).toHaveLength(1);
    expect(dto.screens[0]?.id).toBe('screen_notes');
  });

  it('omits the data blueprint for templates without starter data', () => {
    const dto = mapTemplateToDto({ ...TEMPLATE, data: undefined });

    expect(dto.data).toBeUndefined();
  });

  it('copies blueprint fields and records instead of sharing mutable references', () => {
    const dto = mapTemplateToDto(TEMPLATE);

    dto.data!.collections[0]!.fields[0]!.label = 'Changed';
    dto.data!.collections[0]!.records![0]!.title = 'Changed';

    expect(TEMPLATE.data!.collections[0]!.fields[0]!.label).toBe('Title');
    expect(TEMPLATE.data!.collections[0]!.records![0]!.title).toBe('First');
  });
});
