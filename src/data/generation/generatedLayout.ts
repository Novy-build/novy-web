import type { Project } from '@domain/entities/project';
import { recordIdentifierForCollection, type DataCollection } from '@domain/entities/appData';
import type {
  ComponentNodeDTO,
  ListViewNodeDTO,
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
    appearance: node.appearance,
    responsive: node.responsive,
    bindings: node.bindings,
    props: { ...node.props },
  };

  if (isContainerNode(node)) {
    return {
      ...base,
      children: node.children.map((child) => mapGeneratedLayoutNode(child, collections)),
    };
  }

  if (isListViewNode(node)) {
    const collection = node.props.dataSource.kind === 'collection'
      ? collections.get(node.props.dataSource.collectionId)
      : undefined;
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
        children: node.children.map((child) => mapGeneratedLayoutNode(child, collections)),
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
    screens: dto.screens.map((screen) => ({
      screenId: screen.id,
      path: screen.path ?? '/',
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
      nodes: screen.nodes.map((node) => mapGeneratedLayoutNode(node, collectionById)),
    })),
  };
}
