import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LogicNodeLibrary } from './LogicNodeLibrary';
import { LOGIC_NODE_MIME } from './logicNodeRegistry';

describe('LogicNodeLibrary', () => {
  it('lists trigger, flow, UI, and database node categories', () => {
    render(<LogicNodeLibrary onAdd={vi.fn()} />);

    for (const category of ['Triggers', 'Flow', 'UI', 'Database']) {
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'If / Else' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert to DB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete from DB' })).toBeInTheDocument();
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

  it('writes a typed drag payload for canvas placement', () => {
    const setData = vi.fn();
    render(<LogicNodeLibrary onAdd={vi.fn()} />);

    fireEvent.dragStart(screen.getByRole('button', { name: 'Change Text' }), {
      dataTransfer: { effectAllowed: '', setData },
    });

    expect(setData).toHaveBeenCalledWith(LOGIC_NODE_MIME, 'change-text');
  });
});
