import { createPadding, type ColumnNode } from '../entities/componentNode';
import { generateId } from '../ids';

export const BLANK_SECTION_HEIGHT = 360;

/** Creates one empty, full-width website canvas section. */
export function createBlankWebsiteSection(name: string): ColumnNode {
  return {
    id: generateId('node'),
    name,
    type: 'column',
    x: 0,
    y: 0,
    w: 390,
    h: BLANK_SECTION_HEIGHT,
    responsive: {
      tablet: { x: 0, w: 768, h: BLANK_SECTION_HEIGHT },
      desktop: { x: 0, w: 1200, h: BLANK_SECTION_HEIGHT },
    },
    appearance: {
      backgroundColor: '#ffffff',
      borderStyle: 'none',
      dark: {
        backgroundColor: '#15181e',
        textColor: '#eef0f4',
        borderColor: '#262a33',
      },
    },
    props: {
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      gap: 16,
      padding: createPadding(24),
    },
    children: [],
  };
}
