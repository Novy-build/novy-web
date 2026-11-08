import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@presentation/components/system/Modal';
import { ActionMenuNodeView } from './ActionMenuNodeView';

describe('ActionMenuNodeView', () => {
  it('opens a keyboard-accessible menu and reports the selected action', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <Modal labelledBy="title" onClose={onClose}>
        <h2 id="title">Preview</h2>
        <ActionMenuNodeView isPreview itemLabel="First note" label="Note actions" onSelect={onSelect} options={['Edit', 'Delete']} />
      </Modal>,
    );
    const trigger = screen.getByRole('button', { name: 'Note actions: First note' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onSelect).toHaveBeenCalledWith('Delete');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape without closing the surrounding preview', async () => {
    const onClose = vi.fn();
    render(
      <Modal labelledBy="title" onClose={onClose}>
        <h2 id="title">Preview</h2>
        <ActionMenuNodeView isPreview label="Actions" options={['Edit']} />
      </Modal>,
    );
    const trigger = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(trigger);
    await screen.findByRole('menu');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });
});
