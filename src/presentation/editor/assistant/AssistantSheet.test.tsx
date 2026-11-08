import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReducer } from 'react';
import type { ProjectDocument } from '@domain/entities/screen';
import { editorReducer } from '../state/editorReducer';
import { createEditorState, getActiveScreen, type EditorState } from '../state/editorState';
import { makeButton, makeScreen, makeText } from '@test/editorFixtures';
import { AssistantSheet } from './AssistantSheet';

const SCREEN = makeScreen('screen_home', [
  makeText('node_text', { x: 24, y: 24, w: 220, h: 36 }),
  makeButton('node_button', { x: 24, y: 560, w: 160, h: 44 }),
]);
const DOCUMENT: ProjectDocument = { screens: [SCREEN] };

/** Captures reducer state so tests can assert the applied document. */
const latest: { current: EditorState | null } = { current: null };

function Harness({ document, onClose }: { document: ProjectDocument; onClose: () => void }) {
  const [state, dispatch] = useReducer(editorReducer, document, createEditorState);
  latest.current = state;
  return <AssistantSheet dispatch={dispatch} onClose={onClose} state={state} />;
}

function renderSheet(document: ProjectDocument = DOCUMENT) {
  const onClose = vi.fn();
  render(<Harness document={document} onClose={onClose} />);
  return onClose;
}

/** Types a message into the composer and submits it; returns the dialog. */
function ask(message: string): HTMLElement {
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Message'), { target: { value: message } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }));
  return dialog;
}

beforeEach(() => {
  latest.current = null;
  window.localStorage.clear();
});

describe('AssistantSheet', () => {
  it('shows the demo badge and hint, and disables Send until text is typed', () => {
    renderSheet();

    expect(screen.getByText(/Demo responses — real AI arrives with the backend/)).toBeInTheDocument();
    expect(screen.getByText('Try a demo command')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    expect(screen.getByLabelText('Message')).toHaveFocus();

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hi' } });
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('keeps keyboard focus inside the sheet', () => {
    renderSheet();
    const close = screen.getByRole('button', { name: 'Close assistant' });
    const message = screen.getByLabelText('Message');

    // Send is disabled, so Message is currently the final tabbable control.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(message).toHaveFocus();
  });

  it('answers unknown intents without proposing a change', () => {
    renderSheet();
    const dialog = ask('make it pop');

    expect(within(dialog).getByText(/demo commands/)).toBeInTheDocument();
    expect(within(dialog).queryByTestId('assistant-proposal')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Keep' })).not.toBeInTheDocument();
  });

  it('keeps an add-button proposal and undoes it through the shared history', () => {
    renderSheet();

    const dialog = ask('add a button "Sign up"');
    expect(within(dialog).getByText('Add a button “Sign up”')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep' }));

    const keptScreen = getActiveScreen(latest.current!);
    expect(keptScreen.nodes.some((node) => node.type === 'button' && node.props.label === 'Sign up')).toBe(true);
    expect(within(dialog).getByText(/Applied — one undo step/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo' }));

    expect(getActiveScreen(latest.current!).nodes).toHaveLength(SCREEN.nodes.length);
    expect(within(dialog).getByText(/Undone/)).toBeInTheDocument();
  });

  it('keeps a student-list proposal with the demo names', () => {
    renderSheet();

    const dialog = ask('create a list of students');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep' }));

    const list = getActiveScreen(latest.current!).nodes.find((node) => node.type === 'listview');
    expect(list?.type === 'listview' && list.props.dataSource.kind === 'static'
      ? list.props.dataSource.items.map((item) => item.values.value)
      : []).toEqual([
      'Ada Lovelace',
      'Alan Turing',
      'Grace Hopper',
    ]);
  });

  it('wires a click-to-change-text proposal on Keep', () => {
    renderSheet();

    const dialog = ask('make the text change when clicked');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep' }));

    const screen = getActiveScreen(latest.current!);
    expect(screen.behaviors).toHaveLength(1);
    expect(screen.behaviors[0]).toMatchObject({ event: 'click', targetNodeId: 'node_button' });

    const step = screen.logicGraphs[0]!.nodes[1]!;
    expect(step.kind === 'action' ? step.payload : undefined).toEqual({
      type: 'change-text',
      targetNodeId: 'node_text',
      text: 'It changed!',
    });
  });

  it('explains what is missing instead of proposing an impossible binding', () => {
    renderSheet({ screens: [makeScreen('screen_home', [makeText('node_text')])] });

    const dialog = ask('make the text change when clicked');

    expect(within(dialog).getByText(/text component and a button/)).toBeInTheDocument();
    expect(within(dialog).queryByTestId('assistant-proposal')).not.toBeInTheDocument();
  });

  it('closes via the close button, the scrim, and Escape', () => {
    const onClose = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('assistant-scrim'));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
