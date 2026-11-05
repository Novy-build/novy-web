import type { ProjectDocument } from '../entities/screen';
import type { ButtonNode, TextNode } from '../entities/componentNode';
import { findFirstNode } from './nodeSearch';

/**
 * Rule-based demo assistant (Phase 6). The "AI" is an honest mock: intents
 * are matched with keyword rules against the active screen, and the reply
 * carries a structured, serializable proposal the editor reducer can apply
 * in one undoable step. When the backend lands, only this interpreter is
 * replaced — the proposal/apply pipeline stays.
 */
export type AssistantProposal =
  | { kind: 'add-button'; label: string }
  | { kind: 'add-text'; text: string }
  | { kind: 'add-list'; items: string[] }
  | { kind: 'change-text-on-click'; buttonNodeId: string; textNodeId: string; text: string };

export interface AssistantReply {
  message: string;
  proposal?: AssistantProposal;
}

/** Demo data for "create a list of students", mirroring the SRS example. */
const STUDENT_ITEMS: readonly string[] = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper'];

const CREATE_VERB = /\b(add|create|make|insert|new)\b/;
const CLICK_EVENT = /\b(click|clicked|tap|tapped)\b/;
const CHANGE_VERB = /\b(change|update|replace|set)\b/;
const TEXT_NOUN = /\btext\b/;
const BUTTON_NOUN = /\bbutton\b/;
const LIST_NOUN = /\blist\b/;
const TEXTY_NOUN = /\b(text|heading|title|label)\b/;

const HELP_MESSAGE =
  'I only know a few demo commands: “add a button”, “add a heading”, ' +
  '“create a list of students”, and “make the text change when clicked”. ' +
  'Real AI arrives with the backend.';

/**
 * Turns a chat message into a reply plus an optional proposed change.
 * Pure: reads the document, never mutates it.
 */
export function interpretAssistantMessage(
  document: ProjectDocument,
  screenId: string,
  message: string,
): AssistantReply {
  const input = message.trim();
  const normalized = input.toLowerCase();
  const quoted = firstQuotedText(input);

  if (CLICK_EVENT.test(normalized) && CHANGE_VERB.test(normalized) && TEXT_NOUN.test(normalized)) {
    const screen = document.screens.find((candidate) => candidate.id === screenId);
    if (!screen) {
      return { message: 'Open a screen first so I know where to wire the behavior.' };
    }
    const textNode = findFirstNode(screen.nodes, (node): node is TextNode => node.type === 'text');
    const buttonNode = findFirstNode(screen.nodes, (node): node is ButtonNode => node.type === 'button');
    if (!textNode || !buttonNode) {
      return {
        message:
          'I need a text component and a button on this screen first — add them from the palette, then ask again.',
      };
    }
    const text = quoted ?? 'It changed!';
    return {
      message: `I can wire the “${buttonNode.props.label}” button so a click changes the text. Keep it to apply the change.`,
      proposal: {
        kind: 'change-text-on-click',
        buttonNodeId: buttonNode.id,
        textNodeId: textNode.id,
        text,
      },
    };
  }

  if (CREATE_VERB.test(normalized) && BUTTON_NOUN.test(normalized)) {
    const label = quoted ?? 'Button';
    return {
      message: `I can add a “${label}” button to this screen. Keep it to apply the change.`,
      proposal: { kind: 'add-button', label },
    };
  }

  if (CREATE_VERB.test(normalized) && LIST_NOUN.test(normalized)) {
    const items = /\bstudents?\b/.test(normalized) ? [...STUDENT_ITEMS] : ['First item', 'Second item', 'Third item'];
    return {
      message: `I can add a list with ${items.length} items to this screen. Keep it to apply the change.`,
      proposal: { kind: 'add-list', items },
    };
  }

  if (CREATE_VERB.test(normalized) && TEXTY_NOUN.test(normalized)) {
    const text = quoted ?? 'Your text';
    return {
      message: `I can add a text block “${text}” to this screen. Keep it to apply the change.`,
      proposal: { kind: 'add-text', text },
    };
  }

  return { message: HELP_MESSAGE };
}

/** First double-quoted segment ("…" or “…”) in the original message, if any. */
function firstQuotedText(input: string): string | undefined {
  const match = /["“]([^"”]{1,80})["”]/.exec(input);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : undefined;
}
