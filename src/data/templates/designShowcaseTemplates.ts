import type { ComponentNode } from '@domain/entities/componentNode';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import type { Screen } from '@domain/entities/screen';
import type { Template } from '@domain/entities/template';

const CREATIVE_DESIGN: AppDesignSystem = {
  colors: {
    primary: '#ff4fad', accent: '#ff4fad', canvas: '#0b0b0d', surface: '#202020',
    surfaceElevated: '#282828', text: '#f8f8f8', textMuted: '#a1a1aa', border: '#343434',
    success: '#34d399', warning: '#fbbf24', danger: '#fb7185',
  },
  darkColors: {
    primary: '#ff64b8', accent: '#ff64b8', canvas: '#070708', surface: '#19191b',
    surfaceElevated: '#242426', text: '#ffffff', textMuted: '#a1a1aa', border: '#303034',
    success: '#34d399', warning: '#fbbf24', danger: '#fb7185',
  },
  typography: {
    bodyFontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  },
  radii: { small: 8, medium: 14, large: 28, pill: 999 },
  styles: [
    {
      id: 'creative_nav_icon', name: 'Navigation icon', componentType: 'icon',
      appearance: { textColor: '#b6b6bc', borderRadius: 10 },
    },
  ],
};

const LEARNING_DESIGN: AppDesignSystem = {
  colors: {
    primary: '#2d2c52', accent: '#b59cff', canvas: '#f5f5f7', surface: '#ffffff',
    surfaceElevated: '#ffffff', text: '#202033', textMuted: '#6f7280', border: '#e6e6eb',
    success: '#23856d', warning: '#d08a2f', danger: '#cc4e5c',
  },
  darkColors: {
    primary: '#b8b5ff', accent: '#c6b5ff', canvas: '#11121a', surface: '#1a1b26',
    surfaceElevated: '#222432', text: '#f4f4f8', textMuted: '#a7a9b7', border: '#303241',
    success: '#5ee2ba', warning: '#f3bd68', danger: '#ff8792',
  },
  typography: {
    bodyFontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  },
  radii: { small: 8, medium: 14, large: 24, pill: 999 },
  styles: [
    {
      id: 'learning_card', name: 'Dashboard card', componentType: 'container',
      appearance: {
        backgroundColor: 'var(--novy-app-surface)', borderColor: 'var(--novy-app-border)',
        borderStyle: 'solid', borderWidth: 1, borderRadius: 14,
        boxShadows: [{ x: 0, y: 10, blur: 28, spread: -18, color: 'rgba(31, 35, 48, 0.3)' }],
      },
    },
  ],
};

function screen(id: string, name: string, nodes: ComponentNode[], backgroundColor: string): Screen {
  return {
    id, name, path: '/', nodes, behaviors: [], logicGraphs: [],
    appearance: { backgroundColor, dark: { backgroundColor } },
  };
}

function text(
  id: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size = 14,
  weight: 'normal' | 'medium' | 'semibold' | 'bold' = 'normal',
  color?: string,
): ComponentNode {
  return {
    id, type: 'text', x, y, w, h,
    ...(color ? { appearance: { textColor: color } } : {}),
    props: { text: value, level: size >= 24 ? 'display' : size >= 17 ? 'title' : 'body', fontSize: size, fontWeight: weight, lineHeight: 1.25 },
  };
}

function icon(id: string, name: Extract<ComponentNode, { type: 'icon' }>['props']['icon'], x: number, y: number, size = 24, label = ''): ComponentNode {
  return { id, type: 'icon', x, y, w: size, h: size, props: { icon: name, label, strokeWidth: 1.7 } };
}

