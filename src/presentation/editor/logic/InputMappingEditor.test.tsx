import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ValueExpression } from '@domain/entities/logic';
import { makeButton, makeText } from '@test/editorFixtures';
import { InputMappingEditor } from './InputMappingEditor';

function Harness({ onChange = vi.fn() }: { onChange?: (value: ValueExpression | null) => void }) {
  const [mapping, setMapping] = useState<ValueExpression | undefined>();
  return (
    <InputMappingEditor
      currentNodeId="action_current"
      inputKey="subject"
      label="Subject"
      logicNodes={[
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
});
