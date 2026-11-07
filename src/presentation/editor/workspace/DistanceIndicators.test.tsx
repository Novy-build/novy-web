import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistanceIndicators } from './DistanceIndicators';

describe('DistanceIndicators', () => {
  it('renders nothing when there are no measurements', () => {
    const { container } = render(<DistanceIndicators indicators={[]} zoom={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders and scales a horizontal pixel measurement', () => {
    render(
      <DistanceIndicators
        indicators={[{ axis: 'x', start: 50, end: 90, position: 120, distance: 40 }]}
        zoom={2}
      />,
    );

    const indicator = screen.getByTestId('distance-indicator');
    expect(indicator).toHaveAttribute('data-distance-axis', 'x');
    expect(indicator.style.left).toBe('100px');
    expect(indicator.style.top).toBe('240px');
    expect(indicator.style.width).toBe('80px');
    expect(indicator.style.height).toBe('1px');
    expect(screen.getByTestId('distance-label')).toHaveTextContent('40 px');
  });

  it('renders and scales a vertical pixel measurement', () => {
    render(
      <DistanceIndicators
        indicators={[{ axis: 'y', start: 100, end: 125.5, position: 80, distance: 25.5 }]}
        zoom={0.5}
      />,
    );

    const indicator = screen.getByTestId('distance-indicator');
    expect(indicator).toHaveAttribute('data-distance-axis', 'y');
    expect(indicator.style.left).toBe('40px');
    expect(indicator.style.top).toBe('50px');
    expect(indicator.style.height).toBe('12.75px');
    expect(indicator.style.width).toBe('1px');
    expect(screen.getByTestId('distance-label')).toHaveTextContent('26 px');
  });
});
