import { describe, expect, it } from 'vitest';
import type { ButtonNode, TextNode } from '../entities/componentNode';
import type { ProjectDocument, Screen } from '../entities/screen';
import { createBehaviorBundle } from '../factories/logic';
import { applyAssistantProposal, describeProposal } from './proposal';

const TEXT_NODE: TextNode = {
  id: 'node_text',
  type: 'text',
  x: 24,
  y: 24,
  w: 220,
  h: 36,
  props: { text: 'Hello, World!', level: 'display' },
};

const BUTTON_NODE: ButtonNode = {
  id: 'node_button',
  type: 'button',
  x: 24,
  y: 560,
  w: 160,
  h: 44,
  props: { label: 'Click me', variant: 'solid' },
};

const SCREEN: Screen = {
  id: 'screen_1',
  name: 'Home',
  path: '/',
  nodes: [TEXT_NODE, BUTTON_NODE],
  behaviors: [],
  logicGraphs: [],
};

const DOCUMENT: ProjectDocument = { screens: [SCREEN] };

function screenOf(document: ProjectDocument): Screen {
  return document.screens[0]!;
}

describe('applyAssistantProposal', () => {
  it('adds a button below the lowest existing node without mutating the source', () => {
    const next = applyAssistantProposal(DOCUMENT, 'screen_1', { kind: 'add-button', label: 'Sign up' });

    const added = screenOf(next).nodes[2]!;
    expect(added).toMatchObject({
      type: 'button',
      x: 24,
      y: 620, // lowest bottom (560 + 44) + 16
      props: { label: 'Sign up' },
    });
    expect(screenOf(DOCUMENT).nodes).toHaveLength(2);
  });

  it('adds text and list nodes with the proposed content', () => {
    const withText = applyAssistantProposal(DOCUMENT, 'screen_1', { kind: 'add-text', text: 'Welcome' });
    expect(screenOf(withText).nodes[2]).toMatchObject({ type: 'text', props: { text: 'Welcome' } });

    const withList = applyAssistantProposal(DOCUMENT, 'screen_1', {
      kind: 'add-list',
      items: ['Ada', 'Alan', 'Grace'],
    });
    expect(screenOf(withList).nodes[2]).toMatchObject({
      type: 'list',
      props: { items: ['Ada', 'Alan', 'Grace'] },
    });
  });

  it('creates the click behavior and its change-text step together', () => {
    const next = applyAssistantProposal(DOCUMENT, 'screen_1', {
      kind: 'change-text-on-click',
      buttonNodeId: BUTTON_NODE.id,
      textNodeId: TEXT_NODE.id,
      text: 'Changed!',
    });

    const screen = screenOf(next);
    const behavior = screen.behaviors[0]!;
    const graph = screen.logicGraphs[0]!;

    expect(screen.behaviors).toHaveLength(1);
    expect(behavior).toMatchObject({
      event: 'click',
      targetNodeId: BUTTON_NODE.id,
      graphId: graph.id,
      name: 'On click — Click me',
    });
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([
      expect.objectContaining({
        fromNodeId: graph.nodes[0]!.id,
        fromPort: 'next',
        toNodeId: graph.nodes[1]!.id,
        toPort: 'in',
      }),
    ]);
    const step = graph.nodes[1]!;
    expect(step.kind === 'action' ? step.payload : undefined).toEqual({
      type: 'change-text',
      targetNodeId: TEXT_NODE.id,
      text: 'Changed!',
    });
  });

  it('reuses an existing click binding instead of duplicating it', () => {
    const bundle = createBehaviorBundle('On click — Click me', BUTTON_NODE.id, 'click');
    const seeded: ProjectDocument = {
      screens: [{ ...SCREEN, behaviors: [bundle.behavior], logicGraphs: [bundle.graph] }],
    };

    const next = applyAssistantProposal(seeded, 'screen_1', {
      kind: 'change-text-on-click',
      buttonNodeId: BUTTON_NODE.id,
      textNodeId: TEXT_NODE.id,
      text: 'Changed!',
    });

    const screen = screenOf(next);
    expect(screen.behaviors).toHaveLength(1);
    expect(screen.logicGraphs).toHaveLength(1);
    expect(screen.logicGraphs[0]!.nodes).toHaveLength(2);
    expect(screen.logicGraphs[0]!.id).toBe(bundle.graph.id);
  });

  it('returns the same document when the proposal cannot apply', () => {
    const unknownScreen = applyAssistantProposal(DOCUMENT, 'screen_ghost', {
      kind: 'add-button',
      label: 'Nope',
    });
    expect(unknownScreen).toBe(DOCUMENT);

    const missingButton = applyAssistantProposal(DOCUMENT, 'screen_1', {
      kind: 'change-text-on-click',
      buttonNodeId: 'node_ghost',
      textNodeId: TEXT_NODE.id,
      text: 'Nope',
    });
    expect(missingButton).toBe(DOCUMENT);
  });
});

describe('describeProposal', () => {
  it('summarizes every proposal kind for the chat card', () => {
    expect(describeProposal({ kind: 'add-button', label: 'Sign up' })).toBe('Add a button “Sign up”');
    expect(describeProposal({ kind: 'add-text', text: 'Welcome' })).toBe('Add text “Welcome”');
    expect(describeProposal({ kind: 'add-list', items: ['a', 'b', 'c'] })).toBe('Add a list with 3 items');
    expect(
      describeProposal({
        kind: 'change-text-on-click',
        buttonNodeId: 'b',
        textNodeId: 't',
        text: 'Changed!',
      }),
    ).toBe('On click, change the text to “Changed!”');
  });
});
