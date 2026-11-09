import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorField, normalizeHexColor } from './ColorField';

describe('ColorField', () => {
  it('renders the labeled hex field and a native color picker', () => {
    const onChange = vi.fn();
    render(<ColorField label="Background" name="background" onChange={onChange} value="#112233" />);

    expect(screen.getByLabelText('Background')).toHaveValue('#112233');
    expect(screen.getByLabelText('Background picker')).toHaveValue('#112233');

    fireEvent.change(screen.getByLabelText('Background picker'), { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenLastCalledWith('#ff0000');
  });

  it('keeps free-form hex editing through the text input', () => {
    const onChange = vi.fn();
    render(<ColorField label="Text color" name="text-color" onChange={onChange} value="#112233" />);

    fireEvent.change(screen.getByLabelText('Text color'), { target: { value: '#445566' } });
    expect(onChange).toHaveBeenLastCalledWith('#445566');
  });

  it('normalizes shorthand hex and falls back for unsupported values', () => {
    expect(normalizeHexColor('#abc')).toBe('#aabbcc');
    expect(normalizeHexColor('#AABBCC')).toBe('#aabbcc');
    expect(normalizeHexColor(' red ')).toBeNull();
    expect(normalizeHexColor('')).toBeNull();
  });

  it('shows a valid swatch value when the saved color cannot be represented', () => {
    const { rerender } = render(<ColorField label="Border color" name="border" onChange={vi.fn()} value="currentColor" />);
    expect(screen.getByLabelText('Border color picker')).toHaveValue('#000000');

    rerender(<ColorField label="Border color" name="border" onChange={vi.fn()} value="#0f0" />);
    expect(screen.getByLabelText('Border color picker')).toHaveValue('#00ff00');
  });
});
