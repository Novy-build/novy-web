import type { ComponentAppearance, ComponentNode } from '@domain/entities/componentNode';
import { childGeometriesAtBreakpoint, geometryAtBreakpoint, isHiddenAtBreakpoint, listViewItemExtent } from '@domain/entities/componentNode';
import { resolveBoundBoolean, resolveBoundNumber, resolveBoundText } from '@domain/bindings/componentBindings';
import { useAppTheme } from './AppThemeContext';
import { type CSSProperties, type PropsWithChildren } from 'react';
import type { ComponentRendererProps, RendererEventContext } from './renderer';
import { ButtonNodeView } from './nodes/ButtonNodeView';
import { CameraNodeView } from './nodes/CameraNodeView';
import { CheckboxNodeView } from './nodes/CheckboxNodeView';
import { ContainerNodeView } from './nodes/ContainerNodeView';
import { DividerNodeView } from './nodes/DividerNodeView';
import { DropdownNodeView } from './nodes/DropdownNodeView';
import { ImageNodeView } from './nodes/ImageNodeView';
import { InputNodeView } from './nodes/InputNodeView';
import { LinearLayoutNodeView } from './nodes/LinearLayoutNodeView';
import { ListViewNodeView } from './nodes/ListViewNodeView';
import { ProgressNodeView } from './nodes/ProgressNodeView';
import { RadioNodeView } from './nodes/RadioNodeView';
import { SliderNodeView } from './nodes/SliderNodeView';
import { SwitchNodeView } from './nodes/SwitchNodeView';
import { TextNodeView } from './nodes/TextNodeView';

interface NodeFrameProps {
  geometry: Pick<ComponentNode, 'id' | 'x' | 'y' | 'w' | 'h'>;
  interactive: boolean;
  selected: boolean;
  onSelect?: (nodeId: string) => void;
  /** Runtime hook for published behavior (preview overlay executes chains). */
  onNodeAction?: (nodeId: string) => void;
  onNodeEvent?: (nodeId: string, event: 'click' | 'change', value?: string, context?: RendererEventContext) => void;
  eventContext?: RendererEventContext;
  appearance?: ComponentAppearance;
}

/**
 * Absolute positioning wrapper shared by every rendered node. In canvas mode
 * it also owns hit-testing: the selection click reaches the deepest node
 * first (inner frames stop propagation).
 */
