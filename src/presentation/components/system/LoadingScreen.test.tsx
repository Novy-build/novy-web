import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingScreen } from './LoadingScreen';

describe('LoadingScreen', () => {
  it('announces its current loading label', () => {
    render(<LoadingScreen label="Preparing workspace…" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Preparing workspace…');
  });
});
