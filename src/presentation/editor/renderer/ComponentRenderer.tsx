import type { ComponentAppearance, ComponentNode } from '@domain/entities/componentNode';
import { geometryAtBreakpoint, isHiddenAtBreakpoint } from '@domain/entities/componentNode';
import { type CSSProperties, type PropsWithChildren } from 'react';
import type { ComponentRendererProps } from './renderer';
import { ButtonNodeView } from './nodes/ButtonNodeView';
import { CameraNodeView } from './nodes/CameraNodeView';
import { CheckboxNodeView } from './nodes/CheckboxNodeView';
import { ContainerNodeView } from './nodes/ContainerNodeView';
import { DividerNodeView } from './nodes/DividerNodeView';
import { DropdownNodeView } from './nodes/DropdownNodeView';
import { ImageNodeView } from './nodes/ImageNodeView';
import { InputNodeView } from './nodes/InputNodeView';
import { ListNodeView } from './nodes/ListNodeView';
import { RepeaterNodeView } from './nodes/RepeaterNodeView';
import { ProgressNodeView } from './nodes/ProgressNodeView';
import { RadioNodeView } from './nodes/RadioNodeView';
import { SliderNodeView } from './nodes/SliderNodeView';
import { SwitchNodeView } from './nodes/SwitchNodeView';
import { TextNodeView } from './nodes/TextNodeView';
import { FormNodeView } from './nodes/FormNodeView';

interface NodeFrameProps {
  geometry: Pick<ComponentNode, 'id' | 'x' | 'y' | 'w' | 'h'>;
  interactive: boolean;
  selected: boolean;
  onSelect?: (nodeId: string) => void;
  /** Runtime hook for published behavior (preview overlay executes chains). */
  onNodeAction?: (nodeId: string) => void;
  onNodeEvent?: (nodeId: string, event: 'click' | 'change', value?: string) => void;
  appearance?: ComponentAppearance;
}

/**
 * Absolute positioning wrapper shared by every rendered node. In canvas mode
 * it also owns hit-testing: the selection click reaches the deepest node
 * first (inner frames stop propagation).
 */
function NodeFrame({ geometry, interactive, selected, onSelect, onNodeAction, onNodeEvent, appearance, children }: PropsWithChildren<NodeFrameProps>) {
  const selectionClass = interactive && selected ? ' ring-2 ring-brand-600' : '';
  return (
    <div
      className={`absolute${appearance ? ' novy-node-appearance' : ''}${selectionClass}`}
      data-node-id={geometry.id}
      data-selected={selected ? 'true' : 'false'}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect?.(geometry.id);
            }
          : onNodeEvent || onNodeAction
            ? () => {
                if (onNodeEvent) onNodeEvent(geometry.id, 'click');
                else onNodeAction?.(geometry.id);
              }
            : undefined
      }
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.w,
        height: geometry.h,
        ...appearanceStyle(appearance),
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
export function ComponentRenderer({
  node,
  breakpoint = 'mobile',
  mode,
  selected,
  selectedNodeId = null,
  onSelect,
  onNodeAction,
  onNodeEvent,
  onNodeValueChange,
  componentValues,
  dataContext,
  onFormSubmit,
}: ComponentRendererProps) {
  if (isHiddenAtBreakpoint(node, breakpoint)) {
    return null;
  }
  const interactive = mode === 'canvas' && !node.isLocked;
  const geometry = { id: node.id, ...geometryAtBreakpoint(node, breakpoint) };
  const isSelected = selected || selectedNodeId === node.id;
  const renderStatic = mode === 'thumbnail';
  // Runtime clicks only exist in the reactive preview; canvas delegates to
  // selection and thumbnails stay inert dashboard tiles.
  const runtimeClick = mode === 'preview' && onNodeAction ? onNodeAction : undefined;
  const runtimeEvent = mode === 'preview' ? onNodeEvent : undefined;

  const frame = (children: React.ReactNode) => (
    <NodeFrame
      geometry={geometry}
      appearance={node.appearance}
      interactive={interactive}
      selected={isSelected}
      onSelect={onSelect}
      onNodeAction={runtimeClick}
      onNodeEvent={runtimeEvent}
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
      return frame(
        <InputNodeView
          isPreview={mode === 'preview'}
          value={componentValues?.get(node.id)}
          onValueChange={(value) => {
            onNodeValueChange?.(node.id, value);
            runtimeEvent?.(node.id, 'change', value);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'image':
      return frame(<ImageNodeView props={node.props} />);
    case 'list':
      return frame(
        <ListNodeView
          items={resolveListItems(node.props.items, node.props.dataSource, dataContext)}
          scrollable={node.props.scrollable}
          showDividers={node.props.showDividers}
        />,
      );
    case 'repeater':
      return frame(
        <RepeaterNodeView
          componentValues={componentValues}
          dataContext={dataContext}
          onItemSelect={(recordId) => runtimeEvent?.(node.id, 'click', recordId)}
          props={node.props}
          renderStatic={renderStatic}
          runtimeValue={componentValues?.get(node.id)}
        />,
      );
    case 'checkbox':
      return frame(
        <CheckboxNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); runtimeEvent?.(node.id, 'change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'radio':
      return frame(
        <RadioNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); runtimeEvent?.(node.id, 'change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'switch':
      return frame(
        <SwitchNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); runtimeEvent?.(node.id, 'change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'dropdown':
      return frame(
        <DropdownNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); runtimeEvent?.(node.id, 'change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'slider':
      return frame(
        <SliderNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); runtimeEvent?.(node.id, 'change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'progress':
      return frame(<ProgressNodeView props={node.props} />);
    case 'divider':
      return frame(<DividerNodeView props={node.props} renderStatic={renderStatic} />);
    case 'camera':
      return frame(
        <CameraNodeView
          isPreview={mode === 'preview'}
          onCapture={(mediaReference) => {
            onNodeValueChange?.(node.id, mediaReference);
            runtimeEvent?.(node.id, 'change', mediaReference);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'container':
      return frame(
        <ContainerNodeView>
          {node.children.map((child) => (
            <ComponentRenderer
              key={child.id}
              componentValues={componentValues}
              breakpoint={breakpoint}
              mode={mode}
              node={child}
              onSelect={onSelect}
              onNodeAction={runtimeClick}
              onNodeEvent={runtimeEvent}
              onNodeValueChange={onNodeValueChange}
              dataContext={dataContext}
              onFormSubmit={onFormSubmit}
              selected={false}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </ContainerNodeView>,
      );
    case 'form':
      return frame(
        <FormNodeView
          onSubmit={(values) => onFormSubmit?.(node.id, values)}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    default:
      return null;
  }
}

function appearanceStyle(appearance: ComponentAppearance | undefined): CSSProperties {
  if (!appearance) return {};
  return {
    backgroundColor: appearance.backgroundColor || undefined,
    color: appearance.textColor || undefined,
    borderColor: appearance.borderColor || undefined,
    borderStyle: appearance.borderColor ? 'solid' : undefined,
    borderWidth: appearance.borderColor ? 1 : undefined,
    borderRadius: appearance.borderRadius,
    opacity: appearance.opacity,
    overflow: appearance.borderRadius ? 'hidden' : undefined,
  };
}

function resolveListItems(
  staticItems: string[],
  source: Extract<ComponentNode, { type: 'list' }>['props']['dataSource'],
  dataContext: ComponentRendererProps['dataContext'],
): string[] {
  if (!source || source.kind === 'static' || !dataContext) return staticItems;
  return (dataContext.recordsByCollection.get(source.collectionId) ?? []).map((record) =>
    String(record.values[source.displayFieldId] ?? ''),
  );
}
