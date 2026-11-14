import {
  createPadding,
  type ButtonNode,
  type ColumnNode,
  type ComponentAppearance,
  type ComponentNode,
  type RowNode,
  type TextNode,
} from '../entities/componentNode';
import { generateId } from '../ids';
import { normalizeWebsiteScreen } from './sectionLayout';
import type { SectionPreset, SectionPresetId } from './sectionTypes';

const sectionAppearance: ComponentAppearance = {
  borderStyle: 'none',
  backgroundColor: '#ffffff',
  dark: {
    backgroundColor: '#15181e',
    textColor: '#eef0f4',
    borderColor: '#262a33',
  },
};

function text(textValue: string, level: TextNode['props']['level'], height: number, name?: string): TextNode {
  return {
    id: generateId('node'),
    name,
    type: 'text',
    x: 0,
    y: 0,
    w: 342,
    h: height,
    responsive: { tablet: { w: 640 }, desktop: { w: 960 } },
    props: { text: textValue, level },
  };
}

function button(label: string, variant: ButtonNode['props']['variant'] = 'solid'): ButtonNode {
  return {
    id: generateId('node'),
    type: 'button',
    x: 0,
    y: 0,
    w: 156,
    h: 48,
    props: { label, variant },
  };
}

function column(name: string, children: ComponentNode[], options?: { width?: number; gap?: number }): ColumnNode {
  return {
    id: generateId('node'),
    name,
    type: 'column',
    x: 0,
    y: 0,
    w: options?.width ?? 342,
    h: 160,
    appearance: { borderStyle: 'none' },
    props: {
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'stretch',
      gap: options?.gap ?? 12,
      padding: createPadding(0),
    },
    children,
  };
}

function row(name: string, children: ComponentNode[], height = 140): RowNode {
  return {
    id: generateId('node'),
    name,
    type: 'row',
    x: 0,
    y: 0,
    w: 342,
    h: height,
    responsive: { tablet: { w: 640 }, desktop: { w: 1072 } },
    appearance: { borderStyle: 'none' },
    props: {
      mainAxisAlignment: 'space-between',
      crossAxisAlignment: 'stretch',
      gap: 16,
      padding: createPadding(0),
    },
    children,
  };
}

function section(name: string, children: ComponentNode[], appearance?: ComponentAppearance): ColumnNode {
  const raw: ColumnNode = {
    id: generateId('node'),
    name,
    type: 'column',
    x: 0,
    y: 0,
    w: 390,
    h: 320,
    responsive: { tablet: { w: 768 }, desktop: { w: 1200 } },
    appearance: { ...sectionAppearance, ...appearance },
    props: {
      mainAxisAlignment: 'center',
      crossAxisAlignment: 'stretch',
      gap: 24,
      padding: createPadding(24),
    },
    children,
  };
  return normalizeWebsiteScreen({
    id: 'section-preview',
    name: 'Preview',
    path: '/',
    nodes: [raw],
    behaviors: [],
    logicGraphs: [],
  }).nodes[0] as ColumnNode;
}

function card(title: string, body: string): ColumnNode {
  return column(title, [text(title, 'title', 32), text(body, 'body', 64)], { width: 98, gap: 8 });
}

