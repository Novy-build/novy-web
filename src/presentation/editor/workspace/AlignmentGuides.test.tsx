import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlignmentGuides } from './AlignmentGuides';

describe('AlignmentGuides', () => {
  it('renders nothing when there are no guides', () => {
    const { container } = render(<AlignmentGuides guides={[]} zoom={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('places vertical guides by design-space position and span', () => {
    render(
      <AlignmentGuides
        guides={[{ axis: 'x', position: 120, start: 40, end: 260, kind: 'edge' }]}
        zoom={2}
      />,
    );

    const guide = screen.getByTestId('alignment-guide');
    expect(guide).toHaveAttribute('data-guide-axis', 'x');
    expect(guide.style.left).toBe('240px');
    expect(guide.style.top).toBe('80px');
    expect(guide.style.height).toBe('440px');
    expect(guide.style.width).toBe('1px');
  });

  it('places horizontal guides by design-space position and span', () => {
    render(
      <AlignmentGuides
        guides={[{ axis: 'y', position: 300, start: 10, end: 90, kind: 'center' }]}
        zoom={1}
      />,
    );

    const guide = screen.getByTestId('alignment-guide');
    expect(guide).toHaveAttribute('data-guide-axis', 'y');
    expect(guide).toHaveAttribute('data-guide-kind', 'center');
    expect(guide.style.top).toBe('300px');
    expect(guide.style.left).toBe('10px');
    expect(guide.style.width).toBe('80px');
    expect(guide.style.height).toBe('1px');
  });

  it('renders one element per guide', () => {
    render(
      <AlignmentGuides
        guides={[
          { axis: 'x', position: 10, start: 0, end: 100, kind: 'edge' },
          { axis: 'y', position: 20, start: 0, end: 100, kind: 'center' },
        ]}
        zoom={1}
      />,
    );

    expect(screen.getAllByTestId('alignment-guide')).toHaveLength(2);
  });
});
