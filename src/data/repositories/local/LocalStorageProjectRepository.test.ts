import { beforeEach, describe, expect, it } from 'vitest';
import type { Template } from '@domain/entities/template';
import { LocalStorageProjectRepository } from './LocalStorageProjectRepository';
import { ensureDemoProject } from '../../seeding/demoSeed';
import { createLocalRepositories } from './index';

const BLANK_TEMPLATE: Template = {
  id: 'template_blank',
  name: 'Blank',
  description: 'Empty screen',
  screens: [{ id: 'screen_blank', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] }],
};

const BASE_MS = Date.UTC(2026, 0, 1, 10, 0, 0);

/**
 * Snapshot-style injected clock: reads are free, time only moves when the
 * test advances it, so every stamped timestamp is exactly predictable.
 */
interface TestClock {
  now(): Date;
  advanceMinutes(minutes: number): void;
}

function makeClock(): TestClock {
  let currentMs = BASE_MS;
  return {
    now: () => new Date(currentMs),
    advanceMinutes(minutes: number) {
      currentMs += minutes * 60_000;
    },
  };
}

// Every test in this file starts from an empty store.
beforeEach(() => {
  window.localStorage.clear();
});

function createRepository() {
  const clock = makeClock();
  return {
    repository: new LocalStorageProjectRepository(window.localStorage, {
      latencyMs: 0,
      now: clock.now,
    }),
    clock,
  };
}

describe('LocalStorageProjectRepository', () => {
  it('starts with an empty project list', async () => {
    const { repository } = createRepository();

    expect(await repository.listProjects()).toEqual([]);
  });

  it('creates a project from a template and lists it', async () => {
    const { repository } = createRepository();

    const created = await repository.createProject('My App', BLANK_TEMPLATE);
    const list = await repository.listProjects();

    expect(created.id).toMatch(/^project_/);
    expect(created.name).toBe('My App');
    expect(created.document.screens).toHaveLength(1);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: created.id,
      name: 'My App',
      screenCount: 1,
      previewScreen: { name: 'Home' },
    });
  });

  it('persists across repository instances', async () => {
    const { repository } = createRepository();
    const created = await repository.createProject('Persistent', BLANK_TEMPLATE);

    const fresh = new LocalStorageProjectRepository(window.localStorage, {
      latencyMs: 0,
      now: makeClock().now,
    });
    const loaded = await fresh.getProject(created.id);

    expect(loaded?.name).toBe('Persistent');
  });

  it('saves a document and reflects it afterwards', async () => {
    const { repository, clock } = createRepository();
    const created = await repository.createProject('Draft', BLANK_TEMPLATE);
    const document = {
      screens: [{ id: 'screen_new', name: 'About', path: '/about', nodes: [], behaviors: [], logicGraphs: [] }],
    };

    clock.advanceMinutes(1);
    const saved = await repository.saveProjectDocument(created.id, document);
    const loaded = await repository.getProject(created.id);

    expect(saved.updatedAt.getTime()).toBe(clock.now().getTime());
    expect(loaded?.document.screens.map((screen) => screen.name)).toEqual(['About']);
  });

  it('renames projects and stamps updatedAt', async () => {
    const { repository, clock } = createRepository();
    const created = await repository.createProject('Old name', BLANK_TEMPLATE);

    clock.advanceMinutes(1);
    const renamed = await repository.renameProject(created.id, 'New name');

    expect(renamed.name).toBe('New name');
    expect(renamed.updatedAt.getTime()).toBe(clock.now().getTime());
    expect((await repository.listProjects())[0].name).toBe('New name');
  });

  it('duplicates projects as copies with fresh ids', async () => {
    const { repository } = createRepository();
    const created = await repository.createProject('Original', BLANK_TEMPLATE);

    const copy = await repository.duplicateProject(created.id);

    expect(copy.id).not.toBe(created.id);
    expect(copy.name).toBe('Original (copy)');
    expect(await repository.listProjects()).toHaveLength(2);
  });

  it('deletes projects', async () => {
    const { repository } = createRepository();
    const created = await repository.createProject('Doomed', BLANK_TEMPLATE);

    await repository.deleteProject(created.id);

    expect(await repository.getProject(created.id)).toBeNull();
    expect(await repository.listProjects()).toEqual([]);
  });

  it('rejects document saves for missing projects', async () => {
    const { repository } = createRepository();

    await expect(repository.saveProjectDocument('nope', { screens: [] })).rejects.toThrow('Project not found: nope');
  });

  it('lists most recently updated projects first', async () => {
    const { repository, clock } = createRepository();
    const first = await repository.createProject('First', BLANK_TEMPLATE);
    await repository.createProject('Second', BLANK_TEMPLATE);

    clock.advanceMinutes(1);
    await repository.saveProjectDocument(first.id, {
      screens: [{ id: 'screen_touched', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] }],
    });

    const list = await repository.listProjects();

    expect(list.map((project) => project.name)).toEqual(['First', 'Second']);
  });
});

describe('demo project seeding', () => {
  it('seeds exactly one Hello World project on an empty install', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });

    await ensureDemoProject(repositories);
    await ensureDemoProject(repositories);

    const list = await repositories.projects.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Hello, World!');

    const project = await repositories.projects.getProject(list[0].id);
    const screen = project?.document.screens[0];
    expect(screen?.nodes).toHaveLength(3);
    expect(screen?.nodes.some((node) => node.type === 'button' && node.props.label === 'Click me')).toBe(true);
  });

  it('does not seed when projects already exist', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    await repositories.projects.createProject('User Project', BLANK_TEMPLATE);

    await ensureDemoProject(repositories);

    const list = await repositories.projects.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('User Project');
  });
});
