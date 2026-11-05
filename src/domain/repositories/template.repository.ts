import type { Template } from '../entities/template';

/** Starting points for the New Project gallery. Static for the mock phase. */
export interface TemplateRepository {
  listTemplates(): Promise<Template[]>;
  getTemplate(templateId: string): Promise<Template | null>;
}
