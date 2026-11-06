import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ruler } from './Ruler';

describe('Ruler', () => {
  it('draws major and minor ticks with labels along the length', () => {
    render(<Ruler length={200} orientation="horizontal" pointer={null} zoom={1} />);

    const ruler = screen.getByTestId('ruler-horizontal');
    const ticks = within(ruler).getAllByTestId('ruler-tick');
    expect(ticks).toHaveLength(21);
    expect(ruler.querySelectorAll('[data-major="true"]')).toHaveLength(5);
    expect(within(ruler).getByText('50')).toBeInTheDocument();
    expect(within(ruler).getByText('200')).toBeInTheDocument();
  });

  it('spaces ticks and labels using the zoom level', () => {
    render(<Ruler length={200} orientation="horizontal" pointer={null} zoom={2} />);

    const ruler = screen.getByTestId('ruler-horizontal');
    expect(ruler.style.width).toBe('400px');
    // zoom 2 picks the 5-unit step, so the same length has twice the ticks.
    expect(within(ruler).getAllByTestId('ruler-tick')).toHaveLength(41);
  });

  it('renders a pointer marker at the reported position', () => {
    render(<Ruler length={200} orientation="horizontal" pointer={42} zoom={1} />);

    expect(screen.getByTestId('ruler-pointer-horizontal').style.left).toBe('42px');
  });

  it('omits the pointer marker when there is no pointer', () => {
    render(<Ruler length={200} orientation="horizontal" pointer={null} zoom={1} />);

    expect(screen.queryByTestId('ruler-pointer-horizontal')).not.toBeInTheDocument();
  });

  it('stacks ticks vertically for the vertical orientation', () => {
    render(<Ruler length={100} orientation="vertical" pointer={20} zoom={1} />);

    const ruler = screen.getByTestId('ruler-vertical');
    expect(ruler.style.height).toBe('100px');
    expect(within(ruler).getAllByTestId('ruler-tick')).toHaveLength(11);
    expect(screen.getByTestId('ruler-pointer-vertical').style.top).toBe('20px');
  });
});
