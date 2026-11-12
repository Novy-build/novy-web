import { fireEvent, render, screen, within } from '@testing-library/react';
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
    onRenameScreen: vi.fn(),
    onDeleteScreen: vi.fn(),
    ...overrides,
  };
  render(<ScreenTabs {...props} />);
  return props;
}

describe('ScreenTabs', () => {
  it('renders one tab per screen with the active one marked', () => {
    renderTabs();

    const active = screen.getByRole('button', { name: 'Home' });
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'About' })).not.toHaveAttribute('aria-current');
  });

  it('reserves space between each screen name and its options control', () => {
    renderTabs();

    expect(screen.getByRole('button', { name: 'Home' })).toHaveClass('pl-3', 'pr-12');
    expect(screen.getByRole('button', { name: 'Screen options for Home' })).toHaveClass('right-1', 'w-8');
  });

  it('selects and adds screens', () => {
    const props = renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    fireEvent.click(screen.getByLabelText('Add screen'));

    expect(props.onSelectScreen).toHaveBeenCalledWith('screen_about');
    expect(props.onAddScreen).toHaveBeenCalledTimes(1);
  });

  it('renames through the tab menu', () => {
    const props = renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'Screen options for Home' }));
    fireEvent.click(within(screen.getByRole('menu', { name: 'Menu for Home' })).getByRole('menuitem', { name: 'Rename' }));

    const input = screen.getByLabelText('Screen name');
    expect(input).toHaveValue('Home');
    fireEvent.change(input, { target: { value: 'Overview' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(props.onRenameScreen).toHaveBeenCalledWith('screen_home', 'Overview');
  });

  it('cancels rename on Escape without saving', () => {
    const props = renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'Screen options for Home' }));
    fireEvent.click(within(screen.getByRole('menu', { name: 'Menu for Home' })).getByRole('menuitem', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Screen name'), { target: { value: 'Overview' } });
    fireEvent.keyDown(screen.getByLabelText('Screen name'), { key: 'Escape' });

    expect(props.onRenameScreen).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Screen name')).not.toBeInTheDocument();
  });

  it('deletes a screen from its menu when others remain', () => {
    const props = renderTabs();

    fireEvent.click(screen.getByRole('button', { name: 'Screen options for About' }));
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete screen' });
    fireEvent.click(deleteItem);

    expect(props.onDeleteScreen).toHaveBeenCalledWith('screen_about');
  });

  it('disables delete while a single screen remains', () => {
    renderTabs({ screens: [SCREENS[0]] });

    fireEvent.click(screen.getByRole('button', { name: 'Screen options for Home' }));

    expect(screen.getByRole('menuitem', { name: 'Delete screen' })).toBeDisabled();
  });
});
