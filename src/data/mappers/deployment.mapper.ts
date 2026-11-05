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
    createdAt: record.createdAt.toISOString(),
  };
}

export function mapDeploymentFromDto(dto: DeploymentRecordDTO): DeploymentRecord {
  return {
    id: dto.id,
    projectId: dto.projectId,
    status: dto.status,
    url: dto.url,
    createdAt: new Date(dto.createdAt),
  };
}
