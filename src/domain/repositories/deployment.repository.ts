import type { DeploymentRecord, DeploymentStage } from '../entities/deployment';

export interface PublishDeploymentInput {
  projectId: string;
  url: string;
}

/**
 * Deployment history contract. The mock implementation stores records
 * locally; Phase 7 simulates the Vercel pipeline through this interface.
 */
export interface DeploymentRepository {
  listDeployments(projectId: string): Promise<DeploymentRecord[]>;
  createDeployment(
    input: { projectId: string; status: DeploymentRecord['status']; url?: string | null; now?: Date },
  ): Promise<DeploymentRecord>;
  /** Publishes while reporting provider-agnostic pipeline progress. */
  publishDeployment(
    input: PublishDeploymentInput,
    onStage: (stage: DeploymentStage) => void,
  ): Promise<DeploymentRecord>;
}
