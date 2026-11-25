import type { DataCollection } from '@domain/entities/appData';
import type { ListViewNode } from '@domain/entities/componentNode';
import type { LogicGraph } from '@domain/entities/logic';
import { resolveListItemFieldResolution } from '@domain/logic/listItemFields';
import type { ListItemBindingField } from './Inspector';

export interface ListItemFieldSource {
  collection: DataCollection | null;
  fields: readonly ListItemBindingField[];
  sourceName?: string;
}

/**
 * Inspector-facing item fields. The shared domain resolver prefers the active
 * `load-list-items` action (or its collection schema), then falls back to the
 * ListView's legacy static/collection fields.
 */
export function resolveListItemFieldSource(
  listView: ListViewNode | null,
  logicGraphs: readonly LogicGraph[],
  collections: readonly DataCollection[],
  fallbackCollectionId: string | undefined,
): ListItemFieldSource {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const resolution = resolveListItemFieldResolution(listView, logicGraphs, byId);
  const collectionId = resolution.collectionId ?? fallbackCollectionId;
  const collection = collectionId ? byId.get(collectionId) ?? null : null;

  if (resolution.source === 'load-action' || resolution.source === 'collection') {
    return { collection, fields: resolution.fields, sourceName: collection?.name ?? 'Current item' };
  }
  if (resolution.source === 'static') {
    return { collection, fields: resolution.fields, sourceName: 'Static items' };
  }
  if (collection) {
    return {
      collection,
      fields: collection.fields.map(({ id, label, type }) => ({ id, label, type })),
      sourceName: collection.name,
    };
  }
  return { collection, fields: [], sourceName: undefined };
}
