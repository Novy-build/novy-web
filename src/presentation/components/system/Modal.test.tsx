import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders a labelled dialog with its content', () => {
    render(
      <Modal labelledBy="test-title" onClose={vi.fn()}>
        <h2 id="test-title">Dialog title</h2>
        <p>Dialog body</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Dialog title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('closes on Escape pressed anywhere', () => {
    const onClose = vi.fn();
    render(
      <Modal labelledBy="test-title" onClose={onClose}>
        <h2 id="test-title">Dialog title</h2>
      </Modal>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on scrim clicks but not on clicks inside the panel', () => {
    const onClose = vi.fn();
    render(
      <Modal labelledBy="test-title" onClose={onClose}>
        <h2 id="test-title">Dialog title</h2>
      </Modal>,
    );

    fireEvent.click(screen.getByText('Dialog title'));

    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('modal-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
