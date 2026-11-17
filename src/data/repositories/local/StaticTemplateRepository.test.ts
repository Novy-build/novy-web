import { describe, expect, it } from 'vitest';
import { StaticTemplateRepository } from './StaticTemplateRepository';
import { TEMPLATE_CATALOG } from '../../templates/templateCatalog';

function createRepository() {
  return new StaticTemplateRepository([...TEMPLATE_CATALOG], 0);
}

describe('StaticTemplateRepository', () => {
  it('lists every starter template', async () => {
    const templates = await createRepository().listTemplates();

    expect(templates.map((template) => template.id)).toEqual([
      'template_blank',
      'template_landing',
      'template_login',
      'template_students',
      'template_notes',
      'template_cv_starter',
      'template_rag_chat',
      'template_site_blank',
      'template_site_landing',
      'template_site_portfolio',
      'template_site_agency',
      'template_site_coming_soon',
    ]);
  });

  it('returns a specific template by id', async () => {
    const template = await createRepository().getTemplate('template_login');

    expect(template?.name).toBe('Login form');
  });

  it('returns null for unknown ids', async () => {
    expect(await createRepository().getTemplate('sandbox')).toBeNull();
  });

  it('hands out clones so callers cannot corrupt the catalog', async () => {
    const repository = createRepository();
    const template = await repository.getTemplate('template_login');
    (template?.screens[0].nodes ?? []).pop();

    const fetchedAgain = await repository.getTemplate('template_login');

    expect(fetchedAgain?.screens[0].nodes.length).toBe(
      TEMPLATE_CATALOG.find((entry) => entry.id === 'template_login')?.screens[0].nodes.length,
    );
  });
});
