import { DEPLOYMENT_STAGES, type DeploymentRecord } from '@domain/entities/deployment';
import type { DeploymentProvider, PublishedApplication } from '@domain/entities/deployment';
import type { DeploymentRepository } from '@domain/repositories/deployment.repository';
import type { PublishDeploymentInput } from '@domain/repositories/deployment.repository';
import { generateId } from '@domain/ids';
import {
  mapDeploymentFromDto,
  mapDeploymentToDto,
  mapPublishedApplicationFromDto,
} from '../../mappers/deployment.mapper';
import type {
  DeploymentCollectionDTO,
  DeploymentRecordDTO,
  PublishedApplicationDTO,
} from '../../dto/deployment.dto';
import { readJson, sleep, writeJson, type StorageLike } from '../../storage/storage';

const DEPLOYMENTS_KEY = 'novy.deployments.v1';
const DEFAULT_LATENCY_MS = 250;
const DEFAULT_PIPELINE_STEP_MS = 650;

/**
 * Local-only deployment history and simulated pipeline used when the backend
 * API is not configured. The presentation layer only knows the repository port.
 */
export interface LocalDeploymentOptions {
  latencyMs?: number;
  pipelineStepMs?: number;
  /** Supplies display names for the publishing summary without a second store read per project. */
  listProjectNames?: () => Promise<Array<{ id: string; name: string }>>;
}

export class LocalStorageDeploymentRepository implements DeploymentRepository {
  private readonly storage: StorageLike;
  private readonly latencyMs: number;
  private readonly pipelineStepMs: number;
  private readonly listProjectNames: LocalDeploymentOptions['listProjectNames'];

  constructor(storage: StorageLike, options?: LocalDeploymentOptions) {
    this.storage = storage;
    this.latencyMs = options?.latencyMs ?? DEFAULT_LATENCY_MS;
    this.pipelineStepMs = options?.pipelineStepMs ?? DEFAULT_PIPELINE_STEP_MS;
    this.listProjectNames = options?.listProjectNames;
  }

  async listProviders(): Promise<DeploymentProvider[]> {
    return ['development'];
  }

  async listPublishedApplications(): Promise<PublishedApplication[]> {
    await sleep(this.latencyMs);
    const names = new Map(
      (await this.listProjectNames?.() ?? []).map((project) => [project.id, project.name]),
    );
    const grouped = new Map<string, DeploymentRecordDTO[]>();
    for (const record of this.readAll()) {
      const group = grouped.get(record.projectId) ?? [];
      group.push(record);
      grouped.set(record.projectId, group);
    }

    const applications: PublishedApplicationDTO[] = [];
    for (const [projectId, records] of grouped) {
      records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const latest = records[0];
      const live = records.find((record) => record.status === 'live' && record.url);
      applications.push({
        projectId,
        projectName: names.get(projectId) ?? projectId,
        active: Boolean(live),
        status: latest.status,
        url: live?.url ?? null,
        environment: latest.environment ?? 'preview',
        provider: latest.provider ?? 'development',
        lastPublishedAt: latest.createdAt,
        deploymentCount: records.length,
      });
    }
    applications.sort(
      (a, b) => Date.parse(b.lastPublishedAt) - Date.parse(a.lastPublishedAt),
    );
    return applications.map(mapPublishedApplicationFromDto);
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
    environment?: DeploymentRecord['environment'];
    provider?: DeploymentRecord['provider'];
  }): Promise<DeploymentRecord> {
    await sleep(this.latencyMs);
    const created = mapDeploymentFromDto({
      id: generateId('dep'),
      projectId: input.projectId,
      status: input.status,
      url: input.url ?? null,
      appVersionId: null,
      environment: input.environment ?? 'preview',
      provider: input.provider ?? 'development',
      errorCode: null,
      errorMessage: null,
      createdAt: (input.now ?? new Date()).toISOString(),
      updatedAt: (input.now ?? new Date()).toISOString(),
      completedAt: input.status === 'building' ? null : (input.now ?? new Date()).toISOString(),
    });
    writeJson(this.storage, DEPLOYMENTS_KEY, {
      deployments: [...this.readAll(), mapDeploymentToDto(created)],
    });
    return created;
  }

  async publishDeployment(
    input: PublishDeploymentInput,
    onStage: (stage: (typeof DEPLOYMENT_STAGES)[number]) => void,
  ): Promise<DeploymentRecord> {
    for (const stage of DEPLOYMENT_STAGES) {
      onStage(stage);
      await sleep(this.pipelineStepMs);
    }
    return this.createDeployment({
      projectId: input.projectId,
      status: 'live',
      url: input.url ?? null,
      environment: input.environment ?? 'preview',
      provider: input.provider ?? 'development',
    });
  }

  async getDeployment(projectId: string, deploymentId: string): Promise<DeploymentRecord> {
    await sleep(this.latencyMs);
    const record = this.readAll().find(
      (candidate) => candidate.projectId === projectId && candidate.id === deploymentId,
    );
    if (!record) throw new Error('Deployment not found.');
    return mapDeploymentFromDto(record);
  }

  private readAll(): DeploymentRecordDTO[] {
    return readJson<DeploymentCollectionDTO>(this.storage, DEPLOYMENTS_KEY)?.deployments ?? [];
  }
}
