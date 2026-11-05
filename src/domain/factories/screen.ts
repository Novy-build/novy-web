import type { Project } from '../entities/project';
import type { ProjectDocument, Screen } from '../entities/screen';
import type { Template } from '../entities/template';
import { generateId } from '../ids';

/** Timestamps are injected to keep these factories pure and testable. */
export interface CreateScreenInput {
  name: string;
  nodes?: Screen['nodes'];
}

export function createScreen(input: CreateScreenInput): Screen {
  return {
    id: generateId('screen'),
    name: input.name,
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
  const screens: Screen[] = template.screens.map((screen) => ({
    ...structuredClone(screen),
    id: generateId('screen'),
  }));

  return {
    id: generateId('project'),
    name,
    createdAt: now,
    updatedAt: now,
    document: createProjectDocument(screens),
  };
}
