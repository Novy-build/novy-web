import type { DeploymentRecord } from '../entities/deployment';

/**
 * Deployment history contract. The mock implementation stores records
 * locally; Phase 7 simulates the Vercel pipeline through this interface.
 */
export interface DeploymentRepository {
  listDeployments(projectId: string): Promise<DeploymentRecord[]>;
  createDeployment(
    input: { projectId: string; status: DeploymentRecord['status']; url?: string | null; now?: Date },
  ): Promise<DeploymentRecord>;
}
