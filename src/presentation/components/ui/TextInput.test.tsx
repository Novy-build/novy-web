import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('associates the label with the field', () => {
    render(<TextInput label="Email" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('reports values through onChange', () => {
    const handleChange = vi.fn();
    render(<TextInput label="Email" onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carl@novy.app' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0].target.value).toBe('carl@novy.app');
  });

  it('renders field errors inline and flags the input for assistive tech', () => {
    render(<TextInput error="Enter a valid email address, like you@example.com." label="Email" onChange={vi.fn()} />);

    const input = screen.getByLabelText('Email');
    expect(input).toBeInvalid();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address, like you@example.com.');
  });

  it('renders the hint when there is no error', () => {
    render(<TextInput hint="We never share it." label="Email" onChange={vi.fn()} />);

    expect(screen.getByText('We never share it.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
