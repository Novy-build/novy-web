import {
  geometryAtBreakpoint,
  isHiddenAtBreakpoint,
  type ComponentNode,
  type ResponsiveBreakpoint,
} from '../entities/componentNode';
import type { Screen } from '../entities/screen';
import { measureSectionHeight } from './sectionLayout';
import { websiteSections } from './sectionTree';

/**
 * Reports website sections whose authored height is smaller than the height
 * their visible content needs at a breakpoint.
 *
 * `docs/website-projects-plan.md` §7.3 requires that section content is never
 * silently clipped: when auto-height measurement is bypassed — for example a
 * fixed-height section imported from an older project — the Inspector should
 * surface a "section content is taller than the section" warning instead. This
 * pure helper provides the detection half of that fallback. It does not mutate
 * the document, render UI, or change any editor behaviour.
 */
export interface SectionContentOverflow {
  sectionId: string;
  sectionName: string;
  breakpoint: ResponsiveBreakpoint;
  authoredHeight: number;
  requiredHeight: number;
}

export function findSectionContentOverflows(
  screen: Screen,
  breakpoint: ResponsiveBreakpoint,
): SectionContentOverflow[] {
  return websiteSections(screen.nodes)
    .filter((section) => !isHiddenAtBreakpoint(section, breakpoint))
    .map((section: ComponentNode) => {
      const authoredHeight = geometryAtBreakpoint(section, breakpoint).h;
      const requiredHeight = measureSectionHeight(section, breakpoint);
      return { section, authoredHeight, requiredHeight };
    })
    .filter(({ authoredHeight, requiredHeight }) => requiredHeight > authoredHeight)
    .map(({ section, authoredHeight, requiredHeight }) => ({
      sectionId: section.id,
      sectionName: section.name ?? section.id,
      breakpoint,
      authoredHeight,
      requiredHeight,
    }));
}
