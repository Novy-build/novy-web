import type { AuthRepository } from '@domain/repositories/auth.repository';
import type { AssistantRepository } from '@domain/repositories/assistant.repository';
import type { AppDataRepository } from '@domain/repositories/appData.repository';
import type { DeploymentRepository } from '@domain/repositories/deployment.repository';
import type { ProjectImportRepository } from '@domain/repositories/projectImport.repository';
import type { ProjectRepository } from '@domain/repositories/project.repository';
import type { ReactExportRepository } from '@domain/repositories/reactExport.repository';
import type { TemplateRepository } from '@domain/repositories/template.repository';
import { TEMPLATE_CATALOG } from '../../templates/templateCatalog';
import { LocalAuthRepository } from './LocalAuthRepository';
import { LocalStorageAppDataRepository } from './LocalStorageAppDataRepository';
import { LocalStorageDeploymentRepository } from './LocalStorageDeploymentRepository';
import { LocalStorageProjectRepository } from './LocalStorageProjectRepository';
import { StaticTemplateRepository } from './StaticTemplateRepository';
import { UnavailableAssistantRepository } from './UnavailableAssistantRepository';
import { UnavailableReactExportRepository } from './UnavailableReactExportRepository';

/**
 * The set of repositories injected through the presentation layer.
 * Bootstrap (main/) owns this composition; swap any member for the API-backed
 * implementation when the backend lands.
 */
export interface Repositories {
  auth: AuthRepository;
  assistant: AssistantRepository;
  projects: ProjectRepository;
  templates: TemplateRepository;
  deployments: DeploymentRepository;
  appData: AppDataRepository;
  reactExport: ReactExportRepository;
  /**
   * Present only when browser-local projects can be migrated into the
   * authenticated backend account. Local-only compositions omit it.
   */
  localProjectImport?: ProjectImportRepository;
}

export interface LocalRepositoriesOptions {
  /** Simulated network latency in ms (0 in tests; feels real in the browser). */
  latencyMs?: number;
}

/** Composes the frontend-only localStorage repositories. */
export function createLocalRepositories(options?: LocalRepositoriesOptions): Repositories {
  const latencyMs = options?.latencyMs;
  return {
    auth: new LocalAuthRepository(window.localStorage, { delayMs: latencyMs }),
    assistant: new UnavailableAssistantRepository(),
    projects: new LocalStorageProjectRepository(window.localStorage, { latencyMs }),
    templates: new StaticTemplateRepository([...TEMPLATE_CATALOG], latencyMs ?? 120),
    deployments: new LocalStorageDeploymentRepository(window.localStorage, { latencyMs }),
    appData: new LocalStorageAppDataRepository(window.localStorage, { latencyMs }),
    reactExport: new UnavailableReactExportRepository(),
  };
}
