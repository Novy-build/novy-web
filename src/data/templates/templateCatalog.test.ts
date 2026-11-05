import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOG } from './templateCatalog';

describe('templateCatalog', () => {
  it('contains exactly four starter templates', () => {
    expect(TEMPLATE_CATALOG).toHaveLength(4);
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

  it('provides the student list example from the product spec', () => {
    const students = TEMPLATE_CATALOG.find((template) => template.id === 'template_students');

    expect(students).toBeDefined();
    const listNode = students?.screens[0].nodes.find((node) => node.type === 'list');
    expect(listNode).toBeDefined();
  });
});
