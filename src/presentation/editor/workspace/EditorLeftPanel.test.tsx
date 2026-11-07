import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeButton } from '@test/editorFixtures';
import { EditorLeftPanel } from './EditorLeftPanel';

function renderPanel() {
  const onAddByType = vi.fn();
  render(
    <EditorLeftPanel
      nodes={[makeButton('button')]}
      onAddByType={onAddByType}
      onMove={vi.fn()}
      onOrder={vi.fn()}
      onRename={vi.fn()}
      onSelect={vi.fn()}
      onToggleLock={vi.fn()}
      onToggleVisibility={vi.fn()}
      selectedNodeId={null}
    />,
  );
  return { onAddByType };
}

describe('EditorLeftPanel', () => {
  it('opens on Layers and switches to component Assets', () => {
    const { onAddByType } = renderPanel();

    expect(screen.getByRole('tab', { name: 'layers', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: 'Component layers' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'assets' }));
    expect(screen.getByRole('tab', { name: 'assets', selected: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Button' }));
    expect(onAddByType).toHaveBeenCalledWith('button');
  });

  it('minimizes to a restore rail and expands again', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse editor sidebar' }));
    expect(screen.queryByRole('tab', { name: 'layers' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'editor sidebar minimized' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand editor sidebar' }));
    expect(screen.getByRole('tab', { name: 'layers', selected: true })).toBeInTheDocument();
  });
});
