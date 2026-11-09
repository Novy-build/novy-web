import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { createLocalRepositories } from '@data/repositories/local';
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
    expect(collections[0]).toMatchObject({ name: 'Notes' });
    expect(records.map((record) => record.values.note_title)).toEqual([
      'Created with Novy',
      'Minimal notes',
      'Build with confidence',
    ]);
    expect(JSON.stringify(project.document)).not.toContain('template-notes-collection');
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
});
