import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemFrameOverlay } from './ItemFrameOverlay';

describe('ItemFrameOverlay', () => {
  it('renders the current frame and a ghost with spacing and dividers', () => {
    render(
      <ItemFrameOverlay
        crossExtent={320}
        direction="vertical"
        itemExtent={120}
        padding={12}
        radius={8}
        showDividers
        spacing={10}
        zoom={1}
      />,
    );

    const frames = screen.getAllByTestId('item-frame');
    expect(frames).toHaveLength(2);
    expect(frames[0].style.width).toBe('320px');
    expect(frames[0].style.height).toBe('120px');
    expect(frames[0].style.borderRadius).toBe('8px');
    expect(frames[1].style.top).toBe('130px');
    expect(frames[1].style.opacity).toBe('0.35');
    expect(screen.getByTestId('item-frame-divider')).toBeInTheDocument();
  });

  it('scales with zoom and hides the divider when disabled', () => {
    render(
      <ItemFrameOverlay
        crossExtent={200}
        direction="horizontal"
        itemExtent={90}
        padding={0}
        radius={0}
        showDividers={false}
        spacing={6}
        zoom={2}
      />,
    );

    const frames = screen.getAllByTestId('item-frame');
    expect(frames[0].style.width).toBe('180px');
    expect(frames[0].style.height).toBe('400px');
    expect(frames[0].style.borderRadius).toBe('0px');
    expect(frames[1].style.left).toBe('192px');
    expect(screen.queryByTestId('item-frame-divider')).not.toBeInTheDocument();
  });
});