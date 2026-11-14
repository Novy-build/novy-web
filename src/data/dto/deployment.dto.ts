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
