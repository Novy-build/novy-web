import { describe, expect, it } from 'vitest';
import { APP_TEMPLATES, TEMPLATE_CATALOG, WEBSITE_TEMPLATES } from './templateCatalog';

describe('templateCatalog', () => {
  it('contains app and website starter templates', () => {
    expect(APP_TEMPLATES).toHaveLength(5);
    expect(WEBSITE_TEMPLATES).toHaveLength(5);
    expect(TEMPLATE_CATALOG).toHaveLength(10);
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
});
