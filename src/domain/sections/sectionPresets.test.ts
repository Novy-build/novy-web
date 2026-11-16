import { describe, expect, it } from 'vitest';
import { geometryAtBreakpoint, isChildBearingNode, type ComponentNode } from '../entities/componentNode';
import { WEBSITE_PAGE_WIDTHS } from './sectionLayout';
import { SECTION_PRESETS, buildSectionPreset } from './sectionPresets';
import type { SectionPresetId } from './sectionTypes';

const PRESET_IDS: readonly SectionPresetId[] = [
  'hero',
  'features',
  'logos',
  'stats',
  'testimonials',
  'pricing',
  'cta',
  'footer',
];

function collectIds(node: ComponentNode): string[] {
  const children = isChildBearingNode(node) ? node.children : [];
  return [node.id, ...children.flatMap(collectIds)];
}

describe('section presets', () => {
  it('defines all eight presets with unique ids and descriptions', () => {
    expect(SECTION_PRESETS).toHaveLength(8);
    expect(SECTION_PRESETS.map((preset) => preset.id)).toEqual([...PRESET_IDS]);
    expect(new Set(SECTION_PRESETS.map((preset) => preset.id)).size).toBe(8);
    for (const preset of SECTION_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });

  it.each([...PRESET_IDS])('builds %s as a normalised named section with content', (id) => {
    const node = buildSectionPreset(id);

    expect(node.type).toBe('column');
    expect(node.name).toBeTruthy();
    if (node.type !== 'column') throw new Error('Expected a column section');
    expect(node.children.length).toBeGreaterThan(0);
    expect(node.appearance?.dark?.backgroundColor).toBeTruthy();
    expect(node.appearance?.dark?.textColor).toBeTruthy();

    for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
      const geometry = geometryAtBreakpoint(node, breakpoint);
      expect(geometry.x).toBe(0);
      expect(geometry.w).toBe(WEBSITE_PAGE_WIDTHS[breakpoint]);
      expect(geometry.h).toBeGreaterThan(0);
    }
  });

  it('gives every node in a preset tree a unique id', () => {
    for (const preset of SECTION_PRESETS) {
      const ids = collectIds(preset.build());
      expect(ids.length).toBeGreaterThan(1);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('builds a fresh tree on each call', () => {
    const first = buildSectionPreset('hero');
    const second = buildSectionPreset('hero');

    expect(first.id).not.toBe(second.id);
    expect(first.type).toBe(second.type);
    expect(first.name).toBe(second.name);
    expect(collectIds(first).length).toBe(collectIds(second).length);
  });

  it('keeps the registry build function equivalent to the direct builder', () => {
    for (const preset of SECTION_PRESETS) {
      const direct = buildSectionPreset(preset.id);
      const viaRegistry = preset.build();

      expect(viaRegistry.type).toBe(direct.type);
      expect(viaRegistry.name).toBe(direct.name);
      expect(collectIds(viaRegistry).length).toBe(collectIds(direct).length);
    }
  });
});
