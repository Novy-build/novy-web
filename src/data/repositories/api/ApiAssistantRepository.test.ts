import { describe, expect, it, vi } from 'vitest';
import type { ApiHttpClient, ApiHttpResponse } from '../../api/http';
import { ApiAssistantRepository, mapAssistantError } from './ApiAssistantRepository';

const BLUEPRINT = {
  version: 1,
  summary: 'A task app.',
  design: {
    style: 'product', palette: 'indigo', typography: 'modern-sans', radius: 'soft', density: 'comfortable', fieldStyle: 'outline',
  },
  screens: [
    {
      key: 'home',
      name: 'Home',
      path: '/',
      components: [{ key: 'heading', type: 'text', text: 'Tasks', level: 'title' }],
      workflows: [],
    },
  ],
  collections: [
    {
      key: 'tasks',
      name: 'Tasks',
      fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
    },
  ],
};

const PREVIEW_SCREEN = {
  id: 'screen_1',
  name: 'Home',
  path: '/',
  nodes: [],
  behaviors: [],
  logicGraphs: [],
};

const PREVIEW_DESIGN_SYSTEM = {
  colors: {}, darkColors: {}, typography: {}, radii: {}, styles: [],
};

const VERIFICATION = {
  passed: true,
  repairAttempts: 1,
  stages: [
    { id: 'contract', label: 'Project contract', passed: true },
    { id: 'responsive', label: 'Responsive layout', passed: true },
    { id: 'navigation', label: 'Routes and navigation', passed: true },
    { id: 'workflows', label: 'Workflow simulation', passed: true },
  ],
  viewports: [
    { id: 'mobile', width: 390, height: 780, passed: true },
    { id: 'tablet', width: 768, height: 1024, passed: true },
    { id: 'desktop', width: 1200, height: 800, passed: true },
  ],
  issues: [],
};

const ROUTE_BOUND_BLUEPRINT = {
  version: 1,
  summary: 'A notes app.',
  design: {
    style: 'product', palette: 'slate', typography: 'modern-sans', radius: 'soft', density: 'compact', fieldStyle: 'outline',
  },
  screens: [
    {
      key: 'home',
      name: 'Home',
      path: '/',
      components: [{ key: 'notes', type: 'list', collectionKey: 'notes' }],
      workflows: [],
      routeParameters: [],
      recordFields: [],
    },
    {
      key: 'detail',
      name: 'Note detail',
      path: '/notes/:noteId',
      components: [{ key: 'heading', type: 'text', text: 'Note' }],
      workflows: [],
      routeParameters: [{ name: 'noteId', collectionKey: 'notes' }],
      recordFields: [
        { key: 'title', name: 'Title', fieldKey: 'title' },
        { key: 'body', name: null, fieldKey: 'body' },
      ],
    },
  ],
  collections: [{
    key: 'notes',
    name: 'Notes',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'text', required: true },
    ],
  }],
};

function client(post: ApiHttpClient['post']): ApiHttpClient {
  const unused = vi.fn<() => Promise<ApiHttpResponse>>();
  return { get: unused, post, put: unused, patch: unused, delete: unused };
}

