import type { ComponentAppearance, ComponentNode } from '@domain/entities/componentNode';
import { childGeometriesAtBreakpoint, geometryAtBreakpoint, isHiddenAtBreakpoint, listViewItemExtent } from '@domain/entities/componentNode';
import { resolveBoundBoolean, resolveBoundNumber, resolveBoundText } from '@domain/bindings/componentBindings';
import { useAppTheme } from './AppThemeContext';
import { type CSSProperties, type PropsWithChildren } from 'react';
import type { ComponentRendererProps, RendererEventContext } from './renderer';
import { ButtonNodeView } from './nodes/ButtonNodeView';
import { CameraNodeView } from './nodes/CameraNodeView';
import { ChartNodeView } from './nodes/ChartNodeView';
import { ChatNodeView } from './nodes/ChatNodeView';
import { CheckboxNodeView } from './nodes/CheckboxNodeView';
import { ContainerNodeView } from './nodes/ContainerNodeView';
import { DividerNodeView } from './nodes/DividerNodeView';
import { DropdownNodeView } from './nodes/DropdownNodeView';
import { FileInputNodeView } from './nodes/FileInputNodeView';
import { ImageNodeView } from './nodes/ImageNodeView';
import { InputNodeView } from './nodes/InputNodeView';
import { LinearLayoutNodeView } from './nodes/LinearLayoutNodeView';
import { ListViewNodeView } from './nodes/ListViewNodeView';
import { ProgressNodeView } from './nodes/ProgressNodeView';
import { RadioNodeView } from './nodes/RadioNodeView';
import { SliderNodeView } from './nodes/SliderNodeView';
import { SwitchNodeView } from './nodes/SwitchNodeView';
import { TextNodeView } from './nodes/TextNodeView';
import { GestureDetectorNodeView } from './nodes/GestureDetectorNodeView';
import { IconNodeView } from './nodes/IconNodeView';
import { designSystemCssVariables, findNamedStyle } from '@domain/entities/designSystem';
import { resolveContentSize } from './contentSizing';

interface NodeFrameProps {
  geometry: Pick<ComponentNode, 'id' | 'x' | 'y' | 'w' | 'h'>;
  nodeType: ComponentNode['type'];
  interactive: boolean;
  selected: boolean;
  onSelect?: (nodeId: string) => void;
  /** Runtime hook for published behavior (preview overlay executes chains). */
  onNodeAction?: (nodeId: string) => void;
  onNodeEvent?: (nodeId: string, event: 'click' | 'change', value?: string, context?: RendererEventContext) => void;
  eventContext?: RendererEventContext;
  appearance?: ComponentAppearance;
  textColor?: string;
  semanticLabel?: string;
  stopClickPropagation?: boolean;
}

/**
 * Absolute positioning wrapper shared by every rendered node. In canvas mode
 * it also owns hit-testing: the selection click reaches the deepest node
 * first (inner frames stop propagation).
 */
