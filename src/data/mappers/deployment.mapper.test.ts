import { describe, expect, it } from 'vitest';
import type { PublishedApplicationDTO } from '../dto/deployment.dto';
import { mapPublishedApplicationFromDto } from './deployment.mapper';

const DTO: PublishedApplicationDTO = {
  projectId: 'project_1',
  projectName: 'Live App',
  active: true,
  status: 'live',
  url: 'https://live.novy.app',
  environment: 'production',
  provider: 'vercel',
  lastPublishedAt: '2026-11-20T10:00:00.000Z',
  deploymentCount: 3,
};

describe('deployment mapper', () => {
  it('maps a published application DTO into a domain entity', () => {
    const application = mapPublishedApplicationFromDto(DTO);

    expect(application).toEqual({
      projectId: 'project_1',
      projectName: 'Live App',
      active: true,
      status: 'live',
      url: 'https://live.novy.app',
      environment: 'production',
      provider: 'vercel',
      lastPublishedAt: new Date('2026-11-20T10:00:00.000Z'),
      deploymentCount: 3,
    });
    expect(application.lastPublishedAt).toBeInstanceOf(Date);
  });

  it('normalizes omitted optional transport fields to null', () => {
    const application = mapPublishedApplicationFromDto({
      ...DTO,
      active: false,
      status: 'failed',
      url: null,
      environment: null,
      provider: null,
    });

    expect(application.active).toBe(false);
    expect(application.environment).toBeNull();
    expect(application.provider).toBeNull();
    expect(application.url).toBeNull();
  });
});
