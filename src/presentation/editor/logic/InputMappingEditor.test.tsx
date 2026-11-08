import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ValueExpression } from '@domain/entities/logic';
import { makeButton, makeText } from '@test/editorFixtures';
import { InputMappingEditor } from './InputMappingEditor';

function Harness({
  onChange = vi.fn(),
  withItemFields = false,
  withLocalOutput = false,
}: {
  onChange?: (value: ValueExpression | null) => void;
  withItemFields?: boolean;
  withLocalOutput?: boolean;
}) {
  const [mapping, setMapping] = useState<ValueExpression | undefined>();
  return (
    <InputMappingEditor
      currentNodeId="action_current"
      inputKey="subject"
      itemFields={withItemFields ? [{ id: 'email', label: 'Email' }] : []}
      label="Subject"
      logicNodes={[
        ...(withLocalOutput ? [{
          kind: 'action' as const,
          id: 'action_add_local',
          payload: {
            type: 'add-local-list-item' as const,
            targetNodeId: 'list',
            placement: 'append' as const,
            values: { title: 'Draft' },
          },
          position: { x: 40, y: 40 },
        }] : []),
        {
          kind: 'action',
          id: 'action_previous',
          payload: { type: 'show-message', message: 'Done' },
          position: { x: 80, y: 80 },
        },
      ]}
      mapping={mapping}
      onChange={(value) => {
        setMapping(value ?? undefined);
        onChange(value);
      }}
      screenNodes={[
        makeText('node_title', { name: 'Title' }),
        makeButton('node_button'),
      ]}
    />
  );
}

describe('InputMappingEditor', () => {
  it('switches an action input from static to a component expression', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'component' } });
    expect(onChange).toHaveBeenLastCalledWith({
      source: 'component',
      nodeId: 'node_title',
      property: 'text',
    });
    expect(screen.getByLabelText('Subject component source')).toHaveValue('node_title');
  });

  it('configures a previous-node output path and can return to a static value', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'node-output' } });
    fireEvent.change(screen.getByLabelText('Subject output path'), { target: { value: 'result.id' } });
    expect(onChange).toHaveBeenLastCalledWith({
      source: 'node-output',
      nodeId: 'action_previous',
      path: 'result.id',
    });

    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'static' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('offers the current ListView item only when item fields are available', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} withItemFields />);
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'list-item' } });
    expect(onChange).toHaveBeenLastCalledWith({ source: 'list-item', fieldId: 'email' });
    expect(screen.getByLabelText('Subject list item field')).toHaveValue('email');
  });

  it('suggests individual Add Local List Item output fields', () => {
    render(<Harness withLocalOutput />);
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'node-output' } });

    expect(document.querySelector('option[value="item.values.title"]')).toBeInTheDocument();
  });
});
