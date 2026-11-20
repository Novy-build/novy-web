import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
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

function setup(hasUnsavedChanges = false) {
  const getCapabilities = vi.fn().mockResolvedValue({
    defaultProviderId: 'opencode',
    helpRetrievalAvailable: true,
    providers: [{
      id: 'opencode', model: 'nemotron-free', available: true,
      imageInput: true, location: 'remote', costWarning: false,
      defaultModelId: 'nemotron-super',
      models: [{
        id: 'nemotron-super', name: 'Nemotron 3.5 Super VL', model: 'opencode/nemotron',
        available: true, imageInput: true, location: 'remote', costWarning: false,
        usageNote: 'Free OpenCode quota.',
      }],
    }],
  });
  const generateProposal = vi.fn().mockResolvedValue(PROPOSAL);
  const acceptProposal = vi.fn().mockResolvedValue(ACCEPTED_PROJECT);
  const answerHelp = vi.fn().mockResolvedValue({ answer: 'Help', insufficientContext: false, sources: [] });
  const repositories: Repositories = {
    ...createLocalRepositories({ latencyMs: 0 }),
    assistant: { isAvailable: true, getCapabilities, generateProposal, answerHelp, acceptProposal },
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
  return { ...hook, generateProposal, answerHelp, acceptProposal, dispatch, onAccepted };
}

describe('useAssistantConversation', () => {
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
});

