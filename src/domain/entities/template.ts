import type { Screen } from './screen';
import type { DataField, DataValue, RecordIdentifier } from './appData';

/** Collection definition bundled with a starter template before project IDs exist. */
export interface TemplateCollectionBlueprint {
  /** Stable alias referenced by template components and workflows. */
  referenceId: string;
  name: string;
  fields: DataField[];
  identifier?: RecordIdentifier;
  records?: Array<Record<string, DataValue>>;
}

/** Project-scoped data that is provisioned when a template is selected. */
export interface TemplateDataBlueprint {
  databaseName: string;
  collections: TemplateCollectionBlueprint[];
}

/** A starting point offered in the New Project gallery. */
export interface Template {
  id: string;
  name: string;
  description: string;
  screens: Screen[];
  data?: TemplateDataBlueprint;
}
