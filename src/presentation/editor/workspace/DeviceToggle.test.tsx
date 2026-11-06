import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeviceToggle } from './DeviceToggle';

describe('DeviceToggle', () => {
  it('renders all device options and marks the active one', () => {
    render(<DeviceToggle label="Canvas device" onChange={vi.fn()} value="tablet" />);

    expect(screen.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Tablet' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('notifies when a device is selected', () => {
    const onChange = vi.fn();
    render(<DeviceToggle label="Canvas device" onChange={onChange} value="desktop" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));

    expect(onChange).toHaveBeenCalledWith('mobile');
  });
});