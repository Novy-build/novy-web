import type { Template } from '@domain/entities/template';
import type { TemplateRepository } from '@domain/repositories/template.repository';
import { sleep } from '../../storage/storage';

/** Static starting points for the New Project gallery (frontend-only). */
export class StaticTemplateRepository implements TemplateRepository {
  private readonly catalog: Template[];
  private readonly latencyMs: number;

  constructor(catalog: Template[], latencyMs = 120) {
    this.catalog = catalog;
    this.latencyMs = latencyMs;
  }

  async listTemplates(): Promise<Template[]> {
    await sleep(this.latencyMs);
    return structuredClone(this.catalog);
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    await sleep(this.latencyMs);
    const match = this.catalog.find((template) => template.id === templateId);
    return match ? structuredClone(match) : null;
  }
}
