/** DTO shared by the backend deployment API and backward-compatible local history. */
export interface DeploymentRecordDTO {
  id: string;
  projectId: string;
  status: 'building' | 'live' | 'failed';
  url: string | null;
  appVersionId?: string | null;
  environment?: 'preview' | 'production';
  provider?: 'development' | 'vercel' | 'netlify';
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
}

/** localStorage bucket shape used when no backend is configured. */
export interface DeploymentCollectionDTO {
  deployments: DeploymentRecordDTO[];
}

export interface DeploymentProvidersDTO {
  providers: Array<'development' | 'vercel' | 'netlify'>;
}

/** Builder-wide publishing summary returned by the backend. */
export interface PublishedApplicationDTO {
  projectId: string;
  projectName: string;
  active: boolean;
  status: 'building' | 'live' | 'failed';
  url: string | null;
  environment?: 'preview' | 'production' | null;
  provider?: 'development' | 'vercel' | 'netlify' | null;
  lastPublishedAt: string;
  deploymentCount: number;
}

export interface PublishedApplicationListDTO {
  applications: PublishedApplicationDTO[];
}
