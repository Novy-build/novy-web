import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListViewDesignPrompt } from './ListViewDesignPrompt';

describe('ListViewDesignPrompt', () => {
  it('opens item design without starting the parent canvas interaction', () => {
    const onActivate = vi.fn();
    const onPointerDown = vi.fn();
    render(
      <div onPointerDown={onPointerDown}>
        <ListViewDesignPrompt onActivate={onActivate} />
      </div>,
    );

    const button = screen.getByRole('button', { name: 'Add item' });
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Design how each item displayed/)).toBeInTheDocument();
  });
});