function NodeFrame({ geometry, interactive, selected, onSelect, onNodeAction, onNodeEvent, eventContext, appearance, children }: PropsWithChildren<NodeFrameProps>) {
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
                 if (onNodeEvent && eventContext) onNodeEvent(geometry.id, 'click', undefined, eventContext);
                 else if (onNodeEvent) onNodeEvent(geometry.id, 'click');
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
  geometryOverride,
  itemContext,
}: ComponentRendererProps) {
  const appTheme = useAppTheme();
  if (isHiddenAtBreakpoint(node, breakpoint) || !resolveBoundBoolean(node, 'component.visible', itemContext, true)) {
    return null;
  }
  const interactive = mode === 'canvas' && !node.isLocked;
  const geometry = { id: node.id, ...(geometryOverride ?? geometryAtBreakpoint(node, breakpoint)) };
  const isSelected = selected || selectedNodeId === node.id;
  const renderStatic = mode === 'thumbnail';
  // Runtime clicks only exist in the reactive preview; canvas delegates to
  // selection and thumbnails stay inert dashboard tiles.
  const runtimeClick = mode === 'preview' && onNodeAction ? onNodeAction : undefined;
  const runtimeEvent = mode === 'preview' ? onNodeEvent : undefined;
  const emitRuntimeEvent = (event: 'click' | 'change', value?: string): void => {
    if (!runtimeEvent) return;
    if (itemContext) runtimeEvent(node.id, event, value, { listItem: itemContext });
    else runtimeEvent(node.id, event, value);
  };

  const frame = (children: React.ReactNode) => (
    <NodeFrame
      geometry={geometry}
      appearance={resolveThemeAppearance(node.appearance, appTheme?.theme === 'dark')}
      interactive={interactive}
      selected={isSelected}
      onSelect={onSelect}
      onNodeAction={runtimeClick}
      onNodeEvent={runtimeEvent}
      eventContext={itemContext ? { listItem: itemContext } : undefined}
    >
      {children}
    </NodeFrame>
  );

  switch (node.type) {
    case 'button':
      return frame(<ButtonNodeView props={{
        ...node.props,
        label: resolveBoundText(node, 'button.label', itemContext, node.props.label),
      }} renderStatic={renderStatic} />);
    case 'text':
      return frame(<TextNodeView props={{
        ...node.props,
        text: resolveBoundText(node, 'text.content', itemContext, node.props.text),
      }} />);
    case 'input':
      return frame(
        <InputNodeView
          isPreview={mode === 'preview'}
          value={componentValues?.get(node.id)}
          onValueChange={(value) => {
            onNodeValueChange?.(node.id, value);
            emitRuntimeEvent('change', value);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'image':
      return frame(<ImageNodeView props={{
        ...node.props,
        src: resolveBoundText(node, 'image.source', itemContext, node.props.src),
        alt: resolveBoundText(node, 'image.alt', itemContext, node.props.alt),
      }} />);
    case 'checkbox':
      return frame(
        <CheckboxNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); emitRuntimeEvent('change', value); }}
          props={{ ...node.props, checked: resolveBoundBoolean(node, 'checkbox.checked', itemContext, node.props.checked) }}
          renderStatic={renderStatic}
        />,
      );
    case 'radio':
      return frame(
        <RadioNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); emitRuntimeEvent('change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'switch':
      return frame(
        <SwitchNodeView
          isPreview={mode === 'preview'}
          checked={node.props.controlsTheme && appTheme ? appTheme.theme === 'dark' : undefined}
          onValueChange={(value) => {
            if (node.props.controlsTheme && appTheme) appTheme.setTheme(value === 'true' ? 'dark' : 'light');
            onNodeValueChange?.(node.id, value);
            emitRuntimeEvent('change', value);
          }}
          props={{ ...node.props, checked: resolveBoundBoolean(node, 'switch.checked', itemContext, node.props.checked) }}
          renderStatic={renderStatic}
        />,
      );
    case 'dropdown':
      return frame(
        <DropdownNodeView
          isPreview={mode === 'preview'}
          itemLabel={itemContext ? String(itemContext.values.value ?? '') : undefined}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); emitRuntimeEvent('change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'slider':
      return frame(
        <SliderNodeView
          isPreview={mode === 'preview'}
          onValueChange={(value) => { onNodeValueChange?.(node.id, value); emitRuntimeEvent('change', value); }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'progress':
      return frame(<ProgressNodeView props={{
        ...node.props,
        value: resolveBoundNumber(node, 'progress.value', itemContext, node.props.value),
      }} />);
    case 'divider':
      return frame(<DividerNodeView props={node.props} renderStatic={renderStatic} />);
    case 'camera':
      return frame(
        <CameraNodeView
          isPreview={mode === 'preview'}
          onCapture={(mediaReference) => {
            onNodeValueChange?.(node.id, mediaReference);
            emitRuntimeEvent('change', mediaReference);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'container':
    case 'column':
    case 'row': {
      const childGeometries = childGeometriesAtBreakpoint(node, breakpoint, geometry);
      const children = node.children.map((child) => (
        <ComponentRenderer
          key={child.id}
          componentValues={componentValues}
          breakpoint={breakpoint}
          dataContext={dataContext}
          geometryOverride={childGeometries.get(child.id)}
          itemContext={itemContext}
          mode={mode}
          node={child}
          onSelect={onSelect}
          onNodeAction={runtimeClick}
          onNodeEvent={runtimeEvent}
          onNodeValueChange={onNodeValueChange}
          selected={false}
          selectedNodeId={selectedNodeId}
        />
      ));
      return frame(
        node.type === 'container'
          ? <ContainerNodeView>{children}</ContainerNodeView>
          : <LinearLayoutNodeView direction={node.type}>{children}</LinearLayoutNodeView>,
      );
    }
    case 'listview': {
      const childGeometries = childGeometriesAtBreakpoint(node, breakpoint, geometry);
      const itemExtent = listViewItemExtent(node, childGeometries, breakpoint);
      return frame(
        <ListViewNodeView
          componentValues={componentValues}
          crossExtent={node.props.scrollDirection === 'vertical' ? geometry.w : geometry.h}
          dataContext={dataContext}
          itemExtent={itemExtent}
          viewportExtent={node.props.scrollDirection === 'vertical' ? geometry.h : geometry.w}
          mode={mode}
          nodeId={node.id}
          onItemSelect={(record) => runtimeEvent?.(node.id, 'click', record.itemId, { listItem: record })}
          props={node.props}
          renderItem={(record) => node.children.map((child) => (
            <ComponentRenderer
              key={child.id}
              breakpoint={breakpoint}
              componentValues={componentValues}
              dataContext={dataContext}
              geometryOverride={childGeometries.get(child.id)}
              itemContext={record}
              mode={mode}
              node={child}
              onNodeAction={runtimeClick}
              onNodeEvent={runtimeEvent}
              onNodeValueChange={onNodeValueChange}
              onSelect={onSelect}
              selected={false}
              selectedNodeId={selectedNodeId}
            />
          ))}
          runtimeValue={componentValues?.get(node.id)}
          templateHasChildren={node.children.length > 0}
        />,
      );
    }
    default:
      return null;
  }
}

function resolveThemeAppearance(appearance: ComponentAppearance | undefined, dark: boolean): ComponentAppearance | undefined {
  if (!appearance) return undefined;
  const { dark: darkColors, ...base } = appearance;
  const resolved = dark && darkColors ? { ...base, ...darkColors } : base;
  return Object.keys(resolved).length > 0 ? resolved : undefined;
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

