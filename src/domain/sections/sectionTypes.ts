import type { ComponentNode } from '../entities/componentNode';

export type SectionPresetId =
  | 'hero'
  | 'features'
  | 'logos'
  | 'stats'
  | 'testimonials'
  | 'pricing'
  | 'cta'
  | 'footer';

export interface SectionPreset {
  id: SectionPresetId;
  name: string;
  description: string;
  build: () => ComponentNode;
}
