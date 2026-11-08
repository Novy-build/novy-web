import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOG } from './templateCatalog';

describe('templateCatalog', () => {
  it('contains exactly five starter templates', () => {
    expect(TEMPLATE_CATALOG).toHaveLength(5);
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

  it('provides a wired note app with biometric consent and fallback', () => {
    const notes = TEMPLATE_CATALOG.find((template) => template.id === 'template_notes');
    const unlock = notes?.screens.find((candidate) => candidate.name === 'Unlock');

    expect(notes?.screens.map((candidate) => candidate.name)).toEqual([
      'Unlock',
      'Notes',
      'Note Editor',
      'Ask Notes',
    ]);
    expect(unlock?.path).toBe('/');
    expect(unlock?.nodes.some((node) => node.type === 'camera')).toBe(true);
    expect(unlock?.nodes.some((node) => node.type === 'checkbox')).toBe(true);
    expect(unlock?.logicGraphs.flatMap((graph) => graph.nodes).some(
      (node) => node.kind === 'action' && node.payload.type === 'cv-verify',
    )).toBe(true);
    expect(unlock?.logicGraphs.some((graph) => graph.name === 'Standard sign-in fallback')).toBe(true);
    const ask = notes?.screens.find((candidate) => candidate.name === 'Ask Notes');
    expect(ask?.logicGraphs.find((graph) => graph.purpose === 'ingestion')?.nodes.some(
      (node) => node.kind === 'action' && node.payload.type === 'vector-store' && node.payload.operation === 'upsert',
    )).toBe(true);
    expect(ask?.logicGraphs.find((graph) => graph.purpose === 'chat')?.nodes.some(
      (node) => node.kind === 'action' && node.payload.type === 'ai-agent',
    )).toBe(true);
  });
});
