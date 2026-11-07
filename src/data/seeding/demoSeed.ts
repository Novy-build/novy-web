import type { Screen } from '@domain/entities/screen';
import { generateId } from '@domain/ids';
import type { Repositories } from '../repositories/local';

const DEMO_PROJECT_NAME = 'Hello, World!';
const TEMPLATE_BLANK_ID = 'template_blank';

/**
 * Seeds one sample project (the "Hello, World!" screen from the product
 * draft) on a brand-new install so screens are never empty. Idempotent: only
 * runs when the project list is completely empty.
 */
export async function ensureDemoProject(repositories: Repositories): Promise<void> {
  const existing = await repositories.projects.listProjects();
  if (existing.length > 0) {
    return;
  }

  const blank = await repositories.templates.getTemplate(TEMPLATE_BLANK_ID);
  if (!blank) {
    return;
  }

  const project = await repositories.projects.createProject(DEMO_PROJECT_NAME, blank);
  await repositories.projects.saveProjectDocument(project.id, {
    screens: [buildDemoScreen()],
  });
}

function buildDemoScreen(): Screen {
  return {
    id: generateId('screen'),
    name: 'Home',
    path: '/',
    nodes: [
      {
        id: generateId('node'),
        type: 'text',
        x: 95,
        y: 96,
        w: 200,
        h: 36,
        props: { text: 'Hello, World!', level: 'display' },
      },
      {
        id: generateId('node'),
        type: 'text',
        x: 90,
        y: 148,
        w: 210,
        h: 24,
        props: { text: 'Press the button to change the text above.', level: 'body' },
      },
      {
        id: generateId('node'),
        type: 'button',
        x: 80,
        y: 560,
        w: 230,
        h: 48,
        props: { label: 'Click me', variant: 'solid' },
      },
    ],
    behaviors: [],
    logicGraphs: [],
  };
}
