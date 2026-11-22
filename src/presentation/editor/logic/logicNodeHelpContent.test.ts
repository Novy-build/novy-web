import { describe, expect, it } from 'vitest';
import { LOGIC_NODE_DEFINITIONS, logicNodeDefinition } from './logicNodeRegistry';
import {
  getLogicNodeHelp,
  getLogicNodeHelpById,
  helpKeyForDefinition,
  helpKeyForId,
} from './logicNodeHelpContent';

describe('logicNodeHelpContent', () => {
  it('provides curated guides for common static nodes', () => {
    for (const id of ['trigger-click', 'trigger-change', 'trigger-load', 'if-else', 'insert-db', 'get-record']) {
      const definition = logicNodeDefinition(id);
      expect(definition, id).toBeDefined();
      const help = getLogicNodeHelp(definition!);
      expect(help.isCurated, id).toBe(true);
      expect(help.summary.length, id).toBeGreaterThan(20);
      expect(help.steps.length, id).toBeGreaterThanOrEqual(3);
      expect(help.fields.length, id).toBeGreaterThan(0);
      expect(help.example.nodes.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('generates a complete guide for every static library node', () => {
    for (const definition of LOGIC_NODE_DEFINITIONS) {
      const help = getLogicNodeHelp(definition);
      expect(help.title, definition.id).toBe(definition.label);
      expect(help.description, definition.id).toBe(definition.description);
      expect(help.summary.length, definition.id).toBeGreaterThan(0);
      expect(help.steps.length, definition.id).toBeGreaterThanOrEqual(3);
      expect(help.example.nodes.length, definition.id).toBeGreaterThanOrEqual(2);
      expect(help.fields.length, definition.id).toBeGreaterThan(0);
      for (const field of help.fields) {
        expect(field.name.length, definition.id).toBeGreaterThan(0);
        expect(field.description.length, definition.id).toBeGreaterThan(0);
      }
    }
  });

  it('humanizes generated field names from action payloads', () => {
    const help = getLogicNodeHelp(logicNodeDefinition('chat-input')!);
    expect(help.isCurated).toBe(false);
    expect(help.fields.map((field) => field.name)).toContain('Component ID');
    expect(help.example.note).toContain('generic example');
  });

  it('maps dynamic component and current-item ids to generic guides', () => {
    expect(helpKeyForId('component-abc-click')).toBe('component-click');
    expect(helpKeyForId('component-abc-change')).toBe('component-change');
    expect(helpKeyForId('component-abc-load')).toBe('component-change');
    expect(helpKeyForId('current-update-collection-1')).toBe('current-update');
    expect(helpKeyForId('current-delete-collection-1')).toBe('current-delete');
    expect(helpKeyForId('current-open-collection-1')).toBe('current-open');

    const definition = {
      id: 'component-abc-click',
      category: 'Components' as const,
      label: 'Frame · Container',
      description: 'When Frame is clicked',
      icon: '↗',
      keywords: [],
      create: () => ({ kind: 'trigger' as const, event: 'click' as const }),
    };
    expect(helpKeyForDefinition(definition)).toBe('component-click');
    const help = getLogicNodeHelp(definition);
    expect(help.title).toBe('Frame · Container');
    expect(help.description).toBe('When Frame is clicked');
    expect(help.isCurated).toBe(true);
  });

  it('resolves guides by URL id and rejects unknown ids', () => {
    expect(getLogicNodeHelpById('trigger-click')?.title).toBe('On Click');
    expect(getLogicNodeHelpById('component-abc-click')?.id).toBe('component-click');
    expect(getLogicNodeHelpById('no-such-node')).toBeNull();
  });
});
