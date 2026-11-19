import { useMemo, type CSSProperties } from 'react';
import type { Screen } from '@domain/entities/screen';
import type { ResponsiveBreakpoint } from '@domain/entities/componentNode';
import type { RendererDataContext, RendererEventContext, RendererMode } from './renderer';
import type { TriggerEvent } from '@domain/entities/logic';
import type { ListItemContext } from '@domain/entities/appData';
import { ComponentRenderer } from './ComponentRenderer';
import { AppThemeContext, type AppTheme, type AppThemePreference } from './AppThemeContext';
import { useDocumentAppTheme } from './useDocumentAppTheme';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import { designSystemCssVariables } from '@domain/entities/designSystem';
import type { ComponentAppearance } from '@domain/entities/componentNode';

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
  onNodeEvent?: (nodeId: string, event: TriggerEvent, value?: string, context?: RendererEventContext) => void;
  onNodeValueChange?: (nodeId: string, value: string) => void;
  onNodeMediaChange?: (nodeId: string, media: File | null) => void;
  dataContext?: RendererDataContext;
  componentValues?: ReadonlyMap<string, string>;
  itemContext?: ListItemContext;
  appTheme?: AppTheme;
  onAppThemeChange?: (theme: AppThemePreference) => void;
  designSystem?: AppDesignSystem;
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
  onNodeMediaChange,
  componentValues,
  dataContext,
  itemContext,
  appTheme,
  onAppThemeChange,
  designSystem,
}: ScreenFrameProps) {
  const outerWidth = Math.round(size.width * scale);
  const outerHeight = Math.round(size.height * scale);
  // Canvas and thumbnail frames follow the shell theme by default; Preview
  // provides an explicit app theme so it can be switched independently.
  const shellTheme = useDocumentAppTheme();
  const renderedTheme = appTheme ?? shellTheme;
  const themeController = useMemo(
    () => ({ theme: renderedTheme, setTheme: onAppThemeChange ?? (() => undefined) }),
    [onAppThemeChange, renderedTheme],
  );
  const resolvedBreakpoint = breakpoint ?? (size.width >= CANVAS_PRESETS.desktop.width
    ? 'desktop'
    : size.width >= CANVAS_PRESETS.tablet.width
      ? 'tablet'
      : 'mobile');
  const interactiveNodeIds = new Set(
    screen?.behaviors
      .filter((behavior) => behavior.event === 'click')
      .map((behavior) => behavior.targetNodeId) ?? [],
  );
  const screenAppearance = resolveScreenAppearance(screen?.appearance, renderedTheme === 'dark');
  const designVariables = designSystemCssVariables(designSystem, renderedTheme === 'dark') as CSSProperties;

  return (
    <div
      className="overflow-hidden"
      data-screen-id={screen?.id ?? ''}
      style={{ height: outerHeight, width: outerWidth }}
    >
      <AppThemeContext.Provider value={themeController}>
      <div
        className={`relative overflow-hidden bg-surface novy-app-theme-${renderedTheme}`}
        style={{
          height: size.height,
          width: size.width,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: 'top left',
          ...designVariables,
          ...screenAppearanceStyle(screenAppearance),
          fontFamily: 'var(--novy-app-font-body, var(--font-sans))',
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
            onNodeMediaChange={onNodeMediaChange}
            dataContext={dataContext}
            designSystem={designSystem}
            itemContext={itemContext}
            interactiveNodeIds={interactiveNodeIds}
            onSelect={onSelectNode}
            selected={selectedNodeId === node.id}
            selectedNodeId={selectedNodeId}
          />
        ))}
      </div>
      </AppThemeContext.Provider>
    </div>
  );
}

function resolveScreenAppearance(appearance: ComponentAppearance | undefined, dark: boolean): ComponentAppearance | undefined {
  if (!appearance) return undefined;
  const { dark: darkOverride, ...base } = appearance;
  return dark && darkOverride ? { ...base, ...darkOverride } : base;
}

function screenAppearanceStyle(appearance: ComponentAppearance | undefined): CSSProperties {
  if (!appearance) return { backgroundColor: 'var(--novy-app-canvas, var(--color-surface))' };
  return {
    backgroundColor: appearance.gradient ? undefined : appearance.backgroundColor || 'var(--novy-app-canvas, var(--color-surface))',
    backgroundImage: appearance.gradient
      ? `linear-gradient(${appearance.gradient.angle}deg, ${appearance.gradient.stops.map((stop) => `${stop.color} ${stop.position}%`).join(', ')})`
      : undefined,
  };
}
