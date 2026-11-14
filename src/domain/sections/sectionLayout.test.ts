import { describe, expect, it } from 'vitest';
import { geometryAtBreakpoint } from '../entities/componentNode';
import { buildSectionPreset, SECTION_PRESETS } from './sectionPresets';
import { measureSectionHeight, normalizeWebsiteScreen, websitePageHeight } from './sectionLayout';
import { moveWebsiteSection } from './sectionTree';
import { BLANK_SECTION_HEIGHT, createBlankWebsiteSection } from './blankSection';

describe('website section layout', () => {
  it('builds all eight presets as named root columns', () => {
    expect(SECTION_PRESETS).toHaveLength(8);
    for (const preset of SECTION_PRESETS) {
      const node = preset.build();
      expect(node.type).toBe('column');
      expect(node.name).toBeTruthy();
      expect(node.type === 'column' ? node.children.length : 0).toBeGreaterThan(0);
      expect(node.appearance?.dark?.backgroundColor).toBeTruthy();
      expect(node.appearance?.dark?.textColor).toBeTruthy();
    }
  });

  it('stacks sections without overlap at every breakpoint', () => {
    const screen = normalizeWebsiteScreen({
      id: 'home',
      name: 'Home',
      path: '/',
      nodes: [buildSectionPreset('hero'), buildSectionPreset('features'), buildSectionPreset('footer')],
      behaviors: [],
      logicGraphs: [],
    });

    for (const breakpoint of ['mobile', 'tablet', 'desktop'] as const) {
      const geometries = screen.nodes.map((node) => geometryAtBreakpoint(node, breakpoint));
      expect(geometries[0]?.y).toBe(0);
      expect(geometries[1]?.y).toBe(geometries[0]!.h);
      expect(geometries[2]?.y).toBe(geometries[0]!.h + geometries[1]!.h);
      expect(websitePageHeight(screen, breakpoint)).toBeGreaterThanOrEqual(
        geometries[2]!.y + geometries[2]!.h,
      );
    }
  });

  it('measures longer text without shrinking its section', () => {
    const short = buildSectionPreset('hero');
    const long = structuredClone(short);
    if (long.type === 'column' && long.children[0]?.type === 'text') {
      long.children[0].props.text = 'A much longer website headline '.repeat(20);
    }
    expect(measureSectionHeight(long, 'mobile')).toBeGreaterThanOrEqual(
      measureSectionHeight(short, 'mobile'),
    );
  });

  it('moves only root sections and respects boundaries', () => {
    const first = buildSectionPreset('hero');
    const second = buildSectionPreset('footer');
    expect(moveWebsiteSection([first, second], second.id, 'up').map((node) => node.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(moveWebsiteSection([first, second], first.id, 'up').map((node) => node.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it('keeps an empty canvas section at its authored height', () => {
    const blank = createBlankWebsiteSection('Section 1');
    const screen = normalizeWebsiteScreen({
      id: 'home',
      name: 'Home',
      path: '/',
      nodes: [blank],
      behaviors: [],
      logicGraphs: [],
    });

    expect(screen.nodes[0]?.type === 'column' ? screen.nodes[0].children : ['unexpected']).toEqual([]);
    expect(geometryAtBreakpoint(screen.nodes[0]!, 'mobile').h).toBe(BLANK_SECTION_HEIGHT);
    expect(geometryAtBreakpoint(screen.nodes[0]!, 'desktop').h).toBe(BLANK_SECTION_HEIGHT);
  });
});
