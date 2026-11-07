import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LogicNodeLibrary } from './LogicNodeLibrary';
import { LOGIC_NODE_MIME } from './logicNodeRegistry';

describe('LogicNodeLibrary', () => {
  it('keeps its collapse control above a bounded, scrollable node list', () => {
    const onCollapse = vi.fn();
    render(<LogicNodeLibrary onAdd={vi.fn()} onCollapse={onCollapse} />);

    const panel = screen.getByRole('complementary', { name: 'Logic nodes' });
    expect(panel).toHaveClass('h-full', 'min-h-0', 'overflow-hidden');
    expect(screen.getByTestId('logic-node-list')).toHaveClass('min-h-0', 'overflow-y-auto');

    const heading = screen.getByRole('heading', { name: 'Nodes' });
    const collapse = screen.getByRole('button', { name: 'Collapse nodes panel' });
    expect(heading.parentElement).toContainElement(collapse);
    expect(heading.parentElement).not.toContainElement(screen.getByRole('searchbox', { name: 'Search nodes' }));

    fireEvent.click(collapse);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('groups related nodes into collapsible categories', () => {
    render(<LogicNodeLibrary onAdd={vi.fn()} />);

    for (const category of ['Triggers', 'Flow', 'UI', 'Database', 'Actions', 'RAG Nodes', 'Computer Vision']) {
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `${category} group` })).toHaveAttribute('aria-expanded', 'true');
    }
    expect(screen.getByRole('button', { name: 'If / Else' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert to DB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete from DB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Document Loader' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vector Store' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chat Model' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI Agent' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RAG Query' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CV Verify' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RAG Nodes group' }));
    expect(screen.getByRole('button', { name: 'RAG Nodes group' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Document Loader' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CV Verify' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'RAG Nodes group' }));
    expect(screen.getByRole('button', { name: 'Document Loader' })).toBeInTheDocument();
  });

  it('searches node labels, descriptions, and keywords', () => {
    render(<LogicNodeLibrary onAdd={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search nodes' }), {
      target: { value: 'record' },
    });

    expect(screen.getByRole('button', { name: 'Database' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert to DB' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change Text' })).not.toBeInTheDocument();
  });

  it('creates named nodes on click', () => {
    const onAdd = vi.fn();
    render(<LogicNodeLibrary onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: 'If / Else' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete from DB' }));

    expect(onAdd).toHaveBeenNthCalledWith(1, { kind: 'condition' });
    expect(onAdd).toHaveBeenNthCalledWith(2, {
      kind: 'action',
      payload: { type: 'delete-record', collectionId: '', recordId: '' },
    });
  });

  it('creates provider-agnostic biometric actions', () => {
    const onAdd = vi.fn();
    render(<LogicNodeLibrary onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: 'CV Liveness' }));
    fireEvent.click(screen.getByRole('button', { name: 'CV Enroll' }));
    fireEvent.click(screen.getByRole('button', { name: 'CV Verify' }));

    expect(onAdd).toHaveBeenNthCalledWith(1, {
      kind: 'action',
      payload: { type: 'cv-liveness', mediaReference: '' },
    });
    expect(onAdd).toHaveBeenNthCalledWith(2, {
      kind: 'action',
      payload: { type: 'cv-enroll', mediaReference: '', userId: '', consent: false },
    });
    expect(onAdd).toHaveBeenNthCalledWith(3, {
      kind: 'action',
      payload: { type: 'cv-verify', mediaReference: '' },
    });
  });

  it('writes a typed drag payload for canvas placement', () => {
    const setData = vi.fn();
    render(<LogicNodeLibrary onAdd={vi.fn()} />);

    fireEvent.dragStart(screen.getByRole('button', { name: 'Change Text' }), {
      dataTransfer: { effectAllowed: '', setData },
    });

    expect(setData).toHaveBeenCalledWith(LOGIC_NODE_MIME, 'change-text');
  });
});
