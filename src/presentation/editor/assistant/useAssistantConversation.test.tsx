import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AssistantProposalV1, AssistantReferenceAttachment } from '@domain/entities/assistant';
import { AssistantError } from '@domain/errors/AssistantError';
import type { Project } from '@domain/entities/project';
import { createLocalRepositories, type Repositories } from '@data/repositories/local';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { createEditorState } from '../state/editorState';
import { useAssistantConversation } from './useAssistantConversation';

const DOCUMENT = {
  screens: [{ id: 'screen_1', name: 'Home', path: '/', nodes: [], behaviors: [], logicGraphs: [] }],
};

const PROPOSAL: AssistantProposalV1 = {
  id: 'proposal_1',
  projectId: 'project_1',
  baseRevision: 1,
  message: 'A generated app.',
  blueprint: {
    version: 1,
    summary: 'A generated app.',
    design: { style: 'product', palette: 'indigo', typography: 'modern-sans', radius: 'soft', density: 'comfortable', fieldStyle: 'outline' },
    screens: [{
      key: 'home', name: 'Home', path: '/',
      components: [{ key: 'heading', type: 'text', text: 'Generated' }],
      workflows: [],
    }],
    collections: [],
  },
  preview: { schemaVersion: 13, document: DOCUMENT, collections: [] },
};

const ACCEPTED_PROJECT: Project = {
  id: 'project_1',
  name: 'Project',
  projectType: 'app',
  createdAt: new Date('2026-11-15T00:00:00Z'),
  updatedAt: new Date('2026-11-15T00:00:01Z'),
  document: DOCUMENT,
};

const CAPABILITIES = {
  defaultProviderId: 'opencode',
  helpRetrievalAvailable: true,
  designPipelineV2: false,
  referenceLimits: {
    maxCount: 1,
    maxBytesEach: 3_145_728,
    maxBytesTotal: 3_145_728,
    maxPixelsEach: 16_000_000,
    maxPixelsTotal: 16_000_000,
  },
  providers: [{
    id: 'opencode', model: 'nemotron-free', available: true,
    imageInput: true, location: 'remote', costWarning: false,
    defaultModelId: 'nemotron-super',
    maxImages: 1,
    models: [{
      id: 'nemotron-super', name: 'Nemotron 3.5 Super VL', model: 'opencode/nemotron',
      available: true, imageInput: true, location: 'remote', costWarning: false,
      usageNote: 'Free OpenCode quota.',
      maxImages: 1,
    }],
  }],
};

const V2_CAPABILITIES = {
  ...CAPABILITIES,
  designPipelineV2: true,
  referenceLimits: {
    ...CAPABILITIES.referenceLimits,
    maxCount: 6,
    maxBytesTotal: 12_582_912,
    maxPixelsTotal: 40_000_000,
  },
  providers: CAPABILITIES.providers.map((provider) => ({
    ...provider,
    maxImages: 6,
    models: provider.models.map((model) => ({ ...model, maxImages: 6 })),
  })),
};

const REFERENCE: AssistantReferenceAttachment = {
  name: 'mobile.png',
  mimeType: 'image/png',
  contentBase64: 'bW9iaWxl',
  role: 'mobile-reference',
  order: 0,
};

