import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorRightRail } from './EditorRightRail';

describe('EditorRightRail', () => {
  it('does not duplicate the Inspector control while the Inspector is open', () => {
    render(
      <EditorRightRail
        isInspectorCollapsed={false}
        onInspectorToggle={vi.fn()}
        onOpenAssistant={vi.fn()}
        showInspectorTab
      />,
    );

    expect(screen.queryByRole('button', { name: 'inspector panel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand inspector panel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI assistant' })).toBeInTheDocument();
  });

  it('offers an Inspector restore control only while the Inspector is collapsed', () => {
    const onInspectorToggle = vi.fn();
    render(
      <EditorRightRail
        isInspectorCollapsed
        onInspectorToggle={onInspectorToggle}
        onOpenAssistant={vi.fn()}
        showInspectorTab
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Expand inspector panel' }));
    expect(onInspectorToggle).toHaveBeenCalledTimes(1);
  });
});
