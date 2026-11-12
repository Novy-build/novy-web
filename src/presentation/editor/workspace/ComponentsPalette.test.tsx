import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COMPONENT_MIME, ComponentsPalette, PALETTE_ITEMS } from './ComponentsPalette';

function renderPalette(onAddByType = vi.fn()) {
  render(<ComponentsPalette onAddByType={onAddByType} />);
  return { onAddByType };
}

describe('ComponentsPalette', () => {
  it('groups items into Layout, Basic, and Data categories', () => {
    renderPalette();

    expect(screen.getByRole('heading', { name: 'Layout' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basic' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data' })).toBeInTheDocument();
    expect(screen.getByLabelText('Add Column')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Row')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Container')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Text')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Button')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Text field')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Image')).toBeInTheDocument();
    expect(screen.getByLabelText('Add ListView')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add List')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Add Form')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Add Repeater')).not.toBeInTheDocument();
  });

  it('shows a decorative SVG icon for every asset', () => {
    renderPalette();

    const assetButtons = PALETTE_ITEMS.map((item) => screen.getByRole('button', { name: `Add ${item.label}` }));

    expect(assetButtons).toHaveLength(PALETTE_ITEMS.length);
    assetButtons.forEach((button) => {
      expect(button.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    });
  });

  it('adds a component on click', () => {
    const { onAddByType } = renderPalette();

    fireEvent.click(screen.getByLabelText('Add Button'));

    expect(onAddByType).toHaveBeenCalledWith('button');
  });

  it('throws a typed payload when dragging onto the canvas', () => {
    const { onAddByType } = renderPalette();
    const setData = vi.fn();

    fireEvent.dragStart(screen.getByLabelText('Add Text'), {
      dataTransfer: { setData, effectAllowed: '' },
    });

    expect(setData).toHaveBeenCalledWith(COMPONENT_MIME, 'text');
    expect(screen.getByLabelText('Add Text').draggable).toBe(true);
    expect(onAddByType).not.toHaveBeenCalled();
  });

  it('filters items by search text', () => {
    renderPalette();

    fireEvent.change(screen.getByLabelText('Search components'), { target: { value: 'bu' } });

    expect(screen.getByLabelText('Add Button')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add Text')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Layout' })).not.toBeInTheDocument();
  });

  it('explains when nothing matches the search', () => {
    renderPalette();

    fireEvent.change(screen.getByLabelText('Search components'), { target: { value: 'zzz' } });

    expect(screen.getByRole('status')).toHaveTextContent('No components match “zzz”.');
  });
});
