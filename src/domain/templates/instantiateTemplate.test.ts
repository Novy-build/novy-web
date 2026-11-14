import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { createLocalRepositories } from '@data/repositories/local';
import type { Project } from '../entities/project';
import type { AppDataRepository } from '../repositories/appData.repository';
import type { ProjectRepository } from '../repositories/project.repository';
import { validateProject } from '../validation/projectValidation';
import { instantiateTemplateProject } from './instantiateTemplate';

beforeEach(() => window.localStorage.clear());

describe('instantiateTemplateProject', () => {
  it('provisions template data and remaps every Notes collection reference', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const template = TEMPLATE_CATALOG.find((candidate) => candidate.id === 'template_notes')!;

    const project = await instantiateTemplateProject('My Notes', template, repositories);
    const databases = await repositories.appData.listDatabases(project.id);
    const collections = await repositories.appData.listCollections(project.id);
    const records = await repositories.appData.listRecords(project.id, collections[0]!.id);

    expect(databases.map((database) => database.name)).toEqual(['Notes Database']);
    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      name: 'Notes',
      identifier: { key: 'noteId', type: 'string', generation: 'backend' },
    });
    expect(records.map((record) => record.values.note_title)).toEqual([
      'Created with Novy',
      'Minimal notes',
      'Build with confidence',
    ]);
    expect(JSON.stringify(project.document)).not.toContain('template-notes-collection');
    expect(project.document.screens.find((screen) => screen.name === 'Note Detail')).toMatchObject({
      path: '/notes/:noteId',
      routeParameters: [{
        name: 'noteId',
        source: { kind: 'record-id', collectionId: collections[0]!.id, identifierKey: 'noteId' },
      }],
    });
    expect(validateProject(project.document, collections).issues.filter(
      (issue) => issue.severity === 'error',
    )).toEqual([]);
  });

  it('rolls back the project and database when provisioning fails', async () => {
    const repositories = createLocalRepositories({ latencyMs: 0 });
    const template = TEMPLATE_CATALOG.find((candidate) => candidate.id === 'template_notes')!;
    const createProject = repositories.projects.createProject.bind(repositories.projects);
    let createdProjectId = '';
    vi.spyOn(repositories.projects, 'createProject').mockImplementation(async (...args) => {
      const project = await createProject(...args);
      createdProjectId = project.id;
      return project;
    });
    vi.spyOn(repositories.appData, 'createCollection').mockRejectedValueOnce(new Error('Storage unavailable.'));

    await expect(instantiateTemplateProject('Broken Notes', template, repositories))
      .rejects.toThrow('Storage unavailable.');

    expect(await repositories.projects.listProjects()).toEqual([]);
    expect(await repositories.appData.listDatabases(createdProjectId)).toEqual([]);
  });

  it('leaves template data to a repository that provisions it atomically', async () => {
    const template = TEMPLATE_CATALOG.find((candidate) => candidate.id === 'template_notes')!;
    const project: Project = {
      id: 'project_remote',
      name: 'Remote Notes',
      projectType: 'app',
      createdAt: new Date('2026-11-11T12:00:00.000Z'),
      updatedAt: new Date('2026-11-11T12:00:00.000Z'),
      document: { screens: [] },
    };
    const projects = {
      provisionsTemplateData: true,
      createProject: vi.fn().mockResolvedValue(project),
    };
    const appData = {
      createDatabase: vi.fn(),
      createCollection: vi.fn(),
      createRecord: vi.fn(),
    };

    const created = await instantiateTemplateProject('Remote Notes', template, {
      projects: projects as unknown as ProjectRepository,
      appData: appData as unknown as AppDataRepository,
    });

    expect(created).toBe(project);
    expect(projects.createProject).toHaveBeenCalledWith('Remote Notes', template);
    expect(appData.createDatabase).not.toHaveBeenCalled();
    expect(appData.createCollection).not.toHaveBeenCalled();
    expect(appData.createRecord).not.toHaveBeenCalled();
  });
});
