import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Screen } from '@domain/entities/screen';
import { ScreenTabs } from './ScreenTabs';

const SCREENS: Screen[] = [
  { id: 'screen_home', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] },
  { id: 'screen_about', name: 'About', path: '/about', nodes: [], behaviors: [], logicGraphs: [] },
];

function renderTabs(overrides: Record<string, unknown> = {}) {
  const props = {
    screens: SCREENS,
    activeScreenId: 'screen_home',
    onSelectScreen: vi.fn(),
    onAddScreen: vi.fn(),
    onCloseScreen: vi.fn(),
    ...overrides,
  };
  render(<ScreenTabs {...props} />);
  return props;
}

describe('ScreenTabs', () => {
  it('renders one open tab per screen with the active one marked', () => {
    renderTabs();

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'About' })).not.toHaveAttribute('aria-current');
  });

  it('reserves space for a close control instead of a management menu', () => {
    renderTabs();

    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('pl-3', 'pr-10');
    expect(screen.getByRole('button', { name: 'Close tab Home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Screen options for Home' })).not.toBeInTheDocument();
  });

  it('selects and adds screens', () => {
    const props = renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    fireEvent.click(screen.getByLabelText('Add screen'));

    expect(props.onSelectScreen).toHaveBeenCalledWith('screen_about');
    expect(props.onAddScreen).toHaveBeenCalledTimes(1);
  });

  it('closes an editor tab without exposing a delete action', () => {
    const props = renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'Close tab About' }));

    expect(props.onCloseScreen).toHaveBeenCalledWith('screen_about');
    expect(screen.queryByRole('menuitem', { name: 'Delete screen' })).not.toBeInTheDocument();
  });
});
