import type { AuthRepository } from '@domain/repositories/auth.repository';
import type { AssistantRepository } from '@domain/repositories/assistant.repository';
import type { AppDataRepository } from '@domain/repositories/appData.repository';
import type { DeploymentRepository } from '@domain/repositories/deployment.repository';
import type { ProjectImportRepository } from '@domain/repositories/projectImport.repository';
import type { ProjectRepository } from '@domain/repositories/project.repository';
import type { RagRepository } from '@domain/repositories/rag.repository';
import type { ReactExportRepository } from '@domain/repositories/reactExport.repository';
import type { TemplateRepository } from '@domain/repositories/template.repository';
import type { RuntimePreviewRepository } from '@domain/repositories/runtimePreview.repository';
import { TEMPLATE_CATALOG } from '../../templates/templateCatalog';
import { LocalAuthRepository } from './LocalAuthRepository';
import { LocalStorageAppDataRepository } from './LocalStorageAppDataRepository';
import { LocalStorageDeploymentRepository } from './LocalStorageDeploymentRepository';
import { LocalStorageProjectRepository } from './LocalStorageProjectRepository';
import { LocalRagRepository } from './LocalRagRepository';
import { StaticTemplateRepository } from './StaticTemplateRepository';
import { UnavailableAssistantRepository } from './UnavailableAssistantRepository';
import { UnavailableReactExportRepository } from './UnavailableReactExportRepository';
import { UnavailableRuntimePreviewRepository } from './UnavailableRuntimePreviewRepository';

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
  /** Backend-owned RAG connection profiles and project file sources. */
  rag: RagRepository;
  runtimePreview: RuntimePreviewRepository;
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
  const projects = new LocalStorageProjectRepository(window.localStorage, { latencyMs });
  return {
    auth: new LocalAuthRepository(window.localStorage, { delayMs: latencyMs }),
    assistant: new UnavailableAssistantRepository(),
    projects,
    templates: new StaticTemplateRepository([...TEMPLATE_CATALOG], latencyMs ?? 120),
    deployments: new LocalStorageDeploymentRepository(window.localStorage, {
      latencyMs,
      listProjectNames: async () =>
        (await projects.listProjects()).map((project) => ({
          id: project.id,
          name: project.name,
        })),
    }),
    appData: new LocalStorageAppDataRepository(window.localStorage, { latencyMs }),
    reactExport: new UnavailableReactExportRepository(),
    rag: new LocalRagRepository(latencyMs ?? 0),
    runtimePreview: new UnavailableRuntimePreviewRepository(),
  };
}
