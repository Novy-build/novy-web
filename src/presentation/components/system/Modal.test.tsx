import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
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

  it('focuses the first control and loops Tab within the dialog', () => {
    render(
      <Modal labelledBy="test-title" onClose={vi.fn()}>
        <h2 id="test-title">Dialog title</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    );

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('locks background scrolling and restores focus to the opener', () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button onClick={() => setIsOpen(true)} type="button">Open dialog</button>
          {isOpen ? (
            <Modal labelledBy="test-title" onClose={() => setIsOpen(false)}>
              <h2 id="test-title">Dialog title</h2>
              <button onClick={() => setIsOpen(false)} type="button">Done</button>
            </Modal>
          ) : null}
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    opener.focus();
    fireEvent.click(opener);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });
});
