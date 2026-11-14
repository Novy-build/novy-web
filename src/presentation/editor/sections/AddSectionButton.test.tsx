import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddSectionButton } from './AddSectionButton';

describe('AddSectionButton', () => {
  it('adds a section through one accessible action', () => {
    const onClick = vi.fn();
    render(<AddSectionButton onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
