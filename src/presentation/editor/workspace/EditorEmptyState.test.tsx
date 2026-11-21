import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorEmptyState } from './EditorEmptyState';

describe('EditorEmptyState', () => {
  it('shows the Novy watermark and useful empty-editor actions', () => {
    render(<EditorEmptyState onAddScreen={vi.fn()} onOpenAssistant={vi.fn()} onOpenScreens={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Empty editor' })).toBeInTheDocument();
    expect(screen.getByTestId('empty-editor-logo')).toHaveAttribute('src', expect.stringContaining('novy-logo'));
    expect(screen.getByRole('button', { name: /Open a screen/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create a screen/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask Novy/ })).toBeInTheDocument();
  });

  it('wires all three empty-editor actions', () => {
    const onOpenScreens = vi.fn();
    const onAddScreen = vi.fn();
    const onOpenAssistant = vi.fn();
    render(<EditorEmptyState onAddScreen={onAddScreen} onOpenAssistant={onOpenAssistant} onOpenScreens={onOpenScreens} />);

    fireEvent.click(screen.getByRole('button', { name: /Open a screen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Create a screen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ask Novy/ }));

    expect(onOpenScreens).toHaveBeenCalledTimes(1);
    expect(onAddScreen).toHaveBeenCalledTimes(1);
    expect(onOpenAssistant).toHaveBeenCalledTimes(1);
  });
});
