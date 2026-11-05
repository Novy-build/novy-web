import { describe, expect, it } from 'vitest';
import type { ButtonNode, TextNode } from '../entities/componentNode';
import type { ProjectDocument, Screen } from '../entities/screen';
import { interpretAssistantMessage } from './assistant';

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
  nodes: [TEXT_NODE, BUTTON_NODE],
  behaviors: [],
  logicGraphs: [],
};

const DOCUMENT: ProjectDocument = { screens: [SCREEN] };

function interpret(message: string, document = DOCUMENT) {
  return interpretAssistantMessage(document, 'screen_1', message);
}

describe('interpretAssistantMessage', () => {
  it('recognizes "add a button" and extracts a quoted label', () => {
    expect(interpret('add a button')).toMatchObject({
      proposal: { kind: 'add-button', label: 'Button' },
    });
    expect(interpret('Please add a button "Sign up"')).toMatchObject({
      proposal: { kind: 'add-button', label: 'Sign up' },
    });
  });

  it('recognizes text and heading requests', () => {
    expect(interpret('add a heading "Welcome"')).toMatchObject({
      proposal: { kind: 'add-text', text: 'Welcome' },
    });
  });

  it('recognizes a student list and falls back to generic items', () => {
    expect(interpret('create a list of students')).toMatchObject({
      proposal: { kind: 'add-list', items: ['Ada Lovelace', 'Alan Turing', 'Grace Hopper'] },
    });
    expect(interpret('create a list')).toMatchObject({
      proposal: { kind: 'add-list', items: ['First item', 'Second item', 'Third item'] },
    });
  });

  it('recognizes "make the text change when clicked" against the active screen', () => {
    expect(interpret('make the text change when clicked')).toMatchObject({
      proposal: {
        kind: 'change-text-on-click',
        buttonNodeId: 'node_button',
        textNodeId: 'node_text',
        text: 'It changed!',
      },
    });
    expect(interpret('when clicked, change the text to "Hello!"')).toMatchObject({
      proposal: { kind: 'change-text-on-click', text: 'Hello!' },
    });
  });

  it('explains what is missing instead of proposing an impossible binding', () => {
    const buttonOnly: ProjectDocument = {
      screens: [{ ...SCREEN, nodes: [BUTTON_NODE] }],
    };

    const reply = interpret('make the text change when clicked', buttonOnly);
    expect(reply.proposal).toBeUndefined();
    expect(reply.message).toMatch(/text component and a button/);
  });

  it('answers unknown intents with the demo command list', () => {
    const reply = interpret('make it pop');

    expect(reply.proposal).toBeUndefined();
    expect(reply.message).toMatch(/demo commands/);
    expect(reply.message).toMatch(/add a button/);
  });

  it('matches case-insensitively and trims input', () => {
    expect(interpret('  ADD A BUTTON  ')).toMatchObject({
      proposal: { kind: 'add-button' },
    });
  });
});
