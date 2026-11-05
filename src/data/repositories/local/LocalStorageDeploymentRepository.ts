import type { DeploymentRecord } from '@domain/entities/deployment';
import type { DeploymentRepository } from '@domain/repositories/deployment.repository';
import { generateId } from '@domain/ids';
import { mapDeploymentFromDto, mapDeploymentToDto } from '../../mappers/deployment.mapper';
import type { DeploymentCollectionDTO, DeploymentRecordDTO } from '../../dto/deployment.dto';
import { readJson, sleep, writeJson, type StorageLike } from '../../storage/storage';

const DEPLOYMENTS_KEY = 'novy.deployments.v1';
const DEFAULT_LATENCY_MS = 250;

/**
 * Mock deployment history. Phase 7 layers the simulated Vercel pipeline on
 * top of createDeployment; the presentation layer only knows this interface.
 */
export class LocalStorageDeploymentRepository implements DeploymentRepository {
  private readonly storage: StorageLike;
  private readonly latencyMs: number;

  constructor(storage: StorageLike, options?: { latencyMs?: number }) {
    this.storage = storage;
    this.latencyMs = options?.latencyMs ?? DEFAULT_LATENCY_MS;
  }

  async listDeployments(projectId: string): Promise<DeploymentRecord[]> {
    await sleep(this.latencyMs);
    const records = this.readAll()
      .filter((record) => record.projectId === projectId)
      .map(mapDeploymentFromDto);
    records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return records;
  }

  async createDeployment(input: {
    projectId: string;
    status: DeploymentRecord['status'];
    url?: string | null;
    now?: Date;
  }): Promise<DeploymentRecord> {
    await sleep(this.latencyMs);
    const created = mapDeploymentFromDto({
      id: generateId('dep'),
      projectId: input.projectId,
      status: input.status,
      url: input.url ?? null,
      createdAt: (input.now ?? new Date()).toISOString(),
    });
    writeJson(this.storage, DEPLOYMENTS_KEY, {
      deployments: [...this.readAll(), mapDeploymentToDto(created)],
    });
    return created;
  }

  private readAll(): DeploymentRecordDTO[] {
    return readJson<DeploymentCollectionDTO>(this.storage, DEPLOYMENTS_KEY)?.deployments ?? [];
  }
}