function NodeFrame({ geometry, nodeType, interactive, selected, onSelect, onNodeAction, onNodeEvent, eventContext, appearance, textColor, semanticLabel, stopClickPropagation = false, children }: PropsWithChildren<NodeFrameProps>) {
  const contentSize = resolveContentSize(geometry.w, geometry.h);
  const selectionClass = interactive && selected ? ' ring-2 ring-brand-600' : '';
  const appearanceClass = appearance
    ? ` novy-node-appearance${appearance.backgroundColor || appearance.gradient ? ' novy-node-background' : ''}${appearance.borderRadius !== undefined ? ' novy-node-radius' : ''}`
    : '';
  const runClick = (): void => {
    if (onNodeEvent && eventContext) onNodeEvent(geometry.id, 'click', undefined, eventContext);
    else if (onNodeEvent) onNodeEvent(geometry.id, 'click');
    else onNodeAction?.(geometry.id);
  };
  return (
    <div
      aria-label={semanticLabel}
      className={`novy-node absolute${appearanceClass}${selectionClass}`}
      data-content-size={contentSize.tier}
      data-node-type={nodeType}
      data-node-id={geometry.id}
      data-selected={selected ? 'true' : 'false'}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect?.(geometry.id);
            }
          : onNodeEvent || onNodeAction
            ? (event) => {
                if (stopClickPropagation) event.stopPropagation();
                runClick();
              }
            : undefined
      }
      onKeyDown={semanticLabel && (onNodeEvent || onNodeAction) ? (event) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        if (stopClickPropagation) event.stopPropagation();
        runClick();
      } : undefined}
      role={semanticLabel && (onNodeEvent || onNodeAction) ? 'button' : undefined}
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.w,
        height: geometry.h,
        ...appearanceStyle(appearance),
        ...(textColor ? { '--novy-component-text': textColor } as CSSProperties : {}),
      }}
      tabIndex={semanticLabel && (onNodeEvent || onNodeAction) ? 0 : undefined}
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
  onNodeMediaChange,
  componentValues,
  dataContext,
  designSystem,
  geometryOverride,
  itemContext,
  interactiveNodeIds,
}: ComponentRendererProps) {
  const appTheme = useAppTheme();
  if (isHiddenAtBreakpoint(node, breakpoint) || !resolveBoundBoolean(node, 'component.visible', itemContext, true)) {
    return null;
  }
  const interactive = mode === 'canvas' && !node.isLocked;
  const geometry = { id: node.id, ...(geometryOverride ?? geometryAtBreakpoint(node, breakpoint)) };
  const isSelected = selected || selectedNodeId === node.id;
  const renderStatic = mode === 'thumbnail';
  const namedStyle = findNamedStyle(designSystem, node.styleId);
  const responsiveAppearance = appearanceAtBreakpoint(node, breakpoint);
  const resolvedAppearance = resolveThemeAppearance(
    mergeAppearances(namedStyle?.appearance, node.appearance, responsiveAppearance),
    appTheme?.theme === 'dark',
  );
  // Runtime clicks only exist in the reactive preview; canvas delegates to
  // selection and thumbnails stay inert dashboard tiles.
  const runtimeClick = mode === 'preview' && onNodeAction ? onNodeAction : undefined;
  const runtimeEvent = mode === 'preview' ? onNodeEvent : undefined;
  const handlesRuntimeClick = mode === 'preview' &&
    (interactiveNodeIds === undefined || interactiveNodeIds.has(node.id));
  const emitRuntimeEvent = (event: 'click' | 'change', value?: string): void => {
    if (!runtimeEvent) return;
    if (itemContext) runtimeEvent(node.id, event, value, { listItem: itemContext });
    else runtimeEvent(node.id, event, value);
  };

  const frame = (children: React.ReactNode) => (
    <NodeFrame
      geometry={geometry}
      nodeType={node.type}
      appearance={node.type === 'input' ? undefined : resolvedAppearance}
      textColor={resolvedAppearance?.textColor}
      interactive={interactive}
      selected={isSelected}
      onSelect={onSelect}
      onNodeAction={handlesRuntimeClick ? runtimeClick : undefined}
      onNodeEvent={handlesRuntimeClick ? runtimeEvent : undefined}
      eventContext={itemContext ? { listItem: itemContext } : undefined}
      semanticLabel={node.type === 'gesture-detector' ? node.props.semanticLabel : undefined}
      stopClickPropagation={interactiveNodeIds !== undefined}
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
        ...(namedStyle?.textStyle ?? {}),
        ...node.props,
        ...(textStyleAtBreakpoint(node, breakpoint) ?? {}),
        text: resolveBoundText(node, 'text.content', itemContext, node.props.text),
      }} />);
    case 'icon':
      return frame(<IconNodeView props={node.props} size={Math.min(geometry.w, geometry.h)} />);
    case 'input':
      return frame(
        <InputNodeView
          appearance={resolvedAppearance}
          isPreview={mode === 'preview'}
          value={componentValues?.get(node.id) ?? resolveBoundText(node, 'input.value', itemContext, '')}
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
          appearance={resolvedAppearance}
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
          appearance={resolvedAppearance}
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
          appearance={resolvedAppearance}
          menuStyle={{
            ...designSystemCssVariables(designSystem, appTheme?.theme === 'dark'),
            ...(resolvedAppearance?.textColor ? { '--novy-component-text': resolvedAppearance.textColor } : {}),
          } as CSSProperties}
          isPreview={mode === 'preview'}
          itemLabel={itemContext ? String(itemContext.values.value ?? '') : undefined}
          value={componentValues?.get(node.id) ?? (
            node.bindings?.some((binding) => binding.target === 'dropdown.value')
              ? resolveBoundText(node, 'dropdown.value', itemContext, '')
              : undefined
          )}
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
          onCapture={(mediaReference, media) => {
            onNodeMediaChange?.(node.id, media);
            onNodeValueChange?.(node.id, mediaReference);
            emitRuntimeEvent('change', mediaReference);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'file-input':
      return frame(
        <FileInputNodeView
          isPreview={mode === 'preview'}
          onSelect={(mediaReference, file) => {
            onNodeMediaChange?.(node.id, file);
            onNodeValueChange?.(node.id, mediaReference);
            emitRuntimeEvent('change', mediaReference);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'chat':
      return frame(
        <ChatNodeView
          appearance={resolvedAppearance}
          isPreview={mode === 'preview'}
          isThinking={dataContext?.pendingChatNodeIds?.has(node.id) ?? false}
          messages={dataContext?.localItemsByListView?.get(node.id) ?? []}
          onSubmit={(value) => {
            onNodeValueChange?.(node.id, value);
            emitRuntimeEvent('change', value);
          }}
          props={node.props}
          renderStatic={renderStatic}
        />,
      );
    case 'chart':
      return frame(<ChartNodeView dataSource={dataContext?.chartDataByNode?.get(node.id)} height={geometry.h} props={node.props} width={geometry.w} />);
    case 'container':
    case 'gesture-detector':
    case 'column':
    case 'row': {
      const childGeometries = childGeometriesAtBreakpoint(node, breakpoint, geometry);
      const children = node.children.map((child) => (
        <ComponentRenderer
          key={child.id}
          componentValues={componentValues}
          breakpoint={breakpoint}
          dataContext={dataContext}
          designSystem={designSystem}
          geometryOverride={childGeometries.get(child.id)}
          itemContext={itemContext}
          interactiveNodeIds={interactiveNodeIds}
          mode={mode}
          node={child}
          onSelect={onSelect}
          onNodeAction={runtimeClick}
          onNodeEvent={runtimeEvent}
          onNodeValueChange={onNodeValueChange}
          onNodeMediaChange={onNodeMediaChange}
          selected={false}
          selectedNodeId={selectedNodeId}
        />
      ));
      return frame(
        node.type === 'container'
          ? <ContainerNodeView borderStyle={node.appearance?.borderStyle}>{children}</ContainerNodeView>
          : node.type === 'gesture-detector'
            ? <GestureDetectorNodeView isCanvas={mode === 'canvas'}>{children}</GestureDetectorNodeView>
            : <LinearLayoutNodeView borderStyle={node.appearance?.borderStyle} direction={node.type}>{children}</LinearLayoutNodeView>,
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
          onItemSelect={handlesRuntimeClick ? (record) => runtimeEvent?.(node.id, 'click', record.itemId, { listItem: record }) : undefined}
          props={node.props}
          renderItem={(record) => node.children.map((child) => (
            <ComponentRenderer
              key={child.id}
              breakpoint={breakpoint}
              componentValues={componentValues}
              dataContext={dataContext}
              designSystem={designSystem}
              geometryOverride={childGeometries.get(child.id)}
              itemContext={record}
              interactiveNodeIds={interactiveNodeIds}
              mode={mode}
              node={child}
              onNodeAction={runtimeClick}
              onNodeEvent={runtimeEvent}
              onNodeValueChange={onNodeValueChange}
              onNodeMediaChange={onNodeMediaChange}
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
  const borderStyle = appearance.borderStyle === 'none'
    ? 'none'
    : appearance.borderStyle ?? (appearance.borderColor ? 'solid' : undefined);
  const hasVisibleBorder = borderStyle === 'solid' || borderStyle === 'dashed';
  return {
    backgroundColor: appearance.gradient ? undefined : appearance.backgroundColor || undefined,
    backgroundImage: appearance.gradient ? linearGradientCss(appearance.gradient) : undefined,
    color: appearance.textColor || undefined,
    borderColor: hasVisibleBorder ? appearance.borderColor || 'var(--color-hairline)' : undefined,
    borderStyle,
    borderWidth: hasVisibleBorder ? appearance.borderWidth ?? 1 : appearance.borderStyle === 'none' ? 0 : undefined,
    borderRadius: appearance.borderRadius,
    opacity: appearance.opacity,
    boxShadow: appearance.boxShadows?.map((shadow) => `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`).join(', ') || undefined,
    backdropFilter: appearance.backdropBlur ? `blur(${appearance.backdropBlur}px)` : undefined,
    overflow: appearance.clipContent === false ? 'visible' : appearance.clipContent || appearance.borderRadius ? 'hidden' : undefined,
  };
}

function mergeAppearances(
  ...values: Array<ComponentAppearance | undefined>
): ComponentAppearance | undefined {
  const present = values.filter((value): value is ComponentAppearance => Boolean(value));
  if (present.length === 0) return undefined;
  return present.reduce<ComponentAppearance>((merged, value) => ({
    ...merged,
    ...value,
    dark: merged.dark || value.dark ? { ...merged.dark, ...value.dark } : undefined,
  }), {});
}

function appearanceAtBreakpoint(node: ComponentNode, breakpoint: 'mobile' | 'tablet' | 'desktop'): ComponentAppearance | undefined {
  if (breakpoint === 'mobile') return undefined;
  const tablet = node.responsive?.tablet?.appearance;
  if (breakpoint === 'tablet') return tablet;
  return mergeAppearances(tablet, node.responsive?.desktop?.appearance);
}

function textStyleAtBreakpoint(node: ComponentNode, breakpoint: 'mobile' | 'tablet' | 'desktop') {
  if (node.type !== 'text' || breakpoint === 'mobile') return undefined;
  const tablet = node.responsive?.tablet?.textStyle;
  return breakpoint === 'tablet' ? tablet : { ...tablet, ...node.responsive?.desktop?.textStyle };
}

function linearGradientCss(gradient: NonNullable<ComponentAppearance['gradient']>): string {
  const stops = gradient.stops
    .map((stop) => `${stop.color} ${Math.max(0, Math.min(100, stop.position))}%`)
    .join(', ');
  return `linear-gradient(${gradient.angle}deg, ${stops})`;
}

