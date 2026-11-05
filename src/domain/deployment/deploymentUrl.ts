import type { DeploymentEnvironment } from '../entities/deployment';

/** Converts a project name into a stable, URL-safe Novy subdomain. */
export function toDeploymentSlug(projectName: string): string {
  const slug = projectName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');

  return slug || 'untitled-project';
}

/** Fake live URL used by the mock publisher; production keeps the requested `{slug}.novy.app` shape. */
export function deploymentUrl(projectName: string, environment: DeploymentEnvironment): string {
  const slug = toDeploymentSlug(projectName);
  const subdomain = environment === 'preview' ? `${slug}-preview` : slug;
  return `https://${subdomain}.novy.app`;
}
