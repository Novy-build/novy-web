import type { ReactNode } from 'react';
import type { DataRecord, DataValue, ListItemContext } from '@domain/entities/appData';
import { resolveEdgeInsets, type ListViewProps } from '@domain/entities/componentNode';
import type { RendererDataContext, RendererMode } from '../renderer';

interface ListViewNodeViewProps {
  componentValues?: ReadonlyMap<string, string>;
  crossExtent: number;
  dataContext?: RendererDataContext;
  itemExtent: number;
  viewportExtent: number;
  mode: RendererMode;
  nodeId: string;
  onItemSelect?: (record: ListItemContext) => void;
  props: ListViewProps;
  renderItem: (record: ListItemContext) => ReactNode;
  runtimeValue?: string;
  templateHasChildren: boolean;
}

/** Scrollable collection that repeats one composed item template per record. */
export function ListViewNodeView({
  componentValues,
  crossExtent,
  dataContext,
  itemExtent,
  viewportExtent,
  mode,
  nodeId,
  onItemSelect,
  props,
  renderItem,
  runtimeValue,
  templateHasChildren,
}: ListViewNodeViewProps) {
  if (mode === 'canvas' && !templateHasChildren) {
    return (
      <div
        aria-hidden="true"
        className="h-full w-full rounded-tile border border-dashed border-hairline bg-surface"
        data-listview-node-id={nodeId}
      />
    );
  }

  const records = resolveListViewRecords(props, dataContext, componentValues, runtimeValue, nodeId);
  if (mode === 'canvas' && records.length === 0) {
    return (
      <ListViewItemOutlines
        itemExtent={itemExtent}
        props={props}
        crossExtent={crossExtent}
        viewportExtent={viewportExtent}
      />
    );
  }
  const visibleRecords = mode === 'canvas'
    ? [records[0]!]
    : records;

  if (visibleRecords.length === 0) {
    return (
      <div className="novy-widget-text-muted flex h-full w-full items-center justify-center rounded-tile border border-dashed border-hairline bg-surface text-sm">
        {props.emptyText || 'No items yet'}
      </div>
    );
  }

  const isVertical = props.scrollDirection === 'vertical';
  return (
    <div
      aria-label="ListView"
      className={`flex h-full w-full rounded-tile border border-hairline bg-surface ${
        isVertical ? 'flex-col overflow-y-auto overflow-x-hidden' : 'flex-row overflow-x-auto overflow-y-hidden'
      }`}
      data-listview-node-id={nodeId}
      role="list"
      style={{ gap: Math.max(0, props.itemSpacing) }}
    >
      {visibleRecords.map((record, index) => {
        const itemLabel = String(record.values.value ?? '').trim() || `Item ${index + 1}`;
        return (
        <div
          aria-label={mode === 'preview' ? `${itemLabel}. Press Enter or Space to open.` : undefined}
          className={`relative shrink-0 ${mode === 'preview' ? 'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600' : ''} ${
            props.showDividers && index > 0
              ? isVertical ? 'border-t border-hairline' : 'border-l border-hairline'
              : ''
          }`}
          key={`${record.itemId}-${index}`}
          onClick={mode === 'preview' ? (event) => {
            event.stopPropagation();
            if ((event.target as HTMLElement).closest('button,input,select,textarea,a,[role="button"]')) return;
            onItemSelect?.(record);
          } : undefined}
          onKeyDown={mode === 'preview' ? (event) => {
            if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            event.stopPropagation();
            onItemSelect?.(record);
          } : undefined}
          role="listitem"
          tabIndex={mode === 'preview' ? 0 : undefined}
          style={isVertical
            ? {
                width: '100%',
                height: itemExtent,
                borderRadius: Math.max(0, props.itemBorderRadius),
                overflow: props.itemBorderRadius > 0 ? 'hidden' : undefined,
              }
            : {
                width: itemExtent,
                height: '100%',
                borderRadius: Math.max(0, props.itemBorderRadius),
                overflow: props.itemBorderRadius > 0 ? 'hidden' : undefined,
              }}
        >
          {templateHasChildren ? renderItem(record) : (
            <FallbackListItem index={index} props={props} record={record} />
          )}
        </div>
        );
      })}
    </div>
  );
}

