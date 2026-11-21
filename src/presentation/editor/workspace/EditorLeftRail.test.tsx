import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorLeftRail } from './EditorLeftRail';

function renderRail(overrides: Record<string, unknown> = {}) {
  const props = {
    activeSection: 'layers' as const,
    isPanelOpen: true,
    mode: 'design' as const,
    onHome: vi.fn(),
    onModeChange: vi.fn(),
    onSectionChange: vi.fn(),
    ...overrides,
  };
  render(<EditorLeftRail {...props} />);
  return props;
}

describe('EditorLeftRail', () => {
  it('renders the section and mode controls', () => {
    renderRail();

    expect(screen.getByRole('button', { name: 'Screens section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Layers section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assets section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logic mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Data mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home navigation' })).toBeInTheDocument();
  });

  it('marks only the active design section as pressed', () => {
    renderRail();

    expect(screen.getByRole('button', { name: 'Layers section' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Layers section' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Screens section' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Logic mode' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the active section selected while exposing its collapsed state', () => {
    renderRail({ isPanelOpen: false });

    expect(screen.getByRole('button', { name: 'Layers section' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Layers section' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks the active mode as pressed', () => {
    renderRail({ mode: 'logic' });

    expect(screen.getByRole('button', { name: 'Logic mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Layers section' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports section and mode selection', () => {
    const props = renderRail();

    fireEvent.click(screen.getByRole('button', { name: 'Screens section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Data mode' }));

    expect(props.onSectionChange).toHaveBeenCalledWith('screens');
    expect(props.onModeChange).toHaveBeenCalledWith('data');
  });

  it('reports Home selection from the bottom rail action', () => {
    const props = renderRail();

    fireEvent.click(screen.getByRole('button', { name: 'Home navigation' }));

    expect(props.onHome).toHaveBeenCalledTimes(1);
  });
});
