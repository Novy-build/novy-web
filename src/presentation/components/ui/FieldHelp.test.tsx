import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldHelp, FieldHelpEnvironmentContext } from './FieldHelp';

function renderHelp(onAskNovy = vi.fn()) {
  render(
    <FieldHelpEnvironmentContext.Provider value={{ editor: 'design', onAskNovy }}>
      <FieldHelp helpKey="screen-background" label="Background" />
    </FieldHelpEnvironmentContext.Provider>,
  );
  return { onAskNovy };
}

describe('FieldHelp', () => {
  it('renders nothing outside an editor environment', () => {
    render(<FieldHelp label="Background" />);
    expect(screen.queryByRole('button', { name: 'About Background' })).not.toBeInTheDocument();
  });

  it('shows the field description on hover and closes on mouse leave', () => {
    renderHelp();
    const trigger = screen.getByRole('button', { name: 'About Background' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('base fill of the screen');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens on keyboard focus and closes on blur or Escape', () => {
    renderHelp();
    const trigger = screen.getByRole('button', { name: 'About Background' });

    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(trigger);
    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('prepares a documentation question for the assistant', () => {
    const { onAskNovy } = renderHelp();
    const trigger = screen.getByRole('button', { name: 'About Background' });

    fireEvent.mouseEnter(trigger);
    fireEvent.click(screen.getByRole('button', { name: /Ask Novy about this/ }));

    expect(onAskNovy).toHaveBeenCalledWith('What does the Background field under Screen surface control?');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('uses generic fallback copy for unmapped fields', () => {
    render(
      <FieldHelpEnvironmentContext.Provider value={{ editor: 'logic', onAskNovy: vi.fn() }}>
        <FieldHelp label="Compare value" />
      </FieldHelpEnvironmentContext.Provider>,
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Compare value' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Controls “Compare value”');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Logic editor');
  });
});
