import type { Template } from '@domain/entities/template';
import type { TemplateDTO } from '../dto/template.dto';
import { mapScreenToDto } from './project.mapper';

/**
 * Domain template -> backend payload. Template screens are sent in the same
 * versioned ScreenDTO shape as persisted project screens so the backend can
 * validate and provision them deterministically.
 */
export function mapTemplateToDto(template: Template): TemplateDTO {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    screens: template.screens.map(mapScreenToDto),
    ...(template.data
      ? {
          data: {
            databaseName: template.data.databaseName,
            collections: template.data.collections.map((collection) => ({
              referenceId: collection.referenceId,
              name: collection.name,
              fields: collection.fields.map((field) => ({ ...field })),
              ...(collection.identifier
                ? { identifier: { ...collection.identifier } }
                : {}),
              ...(collection.records
                ? { records: collection.records.map((record) => ({ ...record })) }
                : {}),
            })),
          },
        }
      : {}),
  };
}
