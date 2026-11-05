import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and handles clicks', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Save project</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactions while loading', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save project
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save project' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('spans the full width when isBlock is set', () => {
    render(
      <Button isBlock variant="ghost">
        Continue as demo user
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Continue as demo user' })).toHaveClass('w-full');
  });

  it('supports native types for form submission', () => {
    render(<Button type="submit">Log in</Button>);

    expect(screen.getByRole('button', { name: 'Log in' })).toHaveAttribute('type', 'submit');
  });
});
