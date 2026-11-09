import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PaddingValue } from '@domain/entities/componentNode';
import { createPadding } from '@domain/entities/componentNode';
import { PaddingField } from './PaddingField';

describe('PaddingField', () => {
  it('edits every side together in All mode', () => {
    const onChange = vi.fn<(value: PaddingValue) => void>();
    render(
      <PaddingField
        label="Padding"
        namePrefix="padding"
        onChange={onChange}
        value={createPadding(16)}
      />,
    );

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Padding')).toHaveValue(16);

    fireEvent.change(screen.getByLabelText('Padding'), { target: { value: '24' } });

    expect(onChange).toHaveBeenCalledWith({ mode: 'all', top: 24, right: 24, bottom: 24, left: 24 });
  });

  it('updates only the vertical pair in Symmetric mode', () => {
    const onChange = vi.fn<(value: PaddingValue) => void>();
    render(
      <PaddingField
        label="Padding"
        namePrefix="padding"
        onChange={onChange}
        value={{ mode: 'symmetric', top: 8, right: 16, bottom: 8, left: 16 }}
      />,
    );

    expect(screen.getByLabelText('Vertical padding')).toHaveValue(8);
    expect(screen.getByLabelText('Horizontal padding')).toHaveValue(16);

    fireEvent.change(screen.getByLabelText('Vertical padding'), { target: { value: '12' } });

    expect(onChange).toHaveBeenCalledWith({ mode: 'symmetric', top: 12, right: 16, bottom: 12, left: 16 });
  });

  it('updates one side while preserving the others in Only mode', () => {
    const onChange = vi.fn<(value: PaddingValue) => void>();
    render(
      <PaddingField
        label="Item padding"
        namePrefix="item-padding"
        onChange={onChange}
        value={{ mode: 'only', top: 4, right: 8, bottom: 12, left: 16 }}
      />,
    );

    expect(screen.getByLabelText('Item top padding')).toHaveValue(4);
    expect(screen.getByLabelText('Item right padding')).toHaveValue(8);
    expect(screen.getByLabelText('Item bottom padding')).toHaveValue(12);
    expect(screen.getByLabelText('Item left padding')).toHaveValue(16);

    fireEvent.change(screen.getByLabelText('Item right padding'), { target: { value: '20' } });

    expect(onChange).toHaveBeenCalledWith({ mode: 'only', top: 4, right: 20, bottom: 12, left: 16 });
  });

  it('switches modes without discarding stored sides', () => {
    function Harness() {
      const [value, setValue] = useState<PaddingValue>(createPadding(16));
      return (
        <PaddingField
          label="Padding"
          namePrefix="padding"
          onChange={setValue}
          value={value}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Only' }));
    fireEvent.change(screen.getByLabelText('Top padding'), { target: { value: '24' } });
    expect(screen.getByLabelText('Bottom padding')).toHaveValue(16);

    fireEvent.click(screen.getByRole('button', { name: 'Symmetric' }));
    expect(screen.getByLabelText('Vertical padding')).toHaveValue(24);
    expect(screen.getByLabelText('Horizontal padding')).toHaveValue(16);
    fireEvent.change(screen.getByLabelText('Horizontal padding'), { target: { value: '32' } });

    fireEvent.click(screen.getByRole('button', { name: 'Only' }));
    expect(screen.getByLabelText('Top padding')).toHaveValue(24);
    expect(screen.getByLabelText('Right padding')).toHaveValue(32);
    expect(screen.getByLabelText('Bottom padding')).toHaveValue(16);
    expect(screen.getByLabelText('Left padding')).toHaveValue(32);
  });

  it('clamps negative values to zero and ignores cleared fields', () => {
    const onChange = vi.fn<(value: PaddingValue) => void>();
    render(
      <PaddingField
        label="Padding"
        namePrefix="padding"
        onChange={onChange}
        value={createPadding(16)}
      />,
    );

    fireEvent.change(screen.getByLabelText('Padding'), { target: { value: '-8' } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'all', top: 0, right: 0, bottom: 0, left: 0 });

    fireEvent.change(screen.getByLabelText('Padding'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
