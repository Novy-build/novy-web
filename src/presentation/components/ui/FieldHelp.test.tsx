import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
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

function renderWith(children: ReactNode) {
  render(
    <FieldHelpEnvironmentContext.Provider value={{ editor: 'design', onAskNovy: vi.fn() }}>
      {children}
    </FieldHelpEnvironmentContext.Provider>,
  );
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

  it('lists the options of a sibling <select> with curated use cases', () => {
    renderWith(
      <>
        <label htmlFor="data-source">Data source <FieldHelp label="Data source" /></label>
        <select id="data-source">
          <option value="static">Static items</option>
          <option value="collection">Collection</option>
        </select>
      </>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Data source' }));
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('Choices')).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Hard-code a short, fixed list');
    expect(tooltip).toHaveTextContent('Read records from a project data collection');
    expect(screen.getByRole('combobox', { name: /Data source/ })).toBeInTheDocument();
  });

  it('lists options from a select nested in the label', () => {
    renderWith(
      <label>
        Input type
        <FieldHelp label="Input type" />
        <select><option value="text">Text</option><option value="password">Password</option></select>
      </label>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Input type' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Stores plain text');
    expect(tooltip).toHaveTextContent('Masks characters while typing');
    expect(screen.getByRole('combobox', { name: /Input type/ })).toBeInTheDocument();
  });

  it('lists options from the first select in a fieldset', () => {
    renderWith(
      <fieldset>
        <legend>Use value from <FieldHelp label="Use value from" /></legend>
        <select>
          <option value="literal">Fixed value</option>
          <option value="variable">Application variable</option>
        </select>
      </fieldset>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Use value from' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Uses a literal value you type below');
  });

  it('caps dynamic option values and uses the category hint', () => {
    renderWith(
      <label htmlFor="collection">
        Collection <FieldHelp label="Collection" />
      </label>,
    );
    const select = document.createElement('select');
    select.id = 'collection';
    for (const name of ['Tasks', 'Students', 'Orders', 'Notes', 'Events', 'Books', 'Files']) {
      select.add(new Option(name, name));
    }
    document.body.append(select);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Collection' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Tasks');
    expect(tooltip).toHaveTextContent('Events');
    expect(tooltip).not.toHaveTextContent('Books');
    expect(tooltip).toHaveTextContent('+2 more');
    expect(tooltip).toHaveTextContent('Uses records from this collection');
  });

  it('uses explicit choices for custom comboboxes', () => {
    renderWith(
      <FieldHelp label="Body font stack" helpOptions={[{ label: 'Inter' }, { label: 'System Serif' }]} />,
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Body font stack' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Inter');
    expect(screen.getByRole('tooltip')).toHaveTextContent('System Serif');
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