describe('ApiAssistantRepository', () => {
  it('maps provider capabilities for the composer selector', async () => {
    const get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        defaultProviderId: 'opencode',
        helpRetrievalAvailable: true,
        providers: [{
          provider: 'opencode', model: 'opencode/nemotron-free', modelAvailable: true,
          structuredOutput: null, imageInput: true, location: 'remote', costWarning: false,
          defaultModelId: 'nemotron-super',
          models: [
            {
              id: 'nemotron-super', name: 'Nemotron 3.5 Super VL',
              model: 'opencode/nemotron-3.5-super-vl-free', available: true,
              imageInput: true, location: 'remote', costWarning: false,
              usageNote: 'Free OpenCode quota.',
            },
            {
              id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra',
              model: 'openai/gpt-6.1-terra', available: true,
              imageInput: true, location: 'remote', costWarning: true,
              usageNote: 'Uses the connected OpenAI account.',
            },
          ],
        }],
      },
    });
    const unused = vi.fn<() => Promise<ApiHttpResponse>>();
    const repository = new ApiAssistantRepository(
      { get, post: unused, put: unused, patch: unused, delete: unused },
      vi.fn(),
    );

    const capabilities = await repository.getCapabilities();

    expect(get).toHaveBeenCalledWith('/assistant/capabilities');
    expect(capabilities.providers[0]).toMatchObject({
      id: 'opencode', available: true, imageInput: true, location: 'remote',
    });
    expect(capabilities.providers[0]?.models[1]).toMatchObject({
      id: 'gpt-6.1-terra', available: true, costWarning: true,
    });
  });

  it('maps a structured proposal preview without changing the project', async () => {
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        id: 'proposal_1',
        projectId: 'project_1',
        baseRevision: 4,
        message: 'A task app.',
        blueprint: BLUEPRINT,
        preview: {
          schemaVersion: 13,
          designSystem: PREVIEW_DESIGN_SYSTEM,
          screens: [PREVIEW_SCREEN],
          collections: [
            {
              id: 'collection_1',
              name: 'Tasks',
              fields: [{ id: 'field_1', key: 'title', label: 'Title', type: 'text', required: true }],
            },
          ],
        },
        verification: VERIFICATION,
      },
    });
    const repository = new ApiAssistantRepository(client(post), vi.fn());

    const proposal = await repository.generateProposal('project_1', 'Build tasks');

    expect('id' in proposal).toBe(true);
    if (!('id' in proposal)) throw new Error('Expected a proposal response.');
    expect(post).toHaveBeenCalledWith('/projects/project_1/assistant/proposals', {
      prompt: 'Build tasks',
      conversation: [],
      draftBlueprint: null,
      providerId: null,
      modelId: null,
      images: [],
    }, { timeout: 300_000 });
    expect(proposal.preview.document.screens[0]).toMatchObject({ id: 'screen_1', path: '/' });
    expect(proposal.preview.collections[0]?.fields[0]).toMatchObject({ id: 'field_1', key: 'title' });
    expect(proposal.verification).toMatchObject({ passed: true, repairAttempts: 1 });
    expect(proposal.blueprint.design).toEqual(BLUEPRINT.design);
    expect(proposal.preview.document.designSystem).toEqual(PREVIEW_DESIGN_SYSTEM);
  });

  it('maps a build-mode greeting without creating a proposal preview', async () => {
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: { kind: 'message', message: "Hi! Describe the app you'd like to build." },
    });
    const repository = new ApiAssistantRepository(client(post), vi.fn());

    const result = await repository.generateProposal('project_1', 'hi');

    expect(result).toEqual({
      kind: 'message',
      message: "Hi! Describe the app you'd like to build.",
    });
  });

  it('maps grounded help answers and citations', async () => {
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        answer: 'Autosave is revision checked. [S1]',
        insufficientContext: false,
        sources: [{
          reference: 'S1',
          title: 'PD6 traceability',
          uri: 'novy-web/docs/pd6-traceability.md',
          heading: 'Persistence',
          page: null,
        }],
      },
    });
    const repository = new ApiAssistantRepository(client(post), vi.fn());

    const answer = await repository.answerHelp('project_1', 'How does autosave work?');

    expect(post).toHaveBeenCalledWith('/projects/project_1/assistant/help', {
      prompt: 'How does autosave work?',
      conversation: [],
      providerId: null,
      modelId: null,
      images: [],
    }, { timeout: 300_000 });
    expect(answer.sources[0]).toMatchObject({ reference: 'S1', heading: 'Persistence' });
  });

  it('accepts with the proposal revision and adopts the returned project', async () => {
    const responseProject = { id: 'project_1' };
    const post = vi.fn().mockResolvedValue({ status: 200, data: responseProject });
    const adopt = vi.fn().mockReturnValue({ id: 'project_1', document: { screens: [] } });
    const repository = new ApiAssistantRepository(client(post), adopt);
    const proposal = await new ApiAssistantRepository(
      client(vi.fn().mockResolvedValue({
        status: 200,
        data: {
          id: 'proposal_1', projectId: 'project_1', baseRevision: 4, message: 'A task app.',
          blueprint: BLUEPRINT,
          preview: { schemaVersion: 13, screens: [PREVIEW_SCREEN], collections: [] },
          verification: VERIFICATION,
        },
      })),
      vi.fn(),
    ).generateProposal('project_1', 'Build tasks');
    if (!('id' in proposal)) throw new Error('Expected a proposal response.');

    await repository.acceptProposal('project_1', proposal);

    expect(post).toHaveBeenCalledWith(
      '/projects/project_1/assistant/proposals/proposal_1/accept',
      { baseRevision: 4, blueprint: proposal.blueprint },
      { headers: { 'If-Match': '"4"' } },
    );
    expect(adopt).toHaveBeenCalledWith(responseProject);
  });

  it('preserves route bindings and record fields from preview through apply', async () => {
    const responseProject = { id: 'project_1' };
    const post = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        data: {
          id: 'proposal_route_bound',
          projectId: 'project_1',
          baseRevision: 7,
          message: 'A notes app.',
          blueprint: ROUTE_BOUND_BLUEPRINT,
          preview: { schemaVersion: 13, screens: [PREVIEW_SCREEN], collections: [] },
          verification: VERIFICATION,
        },
      })
      .mockResolvedValueOnce({ status: 200, data: responseProject });
    const adopt = vi.fn().mockReturnValue({ id: 'project_1', document: { screens: [] } });
    const repository = new ApiAssistantRepository(client(post), adopt);

    const proposal = await repository.generateProposal('project_1', 'Build notes');
    if (!('id' in proposal)) throw new Error('Expected a proposal response.');
    expect(proposal.blueprint).toEqual(ROUTE_BOUND_BLUEPRINT);

    await repository.acceptProposal('project_1', proposal);

    expect(post).toHaveBeenLastCalledWith(
      '/projects/project_1/assistant/proposals/proposal_route_bound/accept',
      { baseRevision: 7, blueprint: ROUTE_BOUND_BLUEPRINT },
      { headers: { 'If-Match': '"7"' } },
    );
  });

  it('distinguishes provider unavailability from a backend network failure', () => {
    const provider = mapAssistantError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'assistant_provider_unavailable',
            message: 'The local model is unavailable.',
            details: null,
          },
          requestId: 'request_1',
        },
      },
    });
    const network = mapAssistantError({ isAxiosError: true });

    expect(provider.code).toBe('unavailable');
    expect(network.code).toBe('network');
  });

  it('maps an exhausted provider quota separately from connectivity failures', () => {
    const error = mapAssistantError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'assistant_provider_quota_exceeded',
            message: 'The selected assistant model has reached its usage quota.',
            details: { retryAfterSeconds: 60 },
          },
        },
      },
    });

    expect(error.code).toBe('quota-exceeded');
    expect(error.details).toEqual({ retryAfterSeconds: 60 });
  });

  it('maps a backend model deadline separately from connectivity failures', () => {
    const error = mapAssistantError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'assistant_provider_timeout',
            message: 'The selected AI assistant model took too long to finish.',
            details: null,
          },
        },
      },
    });

    expect(error.code).toBe('timeout');
  });

  it('maps proposal-integrity rejection separately from model validation', () => {
    const error = mapAssistantError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'invalid_assistant_proposal',
            message: 'The assistant proposal is invalid or has been changed.',
            details: null,
          },
        },
      },
    });

    expect(error.code).toBe('invalid-proposal');
  });

  it('maps an apply persistence failure separately from backend connectivity', () => {
    const error = mapAssistantError({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error: {
            code: 'assistant_acceptance_failed',
            message: 'The assistant proposal could not be applied. Your project was not changed.',
            details: null,
          },
        },
      },
    });

    expect(error.code).toBe('apply-failed');
    expect(error.code).not.toBe('network');
  });
});

