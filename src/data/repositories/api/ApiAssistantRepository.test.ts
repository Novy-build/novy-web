import { describe, expect, it, vi } from 'vitest';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import type { ApiHttpClient, ApiHttpResponse } from '../../api/http';
import { ApiAssistantRepository, mapAssistantError, toApiBlueprint } from './ApiAssistantRepository';

const BLUEPRINT = {
  version: 1,
  summary: 'A task app.',
  design: {
    style: 'product', palette: 'indigo', typography: 'modern-sans', radius: 'soft', density: 'comfortable', fieldStyle: 'outline',
    horizontalAlignment: 'start', verticalAlignment: 'start', surface: 'plain',
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

const V2_PALETTE = {
  primary: '#111111',
  accent: '#555555',
  canvas: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  text: '#111111',
  textMuted: '#666666',
  border: '#D0D0D0',
  success: '#087f5b',
  warning: '#b45309',
  danger: '#c81e3a',
};

const V2_DESIGN_SYSTEM = {
  defaultTheme: 'light',
  lightPalette: V2_PALETTE,
  darkPalette: { ...V2_PALETTE, canvas: '#111111', surface: '#1A1A1A', text: '#FFFFFF' },
  bodyFontFamily: 'inter',
  headingFontFamily: 'inter',
  typeScale: [12, 16, 24, 32],
  spacingScale: [4, 8, 16, 24, 32],
  radiusScale: [0, 8, 16],
  rationale: 'Direct mapping with disclosed preset approximation.',
};

const V2_SCREEN_INTENT = {
  key: 'home',
  horizontalStrategy: 'start',
  verticalStrategy: 'start',
  canvas: 'plain',
  safeArea: 16,
  scrollIntent: 'vertical',
  maxContentWidth: 1200,
  referenceViewport: { width: 390, height: 780, viewportClass: 'mobile' },
  desktopBehavior: 'preserve',
  viewportFill: false,
  rootHeight: false,
  layoutGroups: [{ key: 'root', mode: 'container', gap: 16 }],
  placements: [{ componentKey: 'heading', parentKey: 'root', order: 0, alignment: 'stretch' }],
  repeatedRows: [],
  textBindings: [],
};

const RAG_BLUEPRINT = {
  ...BLUEPRINT,
  summary: 'A document chat app.',
  ragProfiles: { embedding: 'ollama-embedding', chat: 'openrouter-chat', vector: 'postgres-vector' },
  screens: [
    {
      key: 'upload',
      name: 'Upload',
      path: '/',
      components: [{ key: 'picker', type: 'file-input', label: 'Choose a document' }],
      layout: [
        {
          kind: 'group', key: 'main', layout: 'column', parentKey: null, order: 0,
          mainAxisAlignment: 'center', crossAxisAlignment: 'center', gap: 'comfortable',
          padding: 'spacious', surface: 'subtle', width: 'content',
        },
        {
          kind: 'component', key: 'place_picker', componentKey: 'picker', parentKey: 'main',
          order: 0, width: 'stretch',
        },
      ],
      workflows: [{
        key: 'ingest', name: 'Ingest', triggerComponentKey: 'picker', event: 'change',
        actions: [{ type: 'ingest-document', fileInputKey: 'picker' }],
      }],
    },
    {
      key: 'chat',
      name: 'Chat',
      path: '/chat',
      components: [{ key: 'panel', type: 'chat', title: 'Ask your document' }],
      workflows: [{
        key: 'ask', name: 'Ask', triggerComponentKey: 'panel', event: 'change',
        actions: [{ type: 'answer-with-documents', chatKey: 'panel' }],
      }],
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
    horizontalAlignment: 'start', verticalAlignment: 'start', surface: 'plain',
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
        designPipelineV2: true,
        referenceLimits: {
          maxCount: 6,
          maxBytesEach: 3_145_728,
          maxBytesTotal: 12_582_912,
          maxPixelsEach: 16_000_000,
          maxPixelsTotal: 40_000_000,
        },
        providers: [{
          provider: 'opencode', model: 'opencode/nemotron-free', modelAvailable: true,
          structuredOutput: null, imageInput: true, location: 'remote', costWarning: false,
          defaultModelId: 'nemotron-super',
          maxImages: 6,
          models: [
            {
              id: 'nemotron-super', name: 'Nemotron 3.5 Super VL',
              model: 'opencode/nemotron-3.5-super-vl-free', available: true,
              imageInput: true, location: 'remote', costWarning: false,
              usageNote: 'Free OpenCode quota.',
              maxImages: 6,
            },
            {
              id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra',
              model: 'openai/gpt-6.1-terra', available: true,
              imageInput: true, location: 'remote', costWarning: true,
              usageNote: 'Uses the connected OpenAI account.',
              maxImages: 6,
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
    expect(capabilities).toMatchObject({
      designPipelineV2: true,
      referenceLimits: { maxCount: 6 },
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
        feasibility: {
          status: 'approximate',
          summary: 'Novy can build this with 1 disclosed approximation; predicted fidelity is 88%.',
          predictedFidelity: 88,
          approximationCount: 1,
          unsupportedCount: 0,
          notices: [{
            requirement: 'Preserve the supplied custom palette.',
            impact: 'V1 uses the closest preset palette.',
            severity: 'moderate',
            safeAlternative: 'Use the closest disclosed preset.',
          }],
        },
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
      references: [],
      view: null,
      qualityMode: 'standard',
    }, { timeout: 300_000 });
    expect(proposal.preview.document.screens[0]).toMatchObject({ id: 'screen_1', path: '/' });
    expect(proposal.preview.collections[0]?.fields[0]).toMatchObject({ id: 'field_1', key: 'title' });
    expect(proposal.verification).toMatchObject({ passed: true, repairAttempts: 1 });
    expect(proposal.feasibility).toMatchObject({
      status: 'approximate', predictedFidelity: 88, approximationCount: 1,
    });
    expect(proposal.blueprint.design).toEqual(BLUEPRINT.design);
    expect(proposal.preview.document.designSystem).toEqual(PREVIEW_DESIGN_SYSTEM);
  });

  it('sends ordered V2 references without converting them to legacy images', async () => {
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: { kind: 'message', message: 'Need one more detail.' },
    });
    const repository = new ApiAssistantRepository(client(post), vi.fn());
    const references = [{
      name: 'mobile.png',
      mimeType: 'image/png' as const,
      contentBase64: 'bW9iaWxl',
      role: 'mobile-reference' as const,
      order: 0,
    }];

    await repository.generateProposal('project_1', '', { references });

    expect(post).toHaveBeenCalledWith(
      '/projects/project_1/assistant/proposals',
      expect.objectContaining({ prompt: '', images: [], references }),
      { timeout: 300_000 },
    );
  });

  it('parses document-chat blueprints with RAG widgets and profile metadata', async () => {
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        id: 'proposal_rag',
        projectId: 'project_1',
        baseRevision: 4,
        message: 'A document chat app.',
        blueprint: RAG_BLUEPRINT,
        preview: {
          schemaVersion: 14,
          designSystem: PREVIEW_DESIGN_SYSTEM,
          screens: [
            { ...PREVIEW_SCREEN, nodes: [
              { id: 'picker', type: 'file-input', x: 24, y: 220, w: 342, h: 116, props: { label: 'Choose a document', helperText: '', accept: [] } },
            ] },
            { ...PREVIEW_SCREEN, id: 'screen_chat', path: '/chat', nodes: [
              { id: 'panel', type: 'chat', x: 24, y: 24, w: 342, h: 700, props: { title: 'Ask', placeholder: '', sendLabel: 'Send', emptyText: '', showCitations: true } },
            ] },
          ],
          collections: [],
          ragProfiles: [
            { id: 'ollama-embedding', capability: 'embedding', location: 'local', costWarning: false, usageNote: 'local' },
            { id: 'openrouter-chat', capability: 'chat', location: 'remote', costWarning: true, usageNote: 'remote' },
            { id: 'postgres-vector', capability: 'vector', location: 'backend', costWarning: false, usageNote: 'backend' },
          ],
        },
        verification: VERIFICATION,
      },
    });
    const repository = new ApiAssistantRepository(client(post), vi.fn());

    const proposal = await repository.generateProposal('project_1', 'Build document chat');

    if (!('id' in proposal)) throw new Error('Expected a proposal response.');
    expect(proposal.blueprint.screens[0]?.components[0]?.type).toBe('file-input');
    expect(proposal.blueprint.screens[0]?.layout?.[0]).toMatchObject({
      kind: 'group', layout: 'column', crossAxisAlignment: 'center', surface: 'subtle',
    });
    expect(proposal.blueprint.screens[1]?.components[0]?.type).toBe('chat');
    expect(proposal.blueprint.ragProfiles?.chat).toBe('openrouter-chat');
    expect(proposal.preview.ragProfiles?.map((profile) => profile.id)).toEqual([
      'ollama-embedding', 'openrouter-chat', 'postgres-vector',
    ]);
  });

  it('parses targeted design changes', async () => {
    const blueprint = {
      ...BLUEPRINT,
      designChanges: [
        { type: 'center-horizontal', targetComponentKey: 'heading', value: 'center' },
        { type: 'chat-style', targetComponentKey: 'panel', value: 'outlined' },
      ],
      screens: [
        {
          key: 'home',
          name: 'Home',
          path: '/',
          components: [
            { key: 'heading', type: 'text', text: 'Tasks' },
            { key: 'panel', type: 'chat', title: 'Chat' },
          ],
          workflows: [],
        },
      ],
    };
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        id: 'proposal_design',
        projectId: 'project_1',
        baseRevision: 1,
        message: 'Design changes',
        blueprint,
        preview: {
          schemaVersion: 14,
          designSystem: PREVIEW_DESIGN_SYSTEM,
          screens: [PREVIEW_SCREEN],
          collections: [],
        },
        verification: VERIFICATION,
      },
    });

    const proposal = await new ApiAssistantRepository(client(post), vi.fn()).generateProposal(
      'project_1',
      'Center the heading',
    );

    if (!('id' in proposal)) throw new Error('Expected a proposal response.');
    expect(proposal.blueprint.designChanges).toEqual(blueprint.designChanges);
  });

  it('preserves chat styling on a blueprint', async () => {
    const chatStyle = {
      headerTone: 'primary',
      bubbleRadius: 'pill',
      userBubbleTone: 'accent',
      assistantBubbleTone: 'surface-elevated',
      composerTone: 'canvas',
      sendVariant: 'outline',
      border: 'outlined',
      spacing: 'spacious',
      citationsTone: 'primary',
    };
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        id: 'proposal_chat_style',
        projectId: 'project_1',
        baseRevision: 1,
        message: 'Styled chat',
        blueprint: {
          ...BLUEPRINT,
          screens: [{
            ...BLUEPRINT.screens[0],
            components: [{ key: 'panel', type: 'chat', title: 'Ask', style: chatStyle }],
          }],
        },
        preview: {
          schemaVersion: 14,
          designSystem: PREVIEW_DESIGN_SYSTEM,
          screens: [PREVIEW_SCREEN],
          collections: [],
        },
        verification: VERIFICATION,
      },
    });

    const proposal = await new ApiAssistantRepository(client(post), vi.fn()).generateProposal(
      'project_1',
      'Style the chat',
    );

    if (!('id' in proposal)) throw new Error('Expected a proposal response.');
    expect(proposal.blueprint.screens[0]?.components[0]?.style).toEqual(chatStyle);
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
      references: [],
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

  it('maps a blocking feasibility gap separately from malformed model output', () => {
    const error = mapAssistantError({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: 'assistant_feasibility_blocked',
            message: 'Novy found one blocking fidelity gap; no app proposal was generated.',
            details: { issues: [{ message: 'Interactive maps are unsupported.' }] },
          },
        },
      },
    });

    expect(error.code).toBe('feasibility-blocked');
    expect(error.details).toEqual({ issues: [{ message: 'Interactive maps are unsupported.' }] });
  });

  it('parses V2 blueprints and round-trips the design system for acceptance', async () => {
    const v2Blueprint = {
      ...BLUEPRINT,
      version: 2,
      designSystem: V2_DESIGN_SYSTEM,
      screenIntents: [V2_SCREEN_INTENT],
      seedRecords: { tasks: [{ values: { title: 'Plan the week' } }] },
      rationale: 'Direct mapping with disclosed preset approximation.',
    };
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        id: 'proposal_v2',
        projectId: 'project_1',
        baseRevision: 4,
        message: 'A V2 task app.',
        blueprint: v2Blueprint,
        preview: {
          schemaVersion: 14,
          screens: [PREVIEW_SCREEN],
          collections: [],
          seedRecords: { tasks: [{ values: { title: 'Plan the week', done: false } }] },
        },
        verification: VERIFICATION,
        seedRecordCount: 1,
        seedExclusions: ['tasks.api_key was excluded from automatic seeding.'],
        deferredIntent: ['defaultTheme'],
        qualityMode: 'high-fidelity',
        stageTrace: [
          { id: 'reference-analysis', status: 'passed', attempts: 1, repaired: false },
          { id: 'v2-blueprint', status: 'repaired', attempts: 2, repaired: true },
        ],
      },
    });
    const repository = new ApiAssistantRepository(client(post), vi.fn());

    const proposal = await repository.generateProposal('project_1', 'Build tasks');
    if (!('id' in proposal)) throw new Error('Expected a proposal response.');
    expect(proposal.blueprint.version).toBe(2);
    expect(proposal.seedRecordCount).toBe(1);
    expect(proposal.qualityMode).toBe('high-fidelity');
    expect(proposal.stageTrace).toEqual([
      { id: 'reference-analysis', status: 'passed', attempts: 1, repaired: false },
      { id: 'v2-blueprint', status: 'repaired', attempts: 2, repaired: true },
    ]);
    expect(proposal.seedExclusions).toEqual(['tasks.api_key was excluded from automatic seeding.']);
    expect(proposal.preview.seedRecords).toEqual({
      tasks: [{ values: { title: 'Plan the week', done: false } }],
    });
    expect(proposal.deferredIntent).toEqual(['defaultTheme']);
    if (proposal.blueprint.version !== 2) throw new Error('Expected a V2 blueprint.');
    expect(proposal.blueprint.designSystemIntent.lightPalette.primary).toBe('#111111');
    expect(toApiBlueprint(proposal.blueprint)).toMatchObject({
      version: 2,
      designSystem: V2_DESIGN_SYSTEM,
    });

    await repository.acceptProposal('project_1', proposal);
    expect(post).toHaveBeenLastCalledWith(
      '/projects/project_1/assistant/proposals/proposal_v2/accept',
      { baseRevision: 4, blueprint: expect.objectContaining({ version: 2, designSystem: V2_DESIGN_SYSTEM }) },
      { headers: { 'If-Match': '"4"' } },
    );
  });

  it('posts memory-only render captures and parses reviewed visual metadata', async () => {
    const reviewedProposal = {
      id: 'proposal_v2',
      projectId: 'project_1',
      baseRevision: 4,
      message: 'A reviewed V2 task app.',
      blueprint: { ...BLUEPRINT, version: 2, designSystem: V2_DESIGN_SYSTEM, screenIntents: [V2_SCREEN_INTENT], seedRecords: {}, rationale: 'Reviewed.' },
      preview: { schemaVersion: 14, screens: [PREVIEW_SCREEN], collections: [] },
      verification: VERIFICATION,
      qualityMode: 'high-fidelity',
      quality: {
        passed: true,
        label: 'verified-high-fidelity',
        overallScore: 91,
        categoryScores: { composition: 95 },
        issueCounts: { total: 0 },
      },
      visualReview: {
        required: true,
        status: 'reviewed',
        qualityStatus: 'reviewed',
        captureRequests: [{ screenKey: 'home', viewport: 'mobile' }],
        score: 88,
        categoryScores: [{ category: 'layout', score: 90, note: 'Close.' }],
        approximations: ['Icons approximated.'],
        summary: 'Good match.',
      },
    };
    const post = vi.fn().mockResolvedValue({ status: 200, data: reviewedProposal });
    const repository = new ApiAssistantRepository(client(post), vi.fn());
    const proposal = {
      id: 'proposal_v2',
      projectId: 'project_1',
      baseRevision: 4,
      message: 'A V2 task app.',
      blueprint: reviewedProposal.blueprint,
      preview: { schemaVersion: 14 as const, document: { screens: [] }, collections: [] },
    } as unknown as AssistantProposalV1;
    const captures = [{
      screenKey: 'home',
      viewport: 'mobile' as const,
      name: 'home_mobile.png',
      mimeType: 'image/png' as const,
      contentBase64: 'aGVsbG8=',
      order: 0,
    }];

    const result = await repository.visualReview('project_1', proposal, {
      captures,
      references: [{ name: 'ref.png', mimeType: 'image/png', contentBase64: 'cmVm', role: 'design-reference', order: 0 }],
    });

    expect(post).toHaveBeenCalledWith(
      '/projects/project_1/assistant/proposals/proposal_v2/visual-review',
      expect.objectContaining({ qualityMode: 'high-fidelity', captures, baseRevision: 4 }),
      { timeout: 300_000 },
    );
    expect(result.visualReview).toMatchObject({
      status: 'reviewed',
      qualityStatus: 'reviewed',
      score: 88,
    });
    expect(result.quality).toMatchObject({ label: 'verified-high-fidelity', overallScore: 91 });
  });
});

