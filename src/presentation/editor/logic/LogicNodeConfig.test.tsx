import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createActionNode, createBehaviorBundle } from '@domain/factories/logic';
import { LogicNodeConfig } from './LogicNodeConfig';

describe('LogicNodeConfig theme action', () => {
  it('offers Light, Dark, System, and Toggle without requiring a target component', () => {
    const node = createActionNode({ type: 'set-theme', theme: 'toggle' });
    const { behavior } = createBehaviorBundle('Theme', 'button_theme', 'click');
    const onConfigure = vi.fn();
    render(<LogicNodeConfig
      behavior={behavior}
      currentScreenId="home"
      logicNodes={[node]}
      node={node}
      onConfigure={onConfigure}
      onConfigureCondition={vi.fn()}
      onConfigureInputMappings={vi.fn()}
      onConfigureTrigger={vi.fn()}
      onDeleteBehavior={vi.fn()}
      onRemoveSelected={vi.fn()}
      screenNodes={[]}
      screens={[]}
    />);

    const theme = screen.getByRole('combobox', { name: 'Theme' });
    expect(theme).toHaveValue('toggle');
    expect(screen.getAllByRole('option').map((option) => option.getAttribute('value'))).toEqual(['toggle', 'light', 'dark', 'system']);
    fireEvent.change(theme, { target: { value: 'system' } });
    expect(onConfigure).toHaveBeenCalledWith(node.id, { type: 'set-theme', theme: 'system' });
    expect(screen.queryByLabelText('Target component')).not.toBeInTheDocument();
  });
});
