import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Screen } from '@domain/entities/screen';
import { ScreensPanel } from './ScreensPanel';

const SCREENS: Screen[] = [
  { id: 'screen_home', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] },
  { id: 'screen_about', name: 'About', path: '/about', nodes: [], behaviors: [], logicGraphs: [] },
];

function renderPanel(overrides: Record<string, unknown> = {}) {
  const props = {
    screens: SCREENS,
    activeScreenId: 'screen_home',
    onSelectScreen: vi.fn(),
    onAddScreen: vi.fn(),
    onRenameScreen: vi.fn(),
    onDeleteScreen: vi.fn(),
    ...overrides,
  };
  render(<ScreensPanel {...props} />);
  return props;
}

describe('ScreensPanel', () => {
  it('renders one chip per screen with the active one marked', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'About' })).not.toHaveAttribute('aria-current');
  });

  it('selects a screen and adds a new one from the sidebar', () => {
    const props = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add screen in sidebar' }));

    expect(props.onSelectScreen).toHaveBeenCalledWith('screen_about');
    expect(props.onAddScreen).toHaveBeenCalledTimes(1);
  });

  it('renames a screen by double-clicking its chip', () => {
    const props = renderPanel();

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Home' }));

    const input = screen.getByLabelText('Screen name in sidebar');
    expect(input).toHaveValue('Home');
    fireEvent.change(input, { target: { value: 'Overview' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(props.onRenameScreen).toHaveBeenCalledWith('screen_home', 'Overview');
  });

  it('cancels a rename on Escape without saving', () => {
    const props = renderPanel();

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Home' }));
    fireEvent.change(screen.getByLabelText('Screen name in sidebar'), { target: { value: 'Overview' } });
    fireEvent.keyDown(screen.getByLabelText('Screen name in sidebar'), { key: 'Escape' });

    expect(props.onRenameScreen).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Screen name in sidebar')).not.toBeInTheDocument();
  });

  it('keeps rename and delete in the three-dot management menu', () => {
    const props = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Screen options for About' }));
    const menu = screen.getByRole('menu', { name: 'Menu for About' });
    expect(within(menu).getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Delete screen' }));

    expect(props.onDeleteScreen).toHaveBeenCalledWith('screen_about');
  });

  it('disables delete in the menu while a single screen remains', () => {
    renderPanel({ screens: [SCREENS[0]] });

    fireEvent.click(screen.getByRole('button', { name: 'Screen options for Home' }));
    expect(screen.getByRole('menuitem', { name: 'Delete screen' })).toBeDisabled();
  });

  it('filters screens by name', () => {
    renderPanel();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search screens' }), { target: { value: 'abo' } });

    expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument();
  });
});
