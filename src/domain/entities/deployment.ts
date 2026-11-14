export type DeploymentStatus = 'building' | 'live' | 'failed';

/** Mock target selected before publishing. */
export type DeploymentEnvironment = 'preview' | 'production';

export type DeploymentProvider = 'development' | 'vercel' | 'netlify';

/** User-facing phases of the frontend-only publish simulation. */
export type DeploymentStage = 'build' | 'optimize' | 'provision' | 'live';

export const DEPLOYMENT_STAGES: readonly DeploymentStage[] = [
  'build',
  'optimize',
  'provision',
  'live',
];

/** One publish attempt for a project. */
export interface DeploymentRecord {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  /** Live URL once published; null while building/failed. */
  url: string | null;
  appVersionId: string | null;
  environment: DeploymentEnvironment;
  provider: DeploymentProvider;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}
