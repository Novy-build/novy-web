import type { RendererDataContext } from '../renderer';
import type { RepeaterProps } from '@domain/entities/componentNode';

export function RepeaterNodeView({
  props,
  dataContext,
  componentValues,
  runtimeValue,
  onItemSelect,
  renderStatic = false,
}: {
  props: RepeaterProps;
  dataContext?: RendererDataContext;
  componentValues?: ReadonlyMap<string, string>;
  runtimeValue?: string;
  onItemSelect?: (recordId: string) => void;
  renderStatic?: boolean;
}) {
  const source = props.dataSource;
  const runtimeItems = source?.kind === 'static'
    ? parseRuntimeItems(runtimeValue ?? '')
    : [];
  const collection = source?.kind === 'collection'
    ? dataContext?.collections.find((item) => item.id === source.collectionId)
    : undefined;
  const records = source?.kind === 'collection'
    ? dataContext?.recordsByCollection.get(source.collectionId) ?? []
    : runtimeItems;

  const searchQuery = source?.kind === 'collection' && source.searchComponentId
    ? (componentValues?.get(source.searchComponentId) ?? '').trim().toLowerCase()
    : '';
  const filteredRecords = searchQuery && source?.kind === 'collection' && source.searchFieldId
    ? records.filter((record) => String(record.values[source.searchFieldId!] ?? '').toLowerCase().includes(searchQuery))
    : records;

  const sortedRecords = [...filteredRecords].sort((left, right) => {
    if (source?.kind !== 'collection' || !source.sortFieldId) return 0;
    const leftValue = left.values[source.sortFieldId];
    const rightValue = right.values[source.sortFieldId];
    const direction = source.sortDirection === 'desc' ? -1 : 1;
    if (leftValue === rightValue) return 0;
    return leftValue! > rightValue! ? direction : -direction;
  });

  if (sortedRecords.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-tile border border-dashed border-hairline bg-surface text-sm text-ink-muted">
        {props.emptyText || 'No records yet'}
      </div>
    );
  }

  return (
    <div className={`h-full w-full overflow-y-auto ${props.showDividers ? 'divide-y divide-hairline' : ''}`}>
      {sortedRecords.map((record) => (
        <button
          className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-canvas"
          key={record.id}
          onClick={renderStatic ? undefined : () => onItemSelect?.(record.id)}
          type="button"
        >
          {(source?.kind === 'collection' ? source.displayFieldIds : ['title', 'snippet']).map((fieldId) => {
            const field = collection?.fields.find((item) => item.id === fieldId);
            const value = record.values[fieldId];
            return (
              <span className={`block text-sm ${field?.label ? 'text-ink' : 'text-ink-muted'}`} key={fieldId}>
                {value === null || value === undefined ? '' : String(value)}
              </span>
            );
          })}
        </button>
      ))}
    </div>
  );
}

function parseRuntimeItems(value: string): Array<{ id: string; values: Record<string, string> }> {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => {
      const record = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
      return {
        id: String(record.documentId ?? index),
        values: {
          title: String(record.title ?? ''),
          snippet: String(record.snippet ?? ''),
        },
      };
    });
  } catch {
    return [];
  }
}
