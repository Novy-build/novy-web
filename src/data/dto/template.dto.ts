import type { DataValue, RecordIdentifier } from '@domain/entities/appData';
import type { DataFieldDTO } from './appData.dto';
import type { ScreenDTO } from './project.dto';

export interface TemplateCollectionBlueprintDTO {
  referenceId: string;
  name: string;
  fields: DataFieldDTO[];
  identifier?: RecordIdentifier;
  records?: Array<Record<string, DataValue>>;
}

export interface TemplateDataBlueprintDTO {
  databaseName: string;
  collections: TemplateCollectionBlueprintDTO[];
}

/** Backend template payload accepted by `POST /projects`. */
export interface TemplateDTO {
  id: string;
  name: string;
  description: string;
  screens: ScreenDTO[];
  data?: TemplateDataBlueprintDTO;
}
