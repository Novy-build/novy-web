import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScreenRouteEditor } from './ScreenRouteEditor';

describe('ScreenRouteEditor', () => {
  it('commits a route on blur or Enter', () => {
    const onChange = vi.fn();
    render(<ScreenRouteEditor onChange={onChange} path="/" />);
    const input = screen.getByLabelText('Route');

    fireEvent.change(input, { target: { value: '/account' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('/account');
  });

  it('restores the persisted route on Escape', () => {
    const onChange = vi.fn();
    render(<ScreenRouteEditor onChange={onChange} path="/settings" />);
    const input = screen.getByLabelText('Route');

    fireEvent.change(input, { target: { value: '/draft' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('/settings');
    expect(onChange).not.toHaveBeenCalled();
  });
});
