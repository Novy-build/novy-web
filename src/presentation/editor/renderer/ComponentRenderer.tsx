import type { ComponentNode } from '@domain/entities/componentNode';
import { type PropsWithChildren } from 'react';
import type { ComponentRendererProps } from './renderer';
import { ButtonNodeView } from './nodes/ButtonNodeView';
import { ContainerNodeView } from './nodes/ContainerNodeView';
import { ImageNodeView } from './nodes/ImageNodeView';
import { InputNodeView } from './nodes/InputNodeView';
import { ListNodeView } from './nodes/ListNodeView';
import { TextNodeView } from './nodes/TextNodeView';

interface NodeFrameProps {
  geometry: Pick<ComponentNode, 'id' | 'x' | 'y' | 'w' | 'h'>;
  interactive: boolean;
  selected: boolean;
  onSelect?: (nodeId: string) => void;
}

/**
 * Absolute positioning wrapper shared by every rendered node. In canvas mode
 * it also owns hit-testing: the selection click reaches the deepest node
 * first (inner frames stop propagation).
 */
function NodeFrame({ geometry, interactive, selected, onSelect, children }: PropsWithChildren<NodeFrameProps>) {
  const selectionClass = interactive && selected ? ' ring-2 ring-brand-600' : '';
  return (
    <div
      className={`absolute${selectionClass}`}
      data-node-id={geometry.id}
      data-selected={selected ? 'true' : 'false'}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect?.(geometry.id);
            }
          : undefined
      }
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.w,
        height: geometry.h,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Maps a ComponentNode tree to rendered React. This is the single renderer
 * behind the editor canvas, the preview overlay, and dashboard thumbnails,
 * guaranteeing what the canvas shows is what gets published.
 */
export function ComponentRenderer({ node, mode, selected, onSelect }: ComponentRendererProps) {
  const interactive = mode === 'canvas';
  const renderStatic = mode === 'thumbnail';

  const frame = (children: React.ReactNode) => (
    <NodeFrame
      geometry={node}
      interactive={interactive}
      selected={selected}
      onSelect={onSelect}
    >
      {children}
    </NodeFrame>
  );

  switch (node.type) {
    case 'button':
      return frame(<ButtonNodeView props={node.props} renderStatic={renderStatic} />);
    case 'text':
      return frame(<TextNodeView props={node.props} />);
    case 'input':
      return frame(<InputNodeView props={node.props} renderStatic={renderStatic} />);
    case 'image':
      return frame(<ImageNodeView props={node.props} />);
    case 'list':
      return frame(<ListNodeView props={node.props} />);
    case 'container':
      return frame(
        <ContainerNodeView>
          {node.children.map((child) => (
            <ComponentRenderer
              key={child.id}
              mode={mode}
              node={child}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </ContainerNodeView>,
      );
    default:
      return null;
  }
}
