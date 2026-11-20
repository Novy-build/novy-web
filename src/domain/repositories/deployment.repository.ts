import type {
  DeploymentEnvironment,
  DeploymentProvider,
  DeploymentRecord,
  DeploymentStage,
  PublishedApplication,
} from '../entities/deployment';

export interface PublishDeploymentInput {
  projectId: string;
  manifest?: unknown;
  environment?: DeploymentEnvironment;
  provider?: DeploymentProvider;
  /** Local mock URL. API repositories ignore this value. */
  url?: string;
}

/**
 * Provider-neutral publishing contract implemented by both the backend API
 * repository and the local side-effect-free development repository.
 */
export interface DeploymentRepository {
  listProviders(): Promise<DeploymentProvider[]>;
  /** One row per project with deployment history, newest activity first. */
  listPublishedApplications(): Promise<PublishedApplication[]>;
  listDeployments(projectId: string): Promise<DeploymentRecord[]>;
  getDeployment(projectId: string, deploymentId: string): Promise<DeploymentRecord>;
  createDeployment(
    input: { projectId: string; status: DeploymentRecord['status']; url?: string | null; now?: Date },
  ): Promise<DeploymentRecord>;
  /** Publishes while reporting provider-agnostic pipeline progress. */
  publishDeployment(
    input: PublishDeploymentInput,
    onStage: (stage: DeploymentStage) => void,
  ): Promise<DeploymentRecord>;
}