function setup(
  hasUnsavedChanges = false,
  initialCapabilitiesError?: unknown,
  capabilities = CAPABILITIES,
  generatedProposal: AssistantProposalV1 = PROPOSAL,
  reviewedProposal: AssistantProposalV1 = PROPOSAL,
) {
  const getCapabilities = vi.fn().mockResolvedValue(capabilities);
  if (initialCapabilitiesError !== undefined) {
    getCapabilities.mockReset();
    getCapabilities.mockRejectedValueOnce(initialCapabilitiesError).mockResolvedValue(capabilities);
  }
  const generateProposal = vi.fn().mockResolvedValue(generatedProposal);
  const acceptProposal = vi.fn().mockResolvedValue(ACCEPTED_PROJECT);
  const visualReview = vi.fn().mockResolvedValue(reviewedProposal);
  const answerHelp = vi.fn().mockResolvedValue({ answer: 'Help', insufficientContext: false, sources: [] });
  const repositories: Repositories = {
    ...createLocalRepositories({ latencyMs: 0 }),
    assistant: {
      isAvailable: true,
      getCapabilities,
      generateProposal,
      answerHelp,
      acceptProposal,
      visualReview,
    },
  };
  const dispatch = vi.fn();
  const onAccepted = vi.fn();
  const state = { ...createEditorState(DOCUMENT), hasUnsavedChanges };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
  );
  const hook = renderHook(
    () => useAssistantConversation('project_1', state, dispatch, onAccepted),
    { wrapper },
  );
  return { ...hook, getCapabilities, generateProposal, answerHelp, acceptProposal, visualReview, dispatch, onAccepted };
}

