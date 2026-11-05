export type DeploymentStatus = 'building' | 'live' | 'failed';

/** One publish attempt for a project. */
export interface DeploymentRecord {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  /** Live URL once published; null while building/failed. */
  url: string | null;
  createdAt: Date;
}