function ListViewItemOutlines({
  crossExtent,
  itemExtent,
  props,
  viewportExtent,
}: {
  crossExtent: number;
  itemExtent: number;
  props: ListViewProps;
  viewportExtent: number;
}) {
  const isVertical = props.scrollDirection === 'vertical';
  const spacing = Math.max(0, props.itemSpacing);
  const radius = Math.max(0, props.itemBorderRadius);
  const padding = resolveEdgeInsets(props.padding);
  const safeItemExtent = Math.max(1, itemExtent);
  const maxMainInset = safeItemExtent / 2;
  const maxCrossInset = Math.max(1, crossExtent) / 2;
  const insets = isVertical
    ? {
        top: Math.min(padding.top, maxMainInset),
        right: Math.min(padding.right, maxCrossInset),
        bottom: Math.min(padding.bottom, maxMainInset),
        left: Math.min(padding.left, maxCrossInset),
      }
    : {
        top: Math.min(padding.top, maxCrossInset),
        right: Math.min(padding.right, maxMainInset),
        bottom: Math.min(padding.bottom, maxCrossInset),
        left: Math.min(padding.left, maxMainInset),
      };
  const largestInset = Math.max(insets.top, insets.right, insets.bottom, insets.left);
  const count = Math.min(
    6,
    Math.max(1, Math.ceil((Math.max(1, viewportExtent) + spacing) / (safeItemExtent + spacing))),
  );

  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full overflow-hidden rounded-tile border border-hairline bg-surface p-px ${
        isVertical ? 'flex-col' : 'flex-row'
      }`}
      data-testid="listview-item-outlines"
      style={{ gap: spacing }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          className="relative shrink-0 border border-dashed border-brand-500/60 bg-brand-500/[0.03]"
          data-item-padding-bottom={insets.bottom}
          data-item-padding-gutter={largestInset}
          data-item-padding-left={insets.left}
          data-item-padding-right={insets.right}
          data-item-padding-top={insets.top}
          data-testid="listview-item-outline"
          key={index}
          style={isVertical
            ? {
                width: '100%',
                height: safeItemExtent,
                borderRadius: radius,
              }
            : {
                width: safeItemExtent,
                height: '100%',
                borderRadius: radius,
              }}
        >
          {insets.top > 0 ? <span className="pointer-events-none absolute left-0 right-0 top-0 bg-brand-500/[0.08]" style={{ height: insets.top }} /> : null}
          {insets.bottom > 0 ? <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-brand-500/[0.08]" style={{ height: insets.bottom }} /> : null}
          {insets.left > 0 ? <span className="pointer-events-none absolute bottom-0 left-0 top-0 bg-brand-500/[0.08]" style={{ width: insets.left }} /> : null}
          {insets.right > 0 ? <span className="pointer-events-none absolute bottom-0 right-0 top-0 bg-brand-500/[0.08]" style={{ width: insets.right }} /> : null}
        </div>
      ))}
    </div>
  );
}

function FallbackListItem({ index, props, record }: { index: number; props: ListViewProps; record: ListItemContext }) {
  const fieldIds = props.dataSource.kind === 'collection'
    ? props.dataSource.displayFieldIds
    : props.dataSource.fields.map((field) => field.id);
  return (
    <div className="flex h-full min-h-11 flex-col justify-center gap-1 px-3 py-2 text-left">
      {fieldIds.length > 0 ? fieldIds.map((fieldId) => (
        <span className="novy-widget-text block text-sm" key={fieldId}>
          {String(record.values[fieldId] ?? '')}
        </span>
      )) : (
        <span className="novy-widget-text block text-sm">Item {index + 1}</span>
      )}
    </div>
  );
}

function resolveListViewRecords(
  props: ListViewProps,
  dataContext: RendererDataContext | undefined,
  componentValues: ReadonlyMap<string, string> | undefined,
  runtimeValue: string | undefined,
  nodeId: string,
): ListItemContext[] {
  const source = props.dataSource;
  if (source.kind === 'static') {
    const runtimeRecords = parseRuntimeItems(runtimeValue ?? '', nodeId);
    const baseline = runtimeRecords.length > 0 ? runtimeRecords : source.items.map((item) => ({
      listViewId: nodeId,
      itemId: item.id,
      values: item.values,
    }));
    return (dataContext?.localItemsByListView?.get(nodeId) ?? []).reduce<ListItemContext[]>(
      (records, addition) => {
        const item = { listViewId: nodeId, itemId: addition.itemId, values: addition.values };
        return addition.placement === 'prepend' ? [item, ...records] : [...records, item];
      },
      baseline,
    );
  }

  const records = dataContext?.recordsByCollection.get(source.collectionId) ?? [];
  const searchQuery = source.searchComponentId
    ? (componentValues?.get(source.searchComponentId) ?? '').trim().toLowerCase()
    : '';
  const filtered = searchQuery && source.searchFieldId
    ? records.filter((record) => String(record.values[source.searchFieldId!] ?? '').toLowerCase().includes(searchQuery))
    : records;
  return [...filtered]
    .sort((left, right) => compareRecords(left, right, source.sortFieldId, source.sortDirection))
    .map((record) => {
      const primaryFieldId = source.displayFieldIds[0];
      return {
        listViewId: nodeId,
        itemId: record.id,
        values: {
          ...record.values,
          value: record.values.value ?? (primaryFieldId ? record.values[primaryFieldId] ?? '' : ''),
        },
      };
    });
}

function compareRecords(
  left: DataRecord,
  right: DataRecord,
  fieldId: string | undefined,
  direction: 'asc' | 'desc' | undefined,
): number {
  if (!fieldId) return 0;
  const leftValue = left.values[fieldId];
  const rightValue = right.values[fieldId];
  if (leftValue === rightValue) return 0;
  const multiplier = direction === 'desc' ? -1 : 1;
  return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * multiplier;
}

function parseRuntimeItems(value: string, listViewId: string): ListItemContext[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => {
      const source: Record<string, unknown> = typeof item === 'object' && item !== null
        ? item as Record<string, unknown>
        : { value: item };
      const values: Record<string, DataValue> = {};
      for (const [key, candidate] of Object.entries(source)) {
        if (
          candidate === null
          || typeof candidate === 'string'
          || typeof candidate === 'number'
          || typeof candidate === 'boolean'
        ) {
          values[key] = candidate;
        }
      }
      if (!('value' in values)) values.value = String(source.title ?? source.value ?? '');
      return { listViewId, itemId: String(source.documentId ?? source.id ?? index), values };
    });
  } catch {
    return [];
  }
}
