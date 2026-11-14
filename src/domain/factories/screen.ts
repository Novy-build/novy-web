import type { Project } from '../entities/project';
import type { ProjectDocument, Screen } from '../entities/screen';
import type { Template } from '../entities/template';
import { generateId } from '../ids';

/** Timestamps are injected to keep these factories pure and testable. */
export interface CreateScreenInput {
  name: string;
  path?: string;
  nodes?: Screen['nodes'];
}

export function screenPathFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 && slug !== 'home' ? `/${slug}` : '/';
}

export function createScreen(input: CreateScreenInput): Screen {
  return {
    id: generateId('screen'),
    name: input.name,
    path: input.path ?? screenPathFromName(input.name),
    nodes: input.nodes ?? [],
    behaviors: [],
    logicGraphs: [],
  };
}

export function createProjectDocument(screens: Screen[]): ProjectDocument {
  return { screens };
}

/**
 * Deep-clones the template screens so every project gets its own editable
 * copy with fresh screen ids as well.
 */
export function createProjectFromTemplate(template: Template, name: string, now: Date): Project {
  const screenIds = new Map(template.screens.map((screen) => [screen.id, generateId('screen')]));
  const screens: Screen[] = template.screens.map((screen, index) => {
    const cloned = structuredClone(screen);
    return {
      ...cloned,
      id: screenIds.get(screen.id)!,
      path: screen.path || (index === 0 ? '/' : screenPathFromName(screen.name)),
      logicGraphs: cloned.logicGraphs.map((graph) => ({
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.kind === 'action' && node.payload.type === 'navigate'
            ? {
                ...node,
                payload: {
                  ...node.payload,
                  targetScreenId: screenIds.get(node.payload.targetScreenId) ?? node.payload.targetScreenId,
                },
              }
            : node,
        ),
      })),
    };
  });

  return {
    id: generateId('project'),
    name,
    projectType: template.projectType,
    createdAt: now,
    updatedAt: now,
    document: createProjectDocument(screens),
  };
}
