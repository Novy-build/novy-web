import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createPadding } from '@domain/entities/componentNode';
import type { ListViewNode } from '@domain/entities/componentNode';
import { ComponentRenderer } from './ComponentRenderer';

function makeListView(): ListViewNode {
  return {
    id: 'list_notes',
    type: 'listview',
    x: 0,
    y: 0,
    w: 320,
    h: 400,
    props: {
      emptyText: 'No items yet',
      showDividers: true,
      scrollDirection: 'vertical',
      crossAxisAlignment: 'stretch',
      gap: 0,
      padding: createPadding(0),
      itemSpacing: 6,
      itemBorderRadius: 10,
      dataSource: {
        kind: 'static',
        fields: [{ id: 'value', label: 'Value', type: 'text' }],
        items: [],
      },
    },
    children: [{
      id: 'text_title',
      type: 'text',
      x: 16,
      y: 8,
      w: 220,
      h: 32,
      props: { text: 'Title', level: 'title' },
      bindings: [{ target: 'text.content', value: { source: 'list-item', fieldId: 'value' } }],
    }],
  };
}

describe('ListView runtime items with bindings', () => {
  it('renders record values for a Text bound to the value field', () => {
    const { container } = render(
      <ComponentRenderer
        mode="preview"
        node={makeListView()}
        selected={false}
        dataContext={{
          collections: [],
          recordsByCollection: new Map(),
          localItemsByListView: new Map([['list_notes', [
            { itemId: 'r1', placement: 'replace', values: { field_title: 'sdasd', field_body: 'asdasd', value: 'sdasd' } },
            { itemId: 'r2', placement: 'replace', values: { field_title: 'asdfdsfasef', field_body: 'xyz', value: 'asdfdsfasef' } },
          ]]]),
        }}
      />,
    );

    expect(screen.getByText('sdasd')).toBeInTheDocument();
    expect(screen.getByText('asdfdsfasef')).toBeInTheDocument();
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(2);
  });
});
