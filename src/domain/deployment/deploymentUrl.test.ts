import { describe, expect, it } from 'vitest';
import { deploymentUrl, toDeploymentSlug } from './deploymentUrl';

describe('deployment URLs', () => {
  it('turns project names into clean subdomains', () => {
    expect(toDeploymentSlug('  Café Student Portal!  ')).toBe('cafe-student-portal');
    expect(toDeploymentSlug('---')).toBe('untitled-project');
  });

  it('builds production and clearly marked preview URLs', () => {
    expect(deploymentUrl('Student Portal', 'production')).toBe('https://student-portal.novy.app');
    expect(deploymentUrl('Student Portal', 'preview')).toBe(
      'https://student-portal-preview.novy.app',
    );
  });
});
