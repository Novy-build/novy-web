import type { Project } from '@domain/entities/project';
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

function isContainerNode(node: ComponentNodeDTO): node is Extract<ComponentNodeDTO, { type: 'container' | 'column' | 'row' }> {
  return node.type === 'container' || node.type === 'column' || node.type === 'row';
}

function mapGeneratedLayoutNode(node: ComponentNodeDTO): GeneratedLayoutNodeDTO {
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
      children: node.children.map(mapGeneratedLayoutNode),
    };
  }

  if (isListViewNode(node)) {
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
        children: node.children.map(mapGeneratedLayoutNode),
      } as GeneratedItemFrameDTO,
    };
  }

  return base;
}

export function mapProjectToGeneratedLayout(project: Project): GeneratedLayoutDTO {
  const dto = mapProjectToDto(project);
  return {
    layoutVersion: 1,
    screens: dto.screens.map((screen) => ({
      screenId: screen.id,
      path: screen.path ?? '/',
      nodes: screen.nodes.map(mapGeneratedLayoutNode),
    })),
  };
}
