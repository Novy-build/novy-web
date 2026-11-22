import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createActionNode, createBehaviorBundle } from '@domain/factories/logic';
import { LogicNodeConfig } from './LogicNodeConfig';
import { createComponentNode } from '@domain/factories/componentNode';

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

describe('LogicNodeConfig chart data action', () => {
  it('owns the chart target, collection, category, and numeric series mapping', () => {
    const node = createActionNode({
      type: 'load-chart-data', targetNodeId: '', collectionId: '', categoryFieldId: '', series: [],
    });
    const chart = createComponentNode('chart');
    const { behavior } = createBehaviorBundle('Load chart', chart.id, 'load');
    const onConfigure = vi.fn();
    render(<LogicNodeConfig
      behavior={behavior}
      collections={[{
        id: 'sales', projectId: 'project', databaseId: 'database', name: 'Sales',
        fields: [
          { id: 'month', key: 'month', label: 'Month', type: 'text', required: true },
          { id: 'total', key: 'total', label: 'Total', type: 'number', required: true },
        ],
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      }]}
      currentScreenId="home"
      logicNodes={[node]}
      node={node}
      onConfigure={onConfigure}
      onConfigureCondition={vi.fn()}
      onConfigureInputMappings={vi.fn()}
      onConfigureTrigger={vi.fn()}
      onDeleteBehavior={vi.fn()}
      onRemoveSelected={vi.fn()}
      screenNodes={[chart]}
      screens={[]}
    />);

    fireEvent.change(screen.getByLabelText('Collection'), { target: { value: 'sales' } });
    expect(onConfigure).toHaveBeenCalledWith(node.id, expect.objectContaining({ collectionId: 'sales' }));
    fireEvent.change(screen.getByLabelText('Target chart'), { target: { value: chart.id } });
    expect(onConfigure).toHaveBeenCalledWith(node.id, expect.objectContaining({ targetNodeId: chart.id }));
  });
});

describe('LogicNodeConfig list items action', () => {
  it('owns the ListView target, fields, sort, and search configuration', () => {
    const node = createActionNode({
      type: 'load-list-items', targetNodeId: '', collectionId: 'students', fields: [],
    });
    const list = createComponentNode('listview');
    const { behavior } = createBehaviorBundle('Load list', list.id, 'load');
    const onConfigure = vi.fn();
    render(<LogicNodeConfig
      behavior={behavior}
      collections={[{
        id: 'students', projectId: 'project', databaseId: 'database', name: 'Students',
        fields: [
          { id: 'name', key: 'name', label: 'Name', type: 'text', required: true },
          { id: 'age', key: 'age', label: 'Age', type: 'number', required: false },
        ],
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      }]}
      currentScreenId="home"
      logicNodes={[node]}
      node={node}
      onConfigure={onConfigure}
      onConfigureCondition={vi.fn()}
      onConfigureInputMappings={vi.fn()}
      onConfigureTrigger={vi.fn()}
      onDeleteBehavior={vi.fn()}
      onRemoveSelected={vi.fn()}
      screenNodes={[list]}
      screens={[]}
    />);

    fireEvent.change(screen.getByLabelText('Collection'), { target: { value: 'students' } });
    fireEvent.change(screen.getByLabelText('Target ListView'), { target: { value: list.id } });
    expect(onConfigure).toHaveBeenCalledWith(node.id, expect.objectContaining({ targetNodeId: list.id }));
    fireEvent.change(screen.getByLabelText('Sort field'), { target: { value: 'name' } });
    expect(onConfigure).toHaveBeenCalledWith(node.id, expect.objectContaining({ sortFieldId: 'name' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Age' }));
    expect(onConfigure).toHaveBeenCalledWith(node.id, expect.objectContaining({
      fields: [{ id: 'name', label: 'Name', type: 'text' }],
    }));
  });
});
