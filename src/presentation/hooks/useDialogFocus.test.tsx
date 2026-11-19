import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDialogFocus } from './useDialogFocus';

function Harness({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ containerRef, enabled, onClose });
  return <div ref={containerRef}>
    <button type="button">First</button>
    <details><summary>Check details</summary><button type="button">Collapsed control</button></details>
    <div inert><button type="button">Inert control</button></div>
  </div>;
}

describe('useDialogFocus', () => {
  it('suspends its keyboard handlers while another modal owns focus', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness enabled onClose={onClose} />);
    rerender(<Harness enabled={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    rerender(<Harness enabled onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('excludes collapsed and inert controls from its tab loop', () => {
    render(<Harness enabled onClose={vi.fn()} />);
    const summary = screen.getByText('Check details');
    summary.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(summary).toHaveFocus();
  });
});
