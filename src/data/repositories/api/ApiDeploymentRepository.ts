import axios from 'axios';
import type { DeploymentProvider, DeploymentRecord, DeploymentStage } from '@domain/entities/deployment';
import type {
  DeploymentRepository,
  PublishDeploymentInput,
} from '@domain/repositories/deployment.repository';
import type { ApiHttpClient } from '../../api/http';
import { isRecord, readApiErrorEnvelope } from '../../api/http';
import type { DeploymentProvidersDTO, DeploymentRecordDTO } from '../../dto/deployment.dto';
import { mapDeploymentFromDto } from '../../mappers/deployment.mapper';

interface ApiDeploymentOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export class ApiDeploymentRepository implements DeploymentRepository {
  private readonly client: ApiHttpClient;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;
  private providersRequest: Promise<DeploymentProvider[]> | null = null;
  private readonly historyRequests = new Map<string, Promise<DeploymentRecord[]>>();

  constructor(client: ApiHttpClient, options: ApiDeploymentOptions = {}) {
    this.client = client;
    this.pollIntervalMs = options.pollIntervalMs ?? 2_000;
    this.maxPollAttempts = options.maxPollAttempts ?? 150;
  }

  async listProviders(): Promise<DeploymentProvider[]> {
    if (this.providersRequest) return this.providersRequest;
    const request = this.loadProviders();
    this.providersRequest = request;
    try {
      return await request;
    } finally {
      this.providersRequest = null;
    }
  }

  private async loadProviders(): Promise<DeploymentProvider[]> {
    try {
      const response = await this.client.get('/deployments/providers');
      const dto = response.data as DeploymentProvidersDTO;
      if (
        !isRecord(dto)
        || !Array.isArray(dto.providers)
        || !dto.providers.every(isDeploymentProvider)
      ) {
        throw new Error('Invalid provider response.');
      }
      return dto.providers;
    } catch (cause) {
      throw deploymentError(cause, 'Deployment providers could not be loaded.');
    }
  }

  async listDeployments(projectId: string): Promise<DeploymentRecord[]> {
    const current = this.historyRequests.get(projectId);
    if (current) return current;
    const request = this.loadDeployments(projectId);
    this.historyRequests.set(projectId, request);
    try {
      return await request;
    } finally {
      this.historyRequests.delete(projectId);
    }
  }

  private async loadDeployments(projectId: string): Promise<DeploymentRecord[]> {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/deployments`);
      if (!isRecord(response.data) || !Array.isArray(response.data.deployments)) {
        throw new Error('Invalid deployment history response.');
      }
      return response.data.deployments.map((item) => mapDeploymentFromDto(parseDeploymentDto(item)));
    } catch (cause) {
      throw deploymentError(cause, 'Deployment history could not be loaded.');
    }
  }

  async getDeployment(projectId: string, deploymentId: string): Promise<DeploymentRecord> {
    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}`,
      );
      return mapDeploymentFromDto(parseDeploymentDto(response.data));
    } catch (cause) {
      throw deploymentError(cause, 'Deployment status could not be loaded.');
    }
  }

  async createDeployment(): Promise<DeploymentRecord> {
    throw new Error('Direct deployment record creation is only available in local development.');
  }

  async publishDeployment(
    input: PublishDeploymentInput,
    onStage: (stage: DeploymentStage) => void,
  ): Promise<DeploymentRecord> {
    try {
      if (!input.provider || !input.environment || input.manifest === undefined) {
        throw new Error('Choose a deployment provider and save the project before publishing.');
      }
      onStage('build');
      const response = await this.client.post(
        `/projects/${encodeURIComponent(input.projectId)}/deployments`,
        {
          manifest: input.manifest,
          environment: input.environment,
          provider: input.provider,
        },
      );
      let deployment = mapDeploymentFromDto(parseDeploymentDto(response.data));
      onStage('optimize');
      for (let attempt = 0; attempt < this.maxPollAttempts; attempt += 1) {
        if (deployment.status !== 'building') return terminalDeployment(deployment, onStage);
        await delay(this.pollIntervalMs);
        onStage('provision');
        deployment = await this.getDeployment(input.projectId, deployment.id);
      }
      throw new Error(
        'Publishing is taking longer than expected. Check the deployment history in a moment — ' +
          'your previous deployment is still live.',
      );
    } catch (cause) {
      throw deploymentError(cause, 'Publish failed. Your previous deployment is still live.');
    }
  }
}

function terminalDeployment(
  deployment: DeploymentRecord,
  onStage: (stage: DeploymentStage) => void,
): DeploymentRecord {
  if (deployment.status === 'failed') {
    throw new Error(deployment.errorMessage ?? 'Publish failed. Your previous deployment is still live.');
  }
  onStage('live');
  return deployment;
}

function isDeploymentProvider(value: unknown): value is DeploymentProvider {
  return value === 'development' || value === 'vercel' || value === 'netlify';
}

function parseDeploymentDto(value: unknown): DeploymentRecordDTO {
  if (
    !isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.projectId !== 'string'
    || typeof value.appVersionId !== 'string'
    || (value.environment !== 'preview' && value.environment !== 'production')
    || !isDeploymentProvider(value.provider)
    || (value.status !== 'building' && value.status !== 'live' && value.status !== 'failed')
    || (value.url !== null && typeof value.url !== 'string')
    || typeof value.createdAt !== 'string'
    || typeof value.updatedAt !== 'string'
    || (value.completedAt !== null && typeof value.completedAt !== 'string')
  ) {
    throw new Error('The backend returned an invalid deployment record.');
  }
  return value as unknown as DeploymentRecordDTO;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function deploymentError(cause: unknown, fallback: string): Error {
  if (cause instanceof Error && !axios.isAxiosError(cause)) return cause;
  if (axios.isAxiosError(cause)) {
    const envelope = readApiErrorEnvelope(cause.response?.data);
    if (envelope?.error.message) return new Error(envelope.error.message);
  }
  return new Error(fallback);
}
