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

/**
 * One project's publishing summary. Active is derived from the existence of a
 * live deployment rather than a mutable flag, so it always reflects history.
 */
export interface PublishedApplication {
  projectId: string;
  projectName: string;
  active: boolean;
  /** Status of the most recent deployment attempt. */
  status: DeploymentStatus;
  /** URL of the most recent live deployment, if any. */
  url: string | null;
  environment: DeploymentEnvironment | null;
  provider: DeploymentProvider | null;
  lastPublishedAt: Date;
  deploymentCount: number;
}
