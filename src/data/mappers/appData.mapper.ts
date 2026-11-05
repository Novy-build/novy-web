import type { DataCollection, DataRecord } from '@domain/entities/appData';
import type { DataCollectionDTO, DataRecordDTO } from '../dto/appData.dto';

export function mapCollectionToDto(collection: DataCollection): DataCollectionDTO {
  return {
    ...collection,
    fields: collection.fields.map((field) => ({ ...field })),
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

export function mapCollectionFromDto(dto: DataCollectionDTO): DataCollection {
  return {
    ...dto,
    fields: dto.fields.map((field) => ({ ...field })),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export function mapRecordToDto(record: DataRecord): DataRecordDTO {
  return {
    ...record,
    values: { ...record.values },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapRecordFromDto(dto: DataRecordDTO): DataRecord {
  return {
    ...dto,
    values: { ...dto.values },
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}
