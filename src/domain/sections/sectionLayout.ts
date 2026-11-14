import {
  geometryAtBreakpoint,
  isChildBearingNode,
  isHiddenAtBreakpoint,
  resolveEdgeInsets,
  type ComponentNode,
  type ComponentAppearance,
  type NodeGeometry,
  type ResponsiveBreakpoint,
} from '../entities/componentNode';
import type { Screen } from '../entities/screen';

export const WEBSITE_PAGE_WIDTHS: Readonly<Record<ResponsiveBreakpoint, number>> = {
  mobile: 390,
  tablet: 768,
  desktop: 1200,
};

export const WEBSITE_MIN_HEIGHTS: Readonly<Record<ResponsiveBreakpoint, number>> = {
  mobile: 780,
  tablet: 1024,
  desktop: 800,
};

const MIN_SECTION_HEIGHT = 96;
const TEXT_LINE_HEIGHT = 1.25;

function inferredSectionDarkAppearance(
  appearance: ComponentAppearance | undefined,
): NonNullable<ComponentAppearance['dark']> {
  const background = appearance?.backgroundColor?.toLowerCase();
  const backgroundColor = background === '#eef0ff'
    ? '#1e1b4b'
    : background === '#5551f2'
      ? '#4338ca'
      : background === '#fafbfc'
        ? '#1a1e25'
        : '#15181e';
  return {
    backgroundColor,
    textColor: '#eef0f4',
    borderColor: background === '#eef0ff' ? '#312e81' : '#262a33',
    ...appearance?.dark,
  };
}

/** Adds safe dark colors to saved website sections created before dark variants existed. */
export function ensureWebsiteSectionDarkAppearances(screen: Screen): Screen {
  return {
    ...screen,
    nodes: screen.nodes.map((node) => node.type === 'column'
      ? {
          ...node,
          appearance: {
            ...node.appearance,
            dark: inferredSectionDarkAppearance(node.appearance),
          },
        }
      : node),
  };
}

function applyGeometry(
  node: ComponentNode,
  breakpoint: ResponsiveBreakpoint,
  geometry: Partial<NodeGeometry>,
): ComponentNode {
  if (breakpoint === 'mobile') return { ...node, ...geometry } as ComponentNode;
  return {
    ...node,
    responsive: {
      ...node.responsive,
      [breakpoint]: { ...node.responsive?.[breakpoint], ...geometry },
    },
  } as ComponentNode;
}

function estimateTextHeight(node: Extract<ComponentNode, { type: 'text' }>, width: number): number {
  const fontSize = node.props.fontSize ?? (node.props.level === 'display' ? 26 : node.props.level === 'title' ? 18 : 14);
  const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.56)));
  const lines = node.props.text.split('\n').reduce(
    (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0,
  );
  return Math.max(geometryAtBreakpoint(node, 'mobile').h, Math.ceil(lines * fontSize * TEXT_LINE_HEIGHT));
}

function normalizeNodeAtBreakpoint(
  node: ComponentNode,
  breakpoint: ResponsiveBreakpoint,
  availableWidth: number,
): ComponentNode {
  if (node.type === 'text') {
    return applyGeometry(node, breakpoint, { h: estimateTextHeight(node, availableWidth) });
  }
  if (!isChildBearingNode(node) || node.type === 'container' || node.type === 'gesture-detector' || node.type === 'listview') {
    return node;
  }

  const padding = resolveEdgeInsets(node.props.padding);
  const contentWidth = Math.max(24, availableWidth - padding.left - padding.right);
  const children = node.children.map((child) => {
    const childGeometry = geometryAtBreakpoint(child, breakpoint);
    const childWidth = node.type === 'column' && node.props.crossAxisAlignment === 'stretch'
      ? contentWidth
      : Math.min(contentWidth, childGeometry.w);
    return normalizeNodeAtBreakpoint(child, breakpoint, childWidth);
  });

  const visible = children.filter((child) => !isHiddenAtBreakpoint(child, breakpoint));
  const contentHeight = node.type === 'column'
    ? visible.reduce((sum, child) => sum + geometryAtBreakpoint(child, breakpoint).h, 0)
      + Math.max(0, visible.length - 1) * Math.max(0, node.props.gap)
    : Math.max(0, ...visible.map((child) => geometryAtBreakpoint(child, breakpoint).h));
  const height = Math.max(MIN_SECTION_HEIGHT, padding.top + contentHeight + padding.bottom);
  const withChildren = { ...node, children } as ComponentNode;
  return applyGeometry(withChildren, breakpoint, { h: height });
}

function normalizeSection(node: ComponentNode): ComponentNode {
  // A manually added blank section is an authored empty canvas. Preserve its
  // explicit height until the builder resizes it or adds content.
  if (node.type === 'column' && node.children.length === 0) return node;
  let normalized = node;
  for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
    normalized = normalizeNodeAtBreakpoint(
      normalized,
      breakpoint,
      WEBSITE_PAGE_WIDTHS[breakpoint],
    );
  }
  return normalized;
}

export function measureSectionHeight(
  section: ComponentNode,
  breakpoint: ResponsiveBreakpoint,
): number {
  return geometryAtBreakpoint(normalizeSection(section), breakpoint).h;
}

export function nextSectionOffset(
  sections: readonly ComponentNode[],
  breakpoint: ResponsiveBreakpoint,
): number {
  return sections.reduce((bottom, section) => {
    const geometry = geometryAtBreakpoint(section, breakpoint);
    return Math.max(bottom, geometry.y + geometry.h);
  }, 0);
}

/**
 * Website pages treat every root-level Column as a section. They are measured
 * and stacked for all three responsive breakpoints in one deterministic pass.
 */
export function normalizeWebsiteScreen(screen: Screen): Screen {
  const themedScreen = ensureWebsiteSectionDarkAppearances(screen);
  const cursors: Record<ResponsiveBreakpoint, number> = { mobile: 0, tablet: 0, desktop: 0 };
  const nodes = themedScreen.nodes.map((node) => {
    if (node.type !== 'column') return node;
    let normalized = normalizeSection(node);
    for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
      const geometry = geometryAtBreakpoint(normalized, breakpoint);
      normalized = applyGeometry(normalized, breakpoint, {
        x: 0,
        y: cursors[breakpoint],
        w: WEBSITE_PAGE_WIDTHS[breakpoint],
        h: geometry.h,
      });
      cursors[breakpoint] += geometry.h;
    }
    return normalized;
  });
  return { ...themedScreen, nodes };
}

export function websitePageHeight(
  screen: Screen | null,
  breakpoint: ResponsiveBreakpoint,
): number {
  if (!screen) return WEBSITE_MIN_HEIGHTS[breakpoint];
  return Math.max(
    WEBSITE_MIN_HEIGHTS[breakpoint],
    ...screen.nodes.map((node) => {
      const geometry = geometryAtBreakpoint(node, breakpoint);
      return geometry.y + geometry.h;
    }),
  );
}
