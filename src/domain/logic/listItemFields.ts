import type { DataCollection, DataFieldType } from '../entities/appData';
import type { ListViewNode } from '../entities/componentNode';
import type { LogicGraph } from '../entities/logic';

export interface ListItemFieldRef {
  id: string;
  label: string;
  type: DataFieldType;
}

export interface ListItemFieldResolution {
  /** Collection named by the load action or a collection-backed ListView. */
  collectionId?: string;
  fields: readonly ListItemFieldRef[];
  /** `value` is injected into runtime items whenever a load action supplies them. */
  hasValueAlias: boolean;
  source: 'load-action' | 'collection' | 'static' | 'none';
}

/**
 * Single source of truth for the fields available to ListView item-template
 * bindings. Collection loading is owned by the `load-list-items` Logic action,
 * so its fields (or its collection schema when the field list is empty) win
 * over the ListView's legacy `dataSource`. Used by both the Inspector and
 * project validation so they cannot disagree about what is bindable.
 */
export function resolveListItemFieldResolution(
  listView: ListViewNode | null,
  logicGraphs: readonly LogicGraph[],
  collections: ReadonlyMap<string, DataCollection>,
): ListItemFieldResolution {
  const dataSource = listView?.props.dataSource;
  const loader = listView
    ? logicGraphs
        .flatMap((graph) => graph.nodes)
        .find((node) => node.kind === 'action'
          && node.payload.type === 'load-list-items'
          && node.payload.targetNodeId === listView.id)
    : undefined;
  const loadPayload = loader?.kind === 'action' && loader.payload.type === 'load-list-items'
    ? loader.payload
    : null;

  const collectionId = loadPayload?.collectionId
    ?? (dataSource?.kind === 'collection' ? dataSource.collectionId : undefined);
  const collection = collectionId ? collections.get(collectionId) : undefined;

  if (loadPayload) {
    if (loadPayload.fields.length > 0) {
      return { collectionId, fields: loadPayload.fields, hasValueAlias: true, source: 'load-action' };
    }
    if (collection && collection.fields.length > 0) {
      return {
        collectionId,
        fields: collection.fields.map(({ id, label, type }) => ({ id, label, type })),
        hasValueAlias: true,
        source: 'collection',
      };
    }
  }
  if (dataSource?.kind === 'static') {
    return { collectionId, fields: dataSource.fields, hasValueAlias: false, source: 'static' };
  }
  if (dataSource?.kind === 'collection') {
    return {
      collectionId,
      fields: collection?.fields.map(({ id, label, type }) => ({ id, label, type })) ?? [],
      hasValueAlias: false,
      source: 'collection',
    };
  }
  return { collectionId, fields: [], hasValueAlias: false, source: 'none' };
}
