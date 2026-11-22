import type { Project } from '@domain/entities/project';
import { recordIdentifierForCollection, type DataCollection } from '@domain/entities/appData';
import type {
  ComponentNodeDTO,
  ListViewNodeDTO,
  ScreenDTO,
} from '../dto/project.dto';
import type {
  GeneratedItemFrameDTO,
  GeneratedLayoutDTO,
  GeneratedLayoutNodeDTO,
} from '../dto/generatedApp.dto';
import { mapProjectToDto } from '../mappers/project.mapper';

function isListViewNode(node: ComponentNodeDTO): node is ListViewNodeDTO {
  return node.type === 'listview';
}

function isContainerNode(node: ComponentNodeDTO): node is Extract<ComponentNodeDTO, { type: 'container' | 'gesture-detector' | 'column' | 'row' }> {
  return node.type === 'container' || node.type === 'gesture-detector' || node.type === 'column' || node.type === 'row';
}

function mapGeneratedLayoutNode(
  node: ComponentNodeDTO,
  collections: ReadonlyMap<string, DataCollection>,
  screen?: ScreenDTO,
): GeneratedLayoutNodeDTO {
  const base: GeneratedLayoutNodeDTO = {
    id: node.id,
    type: node.type,
    name: node.name,
    isHidden: node.isHidden,
    isLocked: node.isLocked,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
    styleId: node.styleId,
    appearance: node.appearance,
    responsive: node.responsive,
    bindings: node.bindings,
    props: { ...node.props },
  };

  if (isContainerNode(node)) {
    return {
      ...base,
      children: node.children.map((child) => mapGeneratedLayoutNode(child, collections, screen)),
    };
  }

  if (isListViewNode(node)) {
    const loader = screen?.logicGraphs
      .flatMap((graph) => graph.nodes)
      .find((candidate) => candidate.kind === 'action'
        && candidate.payload.type === 'load-list-items'
        && candidate.payload.targetNodeId === node.id);
    const loaderCollectionId = loader?.kind === 'action' && loader.payload.type === 'load-list-items'
      ? loader.payload.collectionId
      : node.props.dataSource.kind === 'collection'
        ? node.props.dataSource.collectionId
        : null;
    const collection = loaderCollectionId ? collections.get(loaderCollectionId) : undefined;
    const identifier = collection ? recordIdentifierForCollection(collection) : null;
    return {
      ...base,
      itemFrame: {
        id: `${node.id}__item-frame`,
        kind: 'container',
        role: 'repeated-item',
        constraints: {
          crossAxis: 'fill-listview',
          mainAxis: 'hug-content',
        },
        padding: node.props.padding,
        itemSpacing: node.props.itemSpacing ?? 0,
        itemBorderRadius: node.props.itemBorderRadius ?? 0,
        showDividers: node.props.showDividers,
        ...(collection && identifier
          ? {
              recordIdentity: {
                collectionId: collection.id,
                key: identifier.key,
                source: 'record-id' as const,
                generation: identifier.generation,
              },
            }
          : {}),
        children: node.children.map((child) => mapGeneratedLayoutNode(child, collections, screen)),
      } as GeneratedItemFrameDTO,
    };
  }

  return base;
}

export function mapProjectToGeneratedLayout(
  project: Project,
  collections: readonly DataCollection[] = [],
): GeneratedLayoutDTO {
  const dto = mapProjectToDto(project);
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  return {
    layoutVersion: 2,
    ...(dto.designSystem ? { designSystem: structuredClone(dto.designSystem) } : {}),
    screens: dto.screens.map((screen) => ({
      screenId: screen.id,
      path: screen.path ?? '/',
      ...(screen.appearance ? { appearance: structuredClone(screen.appearance) } : {}),
      ...(screen.routeParameters && screen.routeParameters.length > 0
        ? {
            routeParameters: screen.routeParameters.map((parameter) => ({
              name: parameter.name,
              source: 'record-id' as const,
              collectionId: parameter.source.collectionId,
              identifierKey: parameter.source.identifierKey,
            })),
          }
        : {}),
      nodes: screen.nodes.map((node) => mapGeneratedLayoutNode(node, collectionById, screen)),
    })),
  };
}
