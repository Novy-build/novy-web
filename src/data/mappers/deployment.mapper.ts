import type { DeploymentRecord } from '@domain/entities/deployment';
import type { DeploymentRecordDTO } from '../dto/deployment.dto';

/**
 * Domain <-> DTO boundary for deployments. Dates become ISO-8601 strings on
 * the wire; the future API payload mirrors this shape.
 */

export function mapDeploymentToDto(record: DeploymentRecord): DeploymentRecordDTO {
  return {
    id: record.id,
    projectId: record.projectId,
    status: record.status,
    url: record.url,
    appVersionId: record.appVersionId,
    environment: record.environment,
    provider: record.provider,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}

export function mapDeploymentFromDto(dto: DeploymentRecordDTO): DeploymentRecord {
  return {
    id: dto.id,
    projectId: dto.projectId,
    status: dto.status,
    url: dto.url,
    appVersionId: dto.appVersionId ?? null,
    environment: dto.environment ?? 'preview',
    provider: dto.provider ?? 'development',
    errorCode: dto.errorCode ?? null,
    errorMessage: dto.errorMessage ?? null,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt ?? dto.createdAt),
    completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
  };
}
