import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

describe('AppErrorBoundary', () => {
  it('shows a safe fallback, reports the error, and retries transient failures', () => {
    const onError = vi.fn();
    let shouldThrow = true;
    function FlakyScreen() {
      if (shouldThrow) {
        throw new Error('private implementation detail');
      }
      return <p>Recovered workspace</p>;
    }

    render(
      <AppErrorBoundary onError={onError}>
        <FlakyScreen />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText(/locally saved projects are still safe/)).toBeInTheDocument();
    expect(screen.queryByText('private implementation detail')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute('href', '/projects');
    expect(onError).toHaveBeenCalledOnce();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered workspace')).toBeInTheDocument();
  });
});
