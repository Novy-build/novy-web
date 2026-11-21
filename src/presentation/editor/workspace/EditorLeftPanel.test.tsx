import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeButton } from '@test/editorFixtures';
import type { Screen } from '@domain/entities/screen';
import { EditorLeftPanel } from './EditorLeftPanel';

const SCREENS: Screen[] = [
  { id: 'screen_home', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] },
  { id: 'screen_about', name: 'About', path: '/about', nodes: [], behaviors: [], logicGraphs: [] },
];

function renderPanel(overrides: Record<string, unknown> = {}) {
  const onAddByType = vi.fn();
  const onSelectScreen = vi.fn();
  const onAddScreen = vi.fn();
  const onCollapse = vi.fn();
  render(
    <EditorLeftPanel
      activeScreenId="screen_home"
      nodes={[makeButton('button')]}
      onAddByType={onAddByType}
      onAddScreen={onAddScreen}
      onCollapse={onCollapse}
      onMove={vi.fn()}
      onOrder={vi.fn()}
      onRename={vi.fn()}
      onSelect={vi.fn()}
      onSelectScreen={onSelectScreen}
      onToggleLock={vi.fn()}
      onToggleVisibility={vi.fn()}
      screens={SCREENS}
      selectedNodeId={null}
      {...overrides}
    />,
  );
  return { onAddByType, onAddScreen, onCollapse, onSelectScreen };
}

describe('EditorLeftPanel', () => {
  it('shows only Layers when the activity rail selects Layers', () => {
    renderPanel({ activeSection: 'layers' });

    expect(screen.getByRole('heading', { name: 'Layers' })).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: 'Component layers' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Search screens' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows only Assets when the activity rail selects Assets', () => {
    const { onAddByType } = renderPanel({ activeSection: 'assets' });

    expect(screen.getByRole('heading', { name: 'Assets' })).toBeInTheDocument();
    expect(screen.queryByRole('tree', { name: 'Component layers' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search components' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Button' }));
    expect(onAddByType).toHaveBeenCalledWith('button');
  });

  it('shows only Screens when the activity rail selects Screens', () => {
    renderPanel({ activeSection: 'screens' });

    expect(screen.getByRole('heading', { name: 'Screens' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search screens' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('tree', { name: 'Component layers' })).not.toBeInTheDocument();
  });

  it('selects and adds screens from the Screens view', () => {
    const { onSelectScreen, onAddScreen } = renderPanel({ activeSection: 'screens' });

    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add screen in sidebar' }));

    expect(onSelectScreen).toHaveBeenCalledWith('screen_about');
    expect(onAddScreen).toHaveBeenCalledTimes(1);
  });

  it('reports collapse without rendering a duplicate minimized-sidebar column', () => {
    const { onCollapse } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse editor sidebar' }));
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('complementary', { name: 'editor sidebar minimized' })).not.toBeInTheDocument();
  });

  it('resizes the selected sidebar view by dragging its separator', () => {
    renderPanel();

    const handle = screen.getByRole('separator', { name: 'Resize editor sidebar' });
    const panel = screen.getByRole('complementary', { name: /editor sidebar/i });
    fireEvent.pointerDown(handle, { clientX: 100 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup'));
    });

    expect(panel).toHaveStyle({ width: '296px' });
  });
});
