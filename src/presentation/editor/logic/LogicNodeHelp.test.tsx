import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { FieldHelpEnvironmentContext } from '@presentation/components/ui/FieldHelp';
import { LogicNodeHelp } from './LogicNodeHelp';
import { logicNodeDefinition, type LogicNodeDefinition } from './logicNodeRegistry';

function renderHelp(definition: LogicNodeDefinition, onAskNovy?: (query: string) => void) {
  return render(
    <MemoryRouter initialEntries={['/project/p1/editor']}>
      <Routes>
        <Route
          element={
            <FieldHelpEnvironmentContext.Provider value={{ editor: 'logic', onAskNovy }}>
              <LogicNodeHelp definition={definition} />
            </FieldHelpEnvironmentContext.Provider>
          }
          path="/project/:projectId/editor"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LogicNodeHelp', () => {
  it('opens a popover with the node description, how-to, example and an example link', () => {
    renderHelp(logicNodeDefinition('trigger-click')!);

    const trigger = screen.getByRole('button', { name: 'About On Click' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('On Click');
    expect(tooltip).toHaveTextContent('Start when a component is clicked');
    expect(tooltip).toHaveTextContent('Starts a workflow when the user clicks');
    expect(tooltip).toHaveTextContent('Example flow');

    const link = screen.getByRole('link', { name: /View example/ });
    expect(link).toHaveAttribute('href', '/docs/logic-nodes/trigger-click?from=%2Fproject%2Fp1%2Feditor');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('asks Novy with a prepared question and closes the popover', () => {
    const onAskNovy = vi.fn();
    renderHelp(logicNodeDefinition('trigger-click')!, onAskNovy);
    fireEvent.click(screen.getByRole('button', { name: 'About On Click' }));

    fireEvent.click(screen.getByRole('button', { name: /Ask Novy about this/ }));

    expect(onAskNovy).toHaveBeenCalledTimes(1);
    expect(onAskNovy.mock.calls[0][0]).toContain('On Click');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides the assistant action outside an editor environment', () => {
    render(<LogicNodeHelp definition={logicNodeDefinition('trigger-click')!} />);
    fireEvent.click(screen.getByRole('button', { name: 'About On Click' }));

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View example/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ask Novy about this/ })).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the trigger', () => {
    renderHelp(logicNodeDefinition('trigger-click')!);
    const trigger = screen.getByRole('button', { name: 'About On Click' });
    fireEvent.click(trigger);

    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('links dynamic component nodes to the generic component guide', () => {
    const definition: LogicNodeDefinition = {
      id: 'component-abc-change',
      category: 'Components',
      label: 'Title · Text field',
      description: 'When Title is changed',
      icon: '↻',
      keywords: [],
      create: () => ({ kind: 'trigger', event: 'change' }),
    };
    renderHelp(definition);
    fireEvent.click(screen.getByRole('button', { name: 'About Title · Text field' }));

    expect(screen.getByRole('link', { name: /View example/ })).toHaveAttribute(
      'href',
      '/docs/logic-nodes/component-change?from=%2Fproject%2Fp1%2Feditor',
    );
  });
});
