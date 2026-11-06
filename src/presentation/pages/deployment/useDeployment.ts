import { useCallback, useEffect, useRef, useState } from 'react';
import { deploymentUrl } from '@domain/deployment/deploymentUrl';
import type {
  DeploymentEnvironment,
  DeploymentRecord,
} from '@domain/entities/deployment';
import { DEPLOYMENT_STAGES } from '@domain/entities/deployment';
import { validateProject } from '@domain/validation/projectValidation';
import type { Project } from '@domain/entities/project';
import { useRepositories } from '@main/providers/RepositoriesProvider';

export type DeploymentPageStatus = 'loading' | 'ready' | 'notFound' | 'error';

export interface DeploymentController {
  project: Project | null;
  deployments: DeploymentRecord[];
  status: DeploymentPageStatus;
  environment: DeploymentEnvironment;
  setEnvironment: (environment: DeploymentEnvironment) => void;
  isPublishing: boolean;
  activeStageIndex: number | null;
  publishError: string | null;
  validationError: string | null;
  successfulDeployment: DeploymentRecord | null;
  publish: () => Promise<void>;
  closeSuccess: () => void;
  reload: () => void;
}

/**
 * Loads one project and its deployment history, then orchestrates the mock
 * Build → Optimize → Provision → Live pipeline. Persistence remains behind
 * repository contracts; replacing localStorage with an API does not affect
 * the page.
 */
export function useDeployment(
  projectId: string,
  options: { collections?: readonly import('@domain/entities/appData').DataCollection[] } = {},
): DeploymentController {
  const collections = options.collections ?? [];
  const { projects, deployments: deploymentRepository } = useRepositories();
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [status, setStatus] = useState<DeploymentPageStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);
  const [environment, setEnvironment] = useState<DeploymentEnvironment>('preview');
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
    ]).then(
      ([loadedProject, history]) => {
        if (!active) {
          return;
        }
        setProject(loadedProject);
        setDeployments(history);
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

  const publish = useCallback(async (): Promise<void> => {
    if (!project || isPublishing) {
      return;
    }

    const run = ++publishRun.current;
    setPublishError(null);
    setValidationError(null);
    setSuccessfulDeployment(null);
    setIsPublishing(true);

    try {
      const report = validateProject(project.document, collections);
      if (!report.isValid) {
        setValidationError(`Deployment blocked: ${report.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join(' ')}`);
        return;
      }
      const created = await deploymentRepository.publishDeployment({
        projectId: project.id,
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
    } catch {
      if (isMounted.current && publishRun.current === run) {
        setPublishError('Publish failed. Your previous deployment is still live — try again.');
      }
    } finally {
      if (isMounted.current && publishRun.current === run) {
        setIsPublishing(false);
        setActiveStageIndex(null);
      }
    }
  }, [collections, deploymentRepository, environment, isPublishing, project]);

  return {
    project,
    deployments,
    status,
    environment,
    setEnvironment,
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