function buildPreset(id: SectionPresetId): ComponentNode {
  switch (id) {
    case 'hero':
      return section('Hero', [
        text('Build something people remember', 'display', 80, 'Headline'),
        text('A clear promise, a concise explanation, and one focused next step.', 'body', 56, 'Supporting copy'),
        row('Hero actions', [button('Get started'), button('Learn more', 'outline')], 48),
      ], {
        backgroundColor: '#eef0ff',
        dark: { backgroundColor: '#1e1b4b', textColor: '#eef0f4', borderColor: '#312e81' },
      });
    case 'features':
      return section('Features', [
        text('Everything you need to move faster', 'display', 72, 'Section heading'),
        row('Feature cards', [
          card('Fast by default', 'Start with a polished structure and make it your own.'),
          card('Built to adapt', 'Responsive layouts stay useful on every screen.'),
          card('Easy to publish', 'Preview confidently before sharing your work.'),
        ], 140),
      ]);
    case 'logos':
      return section('Logo strip', [
        text('Trusted by teams building the next useful thing', 'body', 32, 'Logo strip caption'),
        row('Customer logos', ['Northstar', 'Arc Labs', 'Kite', 'Morrow'].map((label) => text(label, 'title', 36)), 48),
      ], { backgroundColor: '#fafbfc' });
    case 'stats':
      return section('Stats', [
        row('Key statistics', [
          card('48h', 'Average time to launch'),
          card('3×', 'Faster iteration cycles'),
          card('99%', 'Happy collaborators'),
        ], 120),
      ], { backgroundColor: '#15181e', textColor: '#ffffff' });
    case 'testimonials':
      return section('Testimonials', [
        text('“We went from a rough idea to a page we were proud to share in one afternoon.”', 'title', 88, 'Customer quote'),
        text('Alex Morgan · Product lead at Northstar', 'body', 28, 'Attribution'),
      ], { backgroundColor: '#fafbfc' });
    case 'pricing':
      return section('Pricing', [
        text('Simple plans that grow with you', 'display', 72, 'Pricing heading'),
        row('Pricing plans', [
          column('Starter plan', [text('Starter', 'title', 32), text('$0 / month', 'body', 28), button('Start free', 'outline')], { width: 98 }),
          column('Pro plan', [text('Pro', 'title', 32), text('$29 / month', 'body', 28), button('Choose Pro')], { width: 98 }),
          column('Team plan', [text('Team', 'title', 32), text('$79 / month', 'body', 28), button('Contact us', 'outline')], { width: 98 }),
        ], 140),
      ]);
    case 'cta':
      return section('Call to action', [
        text('Ready to turn your idea into something real?', 'display', 72, 'CTA heading'),
        text('Start with a template, add the sections you need, and publish when it feels right.', 'body', 56, 'CTA copy'),
        button('Start building'),
      ], {
        backgroundColor: '#5551f2',
        textColor: '#ffffff',
        dark: { backgroundColor: '#4338ca', textColor: '#ffffff', borderColor: '#6366f1' },
      });
    case 'footer':
      return section('Footer', [
        row('Footer links', [
          column('Product links', [text('Product', 'title', 28), text('Features\nPricing\nUpdates', 'body', 72)], { width: 98 }),
          column('Company links', [text('Company', 'title', 28), text('About\nCareers\nContact', 'body', 72)], { width: 98 }),
          column('Legal links', [text('Legal', 'title', 28), text('Privacy\nTerms\nCookies', 'body', 72)], { width: 98 }),
        ], 112),
        {
          id: generateId('node'),
          type: 'divider',
          x: 0,
          y: 0,
          w: 342,
          h: 16,
          props: { orientation: 'horizontal', thickness: 1 },
        },
        text('© 2026 Your company. All rights reserved.', 'body', 28, 'Copyright'),
      ], { backgroundColor: '#15181e', textColor: '#ffffff' });
  }
}

const definitions: Array<Omit<SectionPreset, 'build'>> = [
  { id: 'hero', name: 'Hero', description: 'Lead with a promise and focused calls to action.' },
  { id: 'features', name: 'Features', description: 'Explain three important product benefits.' },
  { id: 'logos', name: 'Logo strip', description: 'Show a compact row of customer or partner names.' },
  { id: 'stats', name: 'Stats', description: 'Highlight three memorable proof points.' },
  { id: 'testimonials', name: 'Testimonials', description: 'Add customer proof with an attribution.' },
  { id: 'pricing', name: 'Pricing', description: 'Compare three clear plans side by side.' },
  { id: 'cta', name: 'Call to action', description: 'Close with one compelling next step.' },
  { id: 'footer', name: 'Footer', description: 'Add grouped links and copyright information.' },
];

export const SECTION_PRESETS: readonly SectionPreset[] = definitions.map((preset) => ({
  ...preset,
  build: () => buildPreset(preset.id),
}));

export function buildSectionPreset(id: SectionPresetId): ComponentNode {
  return buildPreset(id);
}
