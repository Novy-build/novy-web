import type { Template } from '@domain/entities/template';
import type { SectionPresetId } from '@domain/sections/sectionTypes';
import { buildSectionPreset } from '@domain/sections/sectionPresets';
import { normalizeWebsiteScreen } from '@domain/sections/sectionLayout';

function websiteTemplate(
  id: string,
  name: string,
  description: string,
  sections: readonly SectionPresetId[],
): Template {
  return {
    id,
    name,
    description,
    projectType: 'website',
    screens: [normalizeWebsiteScreen({
      id: `${id}_home`,
      name: 'Home',
      path: '/',
      nodes: sections.map(buildSectionPreset),
      behaviors: [],
      logicGraphs: [],
    })],
  };
}

export const WEBSITE_TEMPLATES: readonly Template[] = [
  websiteTemplate(
    'template_site_blank',
    'Blank canvas',
    'Start with an empty website page and add your own sections and widgets.',
    [],
  ),
  websiteTemplate(
    'template_site_landing',
    'Landing page',
    'A complete product page with proof, pricing, and a focused call to action.',
    ['hero', 'logos', 'features', 'pricing', 'cta', 'footer'],
  ),
  websiteTemplate(
    'template_site_portfolio',
    'Portfolio',
    'Introduce your work, explain your strengths, and add a client testimonial.',
    ['hero', 'features', 'testimonials', 'cta', 'footer'],
  ),
  websiteTemplate(
    'template_site_agency',
    'Agency',
    'A service-business site with capabilities, proof points, social proof, and contact CTA.',
    ['hero', 'features', 'stats', 'testimonials', 'cta', 'footer'],
  ),
  websiteTemplate(
    'template_site_coming_soon',
    'Coming soon',
    'A concise launch page with a strong introduction, credibility, and signup call to action.',
    ['hero', 'logos', 'cta', 'footer'],
  ),
];