describe('useAssistantConversation', () => {
  it('forwards high-fidelity mode only when the guarded V2 pipeline is enabled', async () => {
    const controller = setup(false, undefined, V2_CAPABILITIES);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));
    act(() => controller.result.current.setQualityMode('high-fidelity'));

    await act(() => controller.result.current.send('Build a task app'));

    expect(controller.generateProposal).toHaveBeenCalledWith(
      'project_1',
      'Build a task app',
      expect.objectContaining({ qualityMode: 'high-fidelity' }),
    );
  });

  it('forces standard mode when the V2 pipeline is disabled', async () => {
    const controller = setup(false, undefined, CAPABILITIES);
    await waitFor(() => expect(controller.result.current.capabilitiesStatus).toBe('ready'));
    act(() => controller.result.current.setQualityMode('high-fidelity'));

    await act(() => controller.result.current.send('Build a task app'));

    expect(controller.generateProposal).toHaveBeenCalledWith(
      'project_1',
      'Build a task app',
      expect.objectContaining({ qualityMode: 'standard' }),
    );
  });

  it('generates then explicitly accepts a remote proposal', async () => {
    const controller = setup();
    await waitFor(() => expect(controller.result.current.selectedModelId).toBe('nemotron-super'));

    await act(() => controller.result.current.send('Build an app'));
    await waitFor(() => expect(controller.result.current.messages.at(-1)?.proposal).toEqual(PROPOSAL));
    const messageId = controller.result.current.messages.at(-1)!.id;

    await act(() => controller.result.current.accept(messageId));

    expect(controller.generateProposal).toHaveBeenCalledWith('project_1', 'Build an app', {
      conversation: [],
      draftBlueprint: undefined,
      providerId: 'opencode',
      modelId: 'nemotron-super',
      images: [],
      view: expect.objectContaining({ screenId: 'screen_1', components: [] }),
      qualityMode: 'standard',
    });
    expect(controller.acceptProposal).toHaveBeenCalledWith('project_1', PROPOSAL);
    expect(controller.dispatch).toHaveBeenCalledWith({ type: 'document/set', document: DOCUMENT });
    expect(controller.onAccepted).toHaveBeenCalledTimes(1);
    expect(controller.result.current.messages.find((message) => message.id === messageId)?.status).toBe('applied');
  });

  it('reports proposal-integrity failures without blaming the selected model', async () => {
    const controller = setup();
    controller.acceptProposal.mockRejectedValueOnce(new AssistantError(
      'invalid-proposal',
      'The assistant proposal is invalid or has been changed.',
    ));
    await act(() => controller.result.current.send('Build an app'));
    await waitFor(() => expect(controller.result.current.messages.at(-1)?.proposal).toEqual(PROPOSAL));
    const messageId = controller.result.current.messages.at(-1)!.id;

    await act(() => controller.result.current.accept(messageId));

    expect(controller.result.current.messages.at(-1)?.text).toMatch(/preview changed/i);
    expect(controller.result.current.messages.at(-1)?.text).not.toMatch(/selected model/i);
  });

  it('distinguishes applying from building and rejects conflicting actions synchronously', async () => {
    const controller = setup();
    await act(() => controller.result.current.send('Build an app'));
    const messageId = controller.result.current.messages.at(-1)!.id;
    let finish: (project: Project) => void = () => { throw new Error('Acceptance has not started'); };
    controller.acceptProposal.mockImplementationOnce(() => new Promise<Project>((resolve) => { finish = resolve; }));
    let pending: Promise<void> | undefined;
    act(() => { pending = controller.result.current.accept(messageId); });
    expect(controller.result.current.operation).toBe('apply');
    expect(controller.result.current.isWorking).toBe(true);
    act(() => controller.result.current.reject(messageId));
    await act(async () => {
      await controller.result.current.accept(messageId);
      await controller.result.current.send('Conflicting request');
    });
    expect(controller.acceptProposal).toHaveBeenCalledTimes(1);
    expect(controller.generateProposal).toHaveBeenCalledTimes(1);
    expect(controller.result.current.messages.at(-1)?.status).toBe('pending');
    await act(async () => { finish(ACCEPTED_PROJECT); await pending; });
    expect(controller.result.current.operation).toBeNull();
    expect(controller.result.current.messages.at(-1)?.status).toBe('applied');
  });

  it('does not accept a failed verification report even when invoked without the UI', async () => {
    const controller = setup();
    controller.generateProposal.mockResolvedValueOnce({ ...PROPOSAL, verification: {
      passed: false, repairAttempts: 0, viewports: [], stages: [], issues: [],
    } });
    await act(() => controller.result.current.send('Build an app'));
    const messageId = controller.result.current.messages.at(-1)!.id;
    await act(() => controller.result.current.accept(messageId));
    expect(controller.acceptProposal).not.toHaveBeenCalled();
    expect(controller.dispatch).not.toHaveBeenCalled();
  });

  it('shows concise recovery guidance for responsive validation failures', async () => {
    const controller = setup();
    controller.generateProposal.mockRejectedValueOnce(new AssistantError(
      'validation',
      'The AI assistant returned an invalid app proposal.',
      { issues: [{ message: 'Component extends outside the mobile viewport (390x780).' }] },
    ));

    await act(() => controller.result.current.send('Build an inventory app'));

    expect(controller.result.current.messages.at(-1)?.text).toBe(
      "Novy couldn't fit all requested content within the supported screen sizes after automatic repair. Try splitting the form across screens or simplifying the layout.",
    );
  });

  it('shows a blocking feasibility summary without claiming model validation failed', async () => {
    const controller = setup(false, undefined, V2_CAPABILITIES);
    controller.generateProposal.mockRejectedValueOnce(new AssistantError(
      'feasibility-blocked',
      'Novy found one blocking fidelity gap; no app proposal was generated.',
      { issues: [{ message: 'Interactive maps are unsupported.' }] },
    ));

    await act(() => controller.result.current.send('Build an interactive store map'));

    expect(controller.result.current.messages.at(-1)?.text).toBe(
      'Novy found one blocking fidelity gap; no app proposal was generated.',
    );
    expect(controller.result.current.messages.at(-1)?.text).not.toMatch(/model draft/i);
  });

  it('deduplicates and bounds other model validation feedback', async () => {
    const controller = setup();
    controller.generateProposal.mockRejectedValueOnce(new AssistantError(
      'validation',
      'The AI assistant returned an invalid app proposal.',
      { issues: [{ message: `${'A required route is missing. '.repeat(30)}A workflow target is invalid.` }] },
    ));

    await act(() => controller.result.current.send('Build an inventory app'));

    const message = controller.result.current.messages.at(-1)?.text ?? '';
    expect(message.match(/A required route is missing/g)).toHaveLength(1);
    expect(message).toContain('A workflow target is invalid.');
    expect(message.length).toBeLessThanOrEqual(280);
  });

  it('reports one accurate message when proposal persistence fails', async () => {
    const controller = setup();
    controller.acceptProposal.mockRejectedValueOnce(new AssistantError(
      'apply-failed',
      'The assistant proposal could not be applied. Your project was not changed.',
    ));
    await act(() => controller.result.current.send('Build an app'));
    await waitFor(() => expect(controller.result.current.messages.at(-1)?.proposal).toEqual(PROPOSAL));
    const messageId = controller.result.current.messages.at(-1)!.id;
    const messageCount = controller.result.current.messages.length;

    await act(() => controller.result.current.accept(messageId));

    expect(controller.result.current.messages).toHaveLength(messageCount + 1);
    expect(controller.result.current.messages.at(-1)?.text).toBe(
      'The app proposal could not be applied. Your project was not changed. Try again.',
    );
    expect(controller.dispatch).not.toHaveBeenCalled();
    expect(controller.onAccepted).not.toHaveBeenCalled();
  });

  it('waits for autosave instead of generating against stale local state', async () => {
    const controller = setup(true);

    await act(() => controller.result.current.send('Build an app'));

    expect(controller.generateProposal).not.toHaveBeenCalled();
    expect(controller.result.current.messages.at(-1)?.text).toMatch(/autosave/i);
  });

  it('renders a conversational build reply without a proposal card', async () => {
    const controller = setup();
    controller.generateProposal.mockResolvedValueOnce({
      kind: 'message',
      message: "Hi! Describe the app you'd like to build.",
    });

    await act(() => controller.result.current.send('hi'));

    expect(controller.result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      text: "Hi! Describe the app you'd like to build.",
    });
    expect(controller.result.current.messages.at(-1)?.proposal).toBeUndefined();
  });

  it('prevents duplicate requests before React has rerendered the working state', async () => {
    const controller = setup();

    await act(async () => {
      const first = controller.result.current.send('Build an app');
      const duplicate = controller.result.current.send('Build an app');
      await Promise.all([first, duplicate]);
    });

    expect(controller.generateProposal).toHaveBeenCalledTimes(1);
  });

  it('sends the explicitly selected model for the current editor session', async () => {
    const controller = setup();
    await waitFor(() => expect(controller.result.current.selectedModelId).toBe('nemotron-super'));

    act(() => controller.result.current.setSelectedModelId('gpt-6.1-terra'));
    await act(() => controller.result.current.send('Build with Terra'));

    expect(controller.generateProposal).toHaveBeenCalledWith(
      'project_1',
      'Build with Terra',
      expect.objectContaining({ providerId: 'opencode', modelId: 'gpt-6.1-terra' }),
    );
  });

  it('refines the pending blueprint with bounded conversation context', async () => {
    const controller = setup();
    await waitFor(() => expect(controller.result.current.selectedModelId).toBe('nemotron-super'));
    await act(() => controller.result.current.send('Build an app'));
    await waitFor(() => expect(controller.result.current.messages.at(-1)?.proposal).toEqual(PROPOSAL));

    await act(() => controller.result.current.send('Add a settings screen'));

    expect(controller.generateProposal).toHaveBeenLastCalledWith(
      'project_1',
      'Add a settings screen',
      {
        conversation: [
          { role: 'user', content: 'Build an app' },
          { role: 'assistant', content: 'A generated app.' },
        ],
        draftBlueprint: PROPOSAL.blueprint,
        providerId: 'opencode',
        modelId: 'nemotron-super',
        images: [],
        view: expect.objectContaining({ screenId: 'screen_1' }),
        qualityMode: 'standard',
      },
    );
  });

  it('answers indexed documentation questions without waiting for autosave', async () => {
    const controller = setup(true);
    await waitFor(() => expect(controller.result.current.selectedModelId).toBe('nemotron-super'));
    act(() => controller.result.current.setMode('help'));

    await act(() => controller.result.current.send('How does autosave work?'));

    expect(controller.answerHelp).toHaveBeenCalledWith('project_1', 'How does autosave work?', {
      conversation: [], providerId: 'opencode', modelId: 'nemotron-super', images: [],
    });
    expect(controller.generateProposal).not.toHaveBeenCalled();
  });

  it('sends image-only V2 requests through the references contract', async () => {
    const controller = setup(false, undefined, V2_CAPABILITIES);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));

    await act(() => controller.result.current.send('', [REFERENCE]));

    expect(controller.generateProposal).toHaveBeenCalledWith(
      'project_1',
      '',
      expect.objectContaining({
        references: [REFERENCE],
        draftBlueprint: undefined,
      }),
    );
    const context = controller.generateProposal.mock.calls[0]?.[2];
    expect(context).not.toHaveProperty('images');
    expect(controller.result.current.messages[0]?.text).toBe('Use the attached design references.');
  });

  it('retains pending references for refinements and clears them on terminal states', async () => {
    const controller = setup(false, undefined, V2_CAPABILITIES);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));
    await act(() => controller.result.current.send('Build this', [REFERENCE]));
    expect(controller.result.current.pendingReferences).toEqual([REFERENCE]);

    await act(() => controller.result.current.send('Add a settings screen'));

    expect(controller.generateProposal).toHaveBeenLastCalledWith(
      'project_1',
      'Add a settings screen',
      expect.objectContaining({
        draftBlueprint: PROPOSAL.blueprint,
        references: [REFERENCE],
      }),
    );
    const pendingId = controller.result.current.messages.at(-1)!.id;
    act(() => controller.result.current.reject(pendingId));
    expect(controller.result.current.pendingReferences).toEqual([]);

    await act(() => controller.result.current.send('Build again', [REFERENCE]));
    const acceptedId = controller.result.current.messages.at(-1)!.id;
    await act(() => controller.result.current.accept(acceptedId));
    expect(controller.result.current.pendingReferences).toEqual([]);
  });

  it('keeps legacy single-image mapping and requires text while V2 is disabled', async () => {
    const controller = setup();
    await waitFor(() => expect(controller.result.current.capabilitiesStatus).toBe('ready'));

    await act(() => controller.result.current.send('', [REFERENCE]));
    expect(controller.generateProposal).not.toHaveBeenCalled();

    await act(() => controller.result.current.send('Build this', [REFERENCE]));
    expect(controller.generateProposal).toHaveBeenCalledWith(
      'project_1',
      'Build this',
      expect.objectContaining({
        images: [{
          name: REFERENCE.name,
          mimeType: REFERENCE.mimeType,
          contentBase64: REFERENCE.contentBase64,
        }],
      }),
    );
    const context = controller.generateProposal.mock.calls[0]?.[2];
    expect(context).not.toHaveProperty('references');
  });

  it('explains which high-fidelity stage timed out without claiming a fallback', async () => {
    const controller = setup(false, undefined, V2_CAPABILITIES);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));
    controller.generateProposal.mockRejectedValueOnce(
      new AssistantError('timeout', 'Timed out', { stage: 'v2-blueprint' }),
    );

    await act(() => controller.result.current.send('Build this'));

    expect(controller.result.current.messages.at(-1)?.text).toContain(
      'timed out while refining the high-fidelity draft',
    );
    expect(controller.result.current.messages.at(-1)?.text).toContain(
      'No lower-fidelity draft was substituted',
    );
  });

  it('explains V2 validation failures without reporting a backend outage', async () => {
    const controller = setup(false, undefined, V2_CAPABILITIES);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));
    controller.generateProposal.mockRejectedValueOnce(
      new AssistantError(
        'validation',
        "The model produced a draft that failed Novy's V2 validation.",
        {
          stage: 'v2-blueprint',
          issues: [{
            field: 'designSystem.rationale',
            message: 'String should have at most 200 characters',
          }],
        },
      ),
    );

    await act(() => controller.result.current.send('Build this'));

    const message = controller.result.current.messages.at(-1)?.text ?? '';
    expect(message).toContain('V2 validation');
    expect(message).toContain('designSystem.rationale');
    expect(message).toContain('String should have at most 200 characters');
    expect(message).toContain('switch to Standard');
    expect(message).not.toContain('backend could not be reached');
  });

  it('reports a failed capability probe and recovers on an explicit retry', async () => {
    const controller = setup(false, new AssistantError(
      'timeout',
      'The provider check took too long.',
    ));

    await waitFor(() => expect(controller.result.current.capabilitiesStatus).toBe('error'));
    expect(controller.result.current.capabilitiesError).toMatch(/took too long/i);
    expect(controller.result.current.providers).toHaveLength(0);

    await act(() => controller.result.current.reloadCapabilities());

    await waitFor(() => expect(controller.result.current.capabilitiesStatus).toBe('ready'));
    expect(controller.result.current.providers).toHaveLength(1);
    expect(controller.result.current.selectedModelId).toBe('nemotron-super');
    expect(controller.getCapabilities).toHaveBeenCalledTimes(2);
  });

  it('reviews a high-fidelity proposal and replaces the pending draft only on success', async () => {
    const pending = {
      ...PROPOSAL,
      qualityMode: 'high-fidelity' as const,
      visualReview: {
        required: true,
        status: 'pending' as const,
        qualityStatus: 'unreviewed' as const,
        captureRequests: [{ screenKey: 'home', viewport: 'mobile' as const }],
      },
    };
    const reviewed = {
      ...pending,
      visualReview: {
        ...pending.visualReview,
        status: 'reviewed' as const,
        qualityStatus: 'reviewed' as const,
        score: 82,
        summary: 'Close match.',
      },
    };
    const controller = setup(false, undefined, V2_CAPABILITIES, pending, reviewed);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));
    await act(() => controller.result.current.send('Build this', [REFERENCE]));
    const messageId = controller.result.current.messages.find((message) => message.proposal)?.id ?? '';
    const captures = [{
      screenKey: 'home',
      viewport: 'mobile' as const,
      name: 'home_mobile.png',
      mimeType: 'image/png' as const,
      contentBase64: 'aGVsbG8=',
      order: 0,
    }];

    await act(() => controller.result.current.reviewVisual(messageId, captures));

    expect(controller.visualReview).toHaveBeenCalledWith('project_1', pending, expect.objectContaining({
      captures,
      references: [REFERENCE],
    }));
    expect(
      controller.result.current.messages.find((message) => message.id === messageId)?.proposal
        ?.visualReview?.status,
    ).toBe('reviewed');

    await act(() => controller.result.current.accept(messageId));
    expect(controller.acceptProposal).toHaveBeenCalledWith('project_1', reviewed);
  });

  it('blocks acceptance while review is pending and allows an explicit continue-unreviewed', async () => {
    const pending = {
      ...PROPOSAL,
      visualReview: {
        required: true,
        status: 'pending' as const,
        qualityStatus: 'unreviewed' as const,
        captureRequests: [],
      },
    };
    const controller = setup(false, undefined, V2_CAPABILITIES, pending);
    await waitFor(() => expect(controller.result.current.designPipelineV2).toBe(true));
    await act(() => controller.result.current.send('Build this'));
    const messageId = controller.result.current.messages.find((message) => message.proposal)?.id ?? '';

    await act(() => controller.result.current.accept(messageId));
    expect(controller.acceptProposal).not.toHaveBeenCalled();
    expect(controller.result.current.messages.at(-1)?.text).toMatch(/Complete the visual review/);

    act(() => controller.result.current.continueUnreviewed(messageId));
    const review = controller.result.current.messages.find((message) => message.id === messageId)
      ?.proposal?.visualReview;
    expect(review?.status).toBe('continued-unreviewed');
    expect(review?.qualityStatus).toBe('continued-unreviewed');

    await act(() => controller.result.current.accept(messageId));
    expect(controller.acceptProposal).toHaveBeenCalledTimes(1);
  });
});