const creativeRailChildren: ComponentNode[] = [
  text('creative_logo', 'M', 18, 24, 36, 38, 30, 'bold', '#ffffff'),
  {
    id: 'creative_add', type: 'button', x: 12, y: 112, w: 48, h: 48,
    appearance: {
      backgroundColor: '#ff4fad', borderRadius: 12,
      boxShadows: [{ x: 0, y: 0, blur: 22, spread: 1, color: 'rgba(255, 79, 173, 0.7)' }],
    },
    props: { label: 'Create', variant: 'solid', icon: 'plus', iconPosition: 'center' },
  },
  { ...icon('creative_image_icon', 'image', 24, 220), styleId: 'creative_nav_icon' },
  { ...icon('creative_video_icon', 'video', 24, 272), styleId: 'creative_nav_icon' },
  { ...icon('creative_audio_icon', 'volume-2', 24, 324), styleId: 'creative_nav_icon' },
  { ...icon('creative_asset_icon', 'box', 24, 430), styleId: 'creative_nav_icon' },
  { ...icon('creative_workflow_icon', 'workflow', 24, 482), styleId: 'creative_nav_icon' },
  { ...icon('creative_people_icon', 'users', 24, 534), styleId: 'creative_nav_icon' },
];

const creativeMenuChildren: ComponentNode[] = [
  text('creative_title', 'Magnific', 22, 28, 220, 48, 34, 'semibold', '#ffffff'),
  text('creative_projects_label', 'PROJECTS', 22, 102, 180, 20, 12, 'semibold', '#93939a'),
  icon('creative_folder_1', 'folder', 22, 142, 20), text('creative_project_1', 'Bloom Coffee', 54, 139, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_folder_2', 'folder', 22, 182, 20), text('creative_project_2', 'Nike Ad', 54, 179, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_folder_3', 'folder', 22, 222, 20), text('creative_project_3', 'Velvet & Co.', 54, 219, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_folder_4', 'folder', 22, 262, 20), text('creative_project_4', 'All projects', 54, 259, 170, 24, 16, 'medium', '#a0a0a6'),
  text('creative_create_label', 'CREATE', 22, 318, 180, 20, 12, 'semibold', '#93939a'),
  icon('creative_images', 'image', 22, 354, 20), text('creative_images_text', 'Images', 54, 351, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_videos', 'video', 22, 394, 20), text('creative_videos_text', 'Videos', 54, 391, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_audio', 'volume-2', 22, 434, 20), text('creative_audio_text', 'Audio', 54, 431, 170, 24, 16, 'medium', '#eeeeef'),
  text('creative_browse_label', 'BROWSE', 22, 494, 180, 20, 12, 'semibold', '#93939a'),
  icon('creative_assets', 'box', 22, 532, 20), text('creative_assets_text', 'Assets', 54, 529, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_templates', 'workflow', 22, 572, 20), text('creative_templates_text', 'Templates', 54, 569, 170, 24, 16, 'medium', '#eeeeef'),
  icon('creative_community', 'users', 22, 612, 20), text('creative_community_text', 'Community', 54, 609, 170, 24, 16, 'medium', '#eeeeef'),
];

const CREATIVE_TEMPLATE: Template = {
  id: 'template_creative_workspace',
  name: 'Creative media workspace',
  description: 'A polished dark navigation workspace with semantic icons, glow, and reusable styles.',
  projectType: 'app',
  designSystem: CREATIVE_DESIGN,
  screens: [screen('screen_creative_home', 'Home', [
    {
      id: 'creative_shell', type: 'container', x: 20, y: 30, w: 350, h: 700,
      responsive: {
        tablet: { x: 204, y: 120, w: 360, h: 720 },
        desktop: { x: 420, y: 40, w: 360, h: 720 },
      },
      appearance: {
        backgroundColor: '#19191b', borderColor: '#303034', borderStyle: 'solid', borderWidth: 1, borderRadius: 28,
        boxShadows: [{ x: 0, y: 24, blur: 70, spread: -24, color: 'rgba(0,0,0,0.8)' }],
      },
      props: {},
      children: [
        {
          id: 'creative_rail', type: 'container', x: 0, y: 0, w: 72, h: 700,
          responsive: { desktop: { h: 720 } },
          appearance: { backgroundColor: '#202022', borderStyle: 'none', borderRadius: 28 },
          props: {}, children: creativeRailChildren,
        },
        {
          id: 'creative_menu', type: 'container', x: 80, y: 0, w: 270, h: 700,
          responsive: { desktop: { h: 720 } },
          appearance: { backgroundColor: '#262628', borderStyle: 'none', borderRadius: 24 },
          props: {}, children: creativeMenuChildren,
        },
      ],
    },
  ], '#0a0a0c')],
};

function sidebarItem(id: string, y: number, iconName: Extract<ComponentNode, { type: 'icon' }>['props']['icon'], label: string, active = false): ComponentNode[] {
  return [
    {
      ...icon(`${id}_icon`, iconName, 24, y, 18, ''),
      appearance: { textColor: active ? '#202033' : '#777987' },
    },
    text(`${id}_label`, label, 54, y - 2, 118, 22, 13, active ? 'semibold' : 'medium', active ? '#202033' : '#777987'),
  ];
}

function statCard(id: string, x: number, value: string, label: string): ComponentNode {
  return {
    id, type: 'container', styleId: 'learning_card', x: 24, y: 336, w: 342, h: 92,
    responsive: { desktop: { x, y: 330, w: 180, h: 100 } },
    props: {}, children: [
      text(`${id}_value`, value, 18, 14, 130, 36, 28, 'medium', '#202033'),
      text(`${id}_label`, label, 18, 54, 140, 30, 12, 'normal', '#777987'),
    ],
  };
}

const learningSidebar: ComponentNode = {
  id: 'learning_sidebar', type: 'container', x: 0, y: 0, w: 200, h: 800, isHidden: true,
  responsive: { desktop: { x: 0, y: 0, w: 200, h: 800, isHidden: false } },
  appearance: { backgroundColor: '#ffffff', borderColor: '#e6e6eb', borderStyle: 'solid', borderWidth: 1 },
  props: {}, children: [
    text('learning_brand', 'aplen', 38, 24, 110, 30, 20, 'bold', '#202033'),
    ...sidebarItem('learning_dashboard', 92, 'layout-dashboard', 'Dashboard', true),
    ...sidebarItem('learning_schedule', 136, 'calendar', 'Schedule'),
    ...sidebarItem('learning_courses', 180, 'book-open', 'Courses'),
    ...sidebarItem('learning_messages', 224, 'message-square', 'Messages'),
    ...sidebarItem('learning_settings', 268, 'settings', 'Settings'),
    ...sidebarItem('learning_logout', 742, 'log-out', 'Log out'),
  ],
};

const learningHero: ComponentNode = {
  id: 'learning_hero', type: 'container', x: 24, y: 88, w: 342, h: 220,
  responsive: {
    tablet: { x: 32, y: 88, w: 704, h: 220 },
    desktop: { x: 240, y: 84, w: 920, h: 200 },
  },
  appearance: {
    backgroundColor: '#2d2c52', borderStyle: 'none', borderRadius: 18,
    boxShadows: [{ x: 0, y: 18, blur: 40, spread: -22, color: 'rgba(45,44,82,0.55)' }],
  },
  props: {}, children: [
    text('learning_greeting', 'Hi, Alyssa!', 24, 24, 180, 22, 13, 'normal', '#aaa9c2'),
    text('learning_progress_copy', 'You have completed\n6 lessons this week!', 24, 58, 280, 78, 28, 'semibold', '#ffffff'),
    {
      id: 'learning_see_all', type: 'button', x: 24, y: 152, w: 96, h: 36,
      appearance: { backgroundColor: '#ffffff', textColor: '#202033', borderRadius: 18 },
      props: { label: 'See all', variant: 'solid', icon: 'arrow-right', iconPosition: 'right' },
    },
    {
      id: 'learning_course_card', type: 'container', x: 218, y: 24, w: 100, h: 164, isHidden: true,
      responsive: { desktop: { x: 620, y: 24, w: 126, h: 152, isHidden: false } },
      appearance: { backgroundColor: '#b59cff', borderStyle: 'none', borderRadius: 14 },
      props: {}, children: [
        icon('learning_course_icon', 'book-open', 16, 48, 24),
        text('learning_course_name', 'Design\nComposition', 16, 84, 96, 44, 15, 'semibold', '#202033'),
      ],
    },
    {
      id: 'learning_course_card_2', type: 'container', x: 218, y: 24, w: 100, h: 164, isHidden: true,
      responsive: { desktop: { x: 760, y: 24, w: 126, h: 152, isHidden: false } },
      appearance: { backgroundColor: '#ffe4b5', borderStyle: 'none', borderRadius: 14 },
      props: {}, children: [
        icon('learning_course_icon_2', 'grid-2x2', 16, 48, 24),
        text('learning_course_name_2', 'UX Design\nFoundations', 16, 84, 96, 44, 15, 'semibold', '#202033'),
      ],
    },
  ],
};

const LEARNING_TEMPLATE: Template = {
  id: 'template_learning_dashboard',
  name: 'Learning dashboard',
  description: 'A responsive dashboard shell with navigation, progress cards, statistics, and assignments.',
  projectType: 'app',
  designSystem: LEARNING_DESIGN,
  screens: [screen('screen_learning_home', 'Home', [
    learningSidebar,
    {
      id: 'learning_search', type: 'input', x: 24, y: 24, w: 270, h: 44,
      responsive: {
        tablet: { x: 32, y: 24, w: 600, h: 44 },
        desktop: { x: 240, y: 20, w: 430, h: 44 },
      },
      appearance: { backgroundColor: 'transparent', borderStyle: 'none', textColor: '#202033' },
      props: { label: 'Search', showLabel: false, placeholder: 'Search for a course, lesson, etc…', inputType: 'text', multiline: false },
    },
    { ...icon('learning_bell', 'bell', 326, 34, 20, 'Notifications'), responsive: { tablet: { x: 700, y: 34 }, desktop: { x: 1088, y: 30 } }, appearance: { textColor: '#515361' } },
    learningHero,
    { ...text('learning_statistics', 'Statistics', 24, 318, 200, 28, 20, 'semibold', '#202033'), responsive: { tablet: { x: 32, y: 330 }, desktop: { x: 240, y: 300 } } },
    { ...statCard('learning_stat_1', 240, '2', 'Courses completed'), y: 354, responsive: { tablet: { x: 32, y: 370, w: 216, h: 100 }, desktop: { x: 240, y: 330, w: 180, h: 100 } } },
    { ...statCard('learning_stat_2', 436, '3', 'Courses in progress'), y: 462, responsive: { tablet: { x: 264, y: 370, w: 216, h: 100 }, desktop: { x: 436, y: 330, w: 180, h: 100 } } },
    { ...statCard('learning_stat_3', 632, '8.5', 'Hours spent this week'), y: 570, responsive: { tablet: { x: 496, y: 370, w: 240, h: 100 }, desktop: { x: 632, y: 330, w: 220, h: 100 } } },
    { ...text('learning_assignments', 'My assignments', 24, 674, 240, 28, 20, 'semibold', '#202033'), responsive: { tablet: { x: 32, y: 500 }, desktop: { x: 240, y: 450 } } },
    {
      id: 'learning_assignment_1', type: 'container', styleId: 'learning_card', x: 24, y: 714, w: 342, h: 58,
      responsive: { tablet: { x: 32, y: 540, w: 704, h: 64 }, desktop: { x: 240, y: 486, w: 612, h: 64 } }, props: {}, children: [
        { ...icon('learning_assignment_1_icon', 'book-open', 16, 16, 28), appearance: { backgroundColor: '#ffe4b5', textColor: '#202033', borderRadius: 8 } },
        text('learning_assignment_1_title', 'Color Theory', 58, 10, 170, 24, 14, 'semibold', '#202033'),
        text('learning_assignment_1_subtitle', 'UX Design Foundations', 58, 32, 180, 18, 11, 'normal', '#777987'),
      ],
    },
    {
      id: 'learning_assignment_2', type: 'container', styleId: 'learning_card', x: 24, y: 714, w: 342, h: 58, isHidden: true,
      responsive: { tablet: { x: 32, y: 616, w: 704, h: 64, isHidden: false }, desktop: { x: 240, y: 562, w: 612, h: 64, isHidden: false } }, props: {}, children: [
        { ...icon('learning_assignment_2_icon', 'grid-2x2', 16, 16, 28), appearance: { backgroundColor: '#b59cff', textColor: '#202033', borderRadius: 8 } },
        text('learning_assignment_2_title', 'Filtering & Sorting', 58, 10, 180, 24, 14, 'semibold', '#202033'),
        text('learning_assignment_2_subtitle', 'Design Composition', 58, 32, 180, 18, 11, 'normal', '#777987'),
      ],
    },
  ], '#f5f5f7')],
};

export const DESIGN_SHOWCASE_TEMPLATES: readonly Template[] = [CREATIVE_TEMPLATE, LEARNING_TEMPLATE];
