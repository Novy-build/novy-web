import type { Screen } from '@domain/entities/screen';
import type { ResponsiveBreakpoint } from '@domain/entities/componentNode';
import type { RendererMode } from './renderer';
import type { RendererDataContext } from './renderer';
import type { TriggerEvent } from '@domain/entities/logic';
import { ComponentRenderer } from './ComponentRenderer';

/** Design-space dimensions rendered by ScreenFrame (MVP presets). */
export interface ScreenFrameSize {
  width: number;
  height: number;
}

export const CANVAS_PRESETS: Readonly<Record<'mobile' | 'tablet' | 'desktop', ScreenFrameSize>> = {
  mobile: { width: 390, height: 780 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 },
};

export interface ScreenFrameProps {
  screen: Screen | null;
  mode: RendererMode;
  size?: ScreenFrameSize;
  /** Explicit responsive breakpoint; inferred from size when omitted. */
  breakpoint?: ResponsiveBreakpoint;
  /** CSS scale (thumbnails render the same tree, just smaller). */
  scale?: number;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  /** Reactive preview: forwards runtime clicks on non-canvas nodes. */
  onNodeAction?: (nodeId: string) => void;
  onNodeEvent?: (nodeId: string, event: TriggerEvent, value?: string) => void;
  onNodeValueChange?: (nodeId: string, value: string) => void;
  dataContext?: RendererDataContext;
  componentValues?: ReadonlyMap<string, string>;
  onFormSubmit?: (nodeId: string, values: string[]) => void;
}

/**
 * Renders one screen of the built app inside its device frame. Thumbnails
 * (dashboard cards) and the preview overlay reuse this component, so the
 * same tree drives the canvas, the cards, and what gets published.
 */
export function ScreenFrame({
  screen,
  mode,
  size = CANVAS_PRESETS.mobile,
  breakpoint,
  scale = 1,
  selectedNodeId = null,
  onSelectNode,
  onNodeAction,
  onNodeEvent,
  onNodeValueChange,
  componentValues,
  dataContext,
  onFormSubmit,
}: ScreenFrameProps) {
  const outerWidth = Math.round(size.width * scale);
  const outerHeight = Math.round(size.height * scale);
  const resolvedBreakpoint = breakpoint ?? (size.width >= CANVAS_PRESETS.desktop.width
    ? 'desktop'
    : size.width >= CANVAS_PRESETS.tablet.width
      ? 'tablet'
      : 'mobile');

  return (
    <div
      className="overflow-hidden"
      data-screen-id={screen?.id ?? ''}
      style={{ height: outerHeight, width: outerWidth }}
    >
      <div
        className="relative overflow-hidden bg-surface"
        style={{
          height: size.height,
          width: size.width,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {screen?.nodes.map((node) => (
          <ComponentRenderer
            key={node.id}
            breakpoint={resolvedBreakpoint}
            componentValues={componentValues}
            mode={mode}
            node={node}
            onNodeAction={onNodeAction}
            onNodeEvent={onNodeEvent}
            onNodeValueChange={onNodeValueChange}
            dataContext={dataContext}
            onFormSubmit={onFormSubmit}
            onSelect={onSelectNode}
            selected={selectedNodeId === node.id}
            selectedNodeId={selectedNodeId}
          />
        ))}
      </div>
    </div>
  );
}
