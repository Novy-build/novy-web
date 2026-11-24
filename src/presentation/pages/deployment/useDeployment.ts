import { useCallback, useEffect, useRef, useState } from 'react';
import { deploymentUrl } from '@domain/deployment/deploymentUrl';
import type {
  DeploymentEnvironment,
  DeploymentProvider,
  DeploymentRecord,
} from '@domain/entities/deployment';
import { DEPLOYMENT_STAGES } from '@domain/entities/deployment';
import { validateProject } from '@domain/validation/projectValidation';
import type { Project } from '@domain/entities/project';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export type DeploymentPageStatus = 'loading' | 'ready' | 'notFound' | 'error';
export type DeploymentDataStatus = 'loading' | 'ready' | 'error';

export interface DeploymentController {
  project: Project | null;
  deployments: DeploymentRecord[];
  status: DeploymentPageStatus;
  environment: DeploymentEnvironment;
  setEnvironment: (environment: DeploymentEnvironment) => void;
  providers: DeploymentProvider[];
  provider: DeploymentProvider | null;
  setProvider: (provider: DeploymentProvider) => void;
  isPublishing: boolean;
  activeStageIndex: number | null;
  publishError: string | null;
  validationError: string | null;
  successfulDeployment: DeploymentRecord | null;
  publish: (manifest?: unknown) => Promise<void>;
  closeSuccess: () => void;
  reload: () => void;
}

/**
 * Loads one project, deployment providers, and remote or local publish history.
 * The selected repository owns provider submission and polling while this hook
 * owns validation and presentation state.
 */
export function useDeployment(
  projectId: string,
  options: {
    collections?: readonly import('@domain/entities/appData').DataCollection[];
    dataStatus?: DeploymentDataStatus;
  } = {},
): DeploymentController {
  const collections = options.collections ?? [];
  const dataStatus = options.dataStatus ?? 'ready';
  const { projects, deployments: deploymentRepository } = useRepositories();
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [status, setStatus] = useState<DeploymentPageStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);
  const [environment, setEnvironment] = useState<DeploymentEnvironment>('preview');
  const [providers, setProviders] = useState<DeploymentProvider[]>([]);
  const [provider, setProvider] = useState<DeploymentProvider | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successfulDeployment, setSuccessfulDeployment] = useState<DeploymentRecord | null>(null);
  const isMounted = useRef(true);
  const publishRun = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    let active = true;
    setStatus('loading');

    void Promise.all([
      projects.getProject(projectId),
      deploymentRepository.listDeployments(projectId),
      deploymentRepository.listProviders(),
    ]).then(
      ([loadedProject, history, availableProviders]) => {
        if (!active) {
          return;
        }
        setProject(loadedProject);
        setDeployments(history);
        setProviders(availableProviders);
        setProvider((current) =>
          current && availableProviders.includes(current)
            ? current
            : (availableProviders[0] ?? null),
        );
        setStatus(loadedProject ? 'ready' : 'notFound');
      },
      () => {
        if (active) {
          setStatus('error');
        }
      },
    );

    return () => {
      active = false;
      isMounted.current = false;
      publishRun.current += 1;
    };
  }, [deploymentRepository, projectId, projects, reloadCount]);

  // A release can keep building after the page reloads or the publish call
  // ends, so the history follows provider status until every release settles.
  const hasPendingDeployment = deployments.some((item) => item.status === 'building');
  useEffect(() => {
    if (!hasPendingDeployment || isPublishing || status !== 'ready') {
      return;
    }
    let active = true;
    const timer = window.setInterval(() => {
      void deploymentRepository.listDeployments(projectId).then((history) => {
        if (active) setDeployments(history);
      }).catch(() => {
        // Keep the last known history when a refresh fails.
      });
    }, 4_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [deploymentRepository, hasPendingDeployment, isPublishing, projectId, status]);

  const publish = useCallback(async (manifest?: unknown): Promise<void> => {
    if (!project || !provider || isPublishing) {
      return;
    }

    const run = ++publishRun.current;
    setPublishError(null);
    setValidationError(null);
    setSuccessfulDeployment(null);
    if (dataStatus !== 'ready') {
      setValidationError(
        'Deployment blocked: project data is unavailable. Retry after collection data loads.',
      );
      return;
    }
    setIsPublishing(true);

    try {
      const report = validateProject(project.document, collections);
      if (!report.isValid) {
        setValidationError(`Deployment blocked: ${report.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join(' ')}`);
        return;
      }
      const created = await deploymentRepository.publishDeployment({
        projectId: project.id,
        manifest,
        environment,
        provider,
        url: deploymentUrl(project.name, environment),
      }, (stage) => {
        if (isMounted.current && publishRun.current === run) {
          setActiveStageIndex(DEPLOYMENT_STAGES.indexOf(stage));
        }
      });
      if (!isMounted.current || publishRun.current !== run) {
        return;
      }
      setDeployments((current) => [created, ...current]);
      setSuccessfulDeployment(created);
    } catch (cause) {
      if (isMounted.current && publishRun.current === run) {
        setPublishError(
          cause instanceof Error
            ? cause.message.startsWith('Publish failed')
              ? cause.message
              : `Publish failed. ${cause.message}`
            : 'Publish failed. Your previous deployment is still live — try again.',
        );
        try {
          const history = await deploymentRepository.listDeployments(project.id);
          if (isMounted.current && publishRun.current === run) setDeployments(history);
        } catch {
          // Keep the current history when a follow-up refresh also fails.
        }
      }
    } finally {
      if (isMounted.current && publishRun.current === run) {
        setIsPublishing(false);
        setActiveStageIndex(null);
      }
    }
  }, [collections, dataStatus, deploymentRepository, environment, isPublishing, project, provider]);

  return {
    project,
    deployments,
    status,
    environment,
    setEnvironment,
    providers,
    provider,
    setProvider,
    isPublishing,
    activeStageIndex,
    publishError,
    validationError,
    successfulDeployment,
    publish,
    closeSuccess: () => setSuccessfulDeployment(null),
    reload: () => setReloadCount((current) => current + 1),
  };
}
