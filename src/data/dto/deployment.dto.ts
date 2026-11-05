/** DTO mirroring the future API deployment payload. */
export interface DeploymentRecordDTO {
  id: string;
  projectId: string;
  status: 'building' | 'live' | 'failed';
  url: string | null;
  createdAt: string;
}

/** localStorage bucket shape. */
export interface DeploymentCollectionDTO {
  deployments: DeploymentRecordDTO[];
}
