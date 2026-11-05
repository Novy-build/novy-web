import { useState, type Dispatch } from 'react';
import { generateId } from '@domain/ids';
import { interpretAssistantMessage, type AssistantProposal } from '@domain/ai/assistant';
import type { EditorAction, EditorState } from '../state/editorState';

export type AssistantProposalStatus = 'pending' | 'applied' | 'undone';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposal?: AssistantProposal;
  status?: AssistantProposalStatus;
}

export interface AssistantConversation {
  messages: AssistantMessage[];
  /** Appends the user message and the interpreter's reply. */
  send: (message: string) => void;
  /** Applies a pending proposal through the editor command stack. */
  keep: (messageId: string) => void;
  /** Reverts the applied proposal with the shared history stack. */
  undo: (messageId: string) => void;
}

/**
 * Conversation state of the demo assistant. The interpreter is pure and the
 * apply/undo path reuses the editor reducer, so the chat itself owns only
 * message bookkeeping. Real AI (backend phase) replaces `interpret` alone.
 */
export function useAssistantConversation(
  state: EditorState,
  dispatch: Dispatch<EditorAction>,
): AssistantConversation {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  function send(message: string): void {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return;
    }
    const reply = interpretAssistantMessage(state.document, state.activeScreenId, trimmed);
    setMessages((previous) => [
      ...previous,
      { id: generateId('message'), role: 'user', text: trimmed },
      {
        id: generateId('message'),
        role: 'assistant',
        text: reply.message,
        proposal: reply.proposal,
        status: reply.proposal ? 'pending' : undefined,
      },
    ]);
  }

  function keep(messageId: string): void {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message?.proposal || message.status !== 'pending') {
      return;
    }
    dispatch({ type: 'assistant/apply', proposal: message.proposal });
    setMessages((previous) =>
      previous.map((candidate) =>
        candidate.id === messageId ? { ...candidate, status: 'applied' } : candidate,
      ),
    );
  }

  function undo(messageId: string): void {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (message?.status !== 'applied') {
      return;
    }
    dispatch({ type: 'history/undo' });
    setMessages((previous) =>
      previous.map((candidate) =>
        candidate.id === messageId ? { ...candidate, status: 'undone' } : candidate,
      ),
    );
  }

  return { messages, send, keep, undo };
}
