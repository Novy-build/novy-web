import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockCaptureScreenFrames } = vi.hoisted(() => ({ mockCaptureScreenFrames: vi.fn() }));
vi.mock('./visualCapture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./visualCapture')>();
  return { ...actual, captureScreenFrames: mockCaptureScreenFrames };
});

import type { AssistantProposalV1 } from '@domain/entities/assistant';
import { AssistantSheet } from './AssistantSheet';
import type { AssistantConversation } from './useAssistantConversation';
import { makeButton, makeScreen, makeText } from '@test/editorFixtures';
import { createBehaviorBundle } from '@domain/factories/logic';
import { appendAction } from '@domain/logic/graph';

const BUNDLE = createBehaviorBundle('Add task', 'button_add', 'click');
const GRAPH = appendAction(BUNDLE.graph, { type: 'navigate', targetScreenId: 'screen_create' });

const PROPOSAL: AssistantProposalV1 = {
  id: 'proposal_1',
  projectId: 'project_1',
  baseRevision: 2,
  message: 'A task app proposal.',
  blueprint: {
    version: 1,
    summary: 'A task app proposal.',
    design: { style: 'product', palette: 'indigo', typography: 'modern-sans', radius: 'soft', density: 'comfortable', fieldStyle: 'outline' },
    screens: [
      {
        key: 'home',
        name: 'Tasks',
        path: '/',
        components: [
          { key: 'heading', type: 'text', text: 'Tasks' },
          { key: 'add', type: 'button', label: 'Add task' },
        ],
        workflows: [
          {
            key: 'open',
            name: 'Open form',
            triggerComponentKey: 'add',
            event: 'click',
            actions: [{ type: 'navigate', targetScreenKey: 'create' }],
          },
        ],
      },
      {
        key: 'create',
        name: 'Create task',
        path: '/new',
        components: [{ key: 'title', type: 'input', label: 'Title' }],
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
  },
  preview: {
    schemaVersion: 13,
    document: { screens: [
      {
        ...makeScreen('screen_tasks', [makeText('heading_tasks', { props: { text: 'Your tasks', level: 'title' } }), makeButton('button_add', { props: { label: 'Add task', variant: 'solid' } })], 'Tasks'),
        behaviors: [BUNDLE.behavior], logicGraphs: [GRAPH],
      },
      { ...makeScreen('screen_create', [makeText('heading_create', { props: { text: 'Add a task', level: 'title' } })], 'Create task'), path: '/new' },
    ] },
    collections: [],
  },
  verification: {
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
  },
};

function conversation(overrides: Partial<AssistantConversation> = {}): AssistantConversation {
  return {
    messages: overrides.messages ?? [],
    mode: overrides.mode ?? 'build',
    isWorking: overrides.isWorking ?? false,
    operation: overrides.operation ?? null,
    hasExistingContent: overrides.hasExistingContent ?? false,
    projectType: overrides.projectType ?? 'app',
    isAvailable: overrides.isAvailable ?? true,
    capabilitiesStatus: overrides.capabilitiesStatus ?? 'ready',
    capabilitiesError: overrides.capabilitiesError ?? null,
    reloadCapabilities: overrides.reloadCapabilities ?? vi.fn(),
    designPipelineV2: overrides.designPipelineV2 ?? false,
    referenceLimits: overrides.referenceLimits ?? {
      maxCount: 1,
      maxBytesEach: 3 * 1024 * 1024,
      maxBytesTotal: 3 * 1024 * 1024,
      maxPixelsEach: 16_000_000,
      maxPixelsTotal: 16_000_000,
    },
    pendingReferences: overrides.pendingReferences ?? [],
    providers: overrides.providers ?? [{
      id: 'opencode', model: 'nemotron-free', available: true,
      imageInput: true, location: 'remote', costWarning: false,
      defaultModelId: 'nemotron-super',
      maxImages: 6,
      models: [
        {
          id: 'nemotron-super', name: 'Nemotron 3.5 Super VL', model: 'opencode/nemotron',
          available: true, imageInput: true, location: 'remote', costWarning: false,
          usageNote: 'Free OpenCode quota; remote processing.',
          maxImages: 6,
        },
        {
          id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', model: 'openai/gpt-6.1-terra',
          available: true, imageInput: true, location: 'remote', costWarning: true,
          usageNote: 'Uses the OpenAI account connected to OpenCode.',
          maxImages: 6,
        },
      ],
    }],
    selectedProviderId: overrides.selectedProviderId ?? 'opencode',
    setSelectedProviderId: overrides.setSelectedProviderId ?? vi.fn(),
    selectedModelId: overrides.selectedModelId ?? 'nemotron-super',
    setSelectedModelId: overrides.setSelectedModelId ?? vi.fn(),
    qualityMode: overrides.qualityMode ?? 'standard',
    setQualityMode: overrides.setQualityMode ?? vi.fn(),
    setMode: overrides.setMode ?? vi.fn(),
    send: overrides.send ?? vi.fn().mockResolvedValue(undefined),
    accept: overrides.accept ?? vi.fn().mockResolvedValue(undefined),
    reviewVisual: overrides.reviewVisual ?? vi.fn().mockResolvedValue(undefined),
    continueUnreviewed: overrides.continueUnreviewed ?? vi.fn(),
    reject: overrides.reject ?? vi.fn(),
  };
}

describe('AssistantSheet', () => {
  it('identifies the live provider and explains preview-before-apply', () => {
    render(<AssistantSheet conversation={conversation()} onClose={vi.fn()} />);

    expect(screen.getByText('Nemotron 3.5 Super VL · remote processing')).toBeInTheDocument();
    expect(screen.getByText('Describe the app you want')).toBeInTheDocument();
    expect(screen.getByText(/Nothing is saved until/)).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText('Message')).toHaveFocus();
  });

  it('switches to help mode with a prepared question from a field help request', () => {
    const controller = conversation();
    render(
      <AssistantSheet
        conversation={controller}
        helpRequest={{ query: 'What is Background used for?', token: 1 }}
        onClose={vi.fn()}
      />,
    );

    expect(controller.setMode).toHaveBeenCalledWith('help');
    expect(screen.getByLabelText('Message')).toHaveValue('What is Background used for?');
    expect(controller.send).not.toHaveBeenCalled();
  });

  it('uses a growing textarea that sends on Enter and keeps Shift+Enter for newlines', () => {
    const controller = conversation();
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    const message = screen.getByLabelText('Message');
    expect(message.tagName).toBe('TEXTAREA');

    fireEvent.change(message, { target: { value: 'First line' } });
    fireEvent.keyDown(message, { key: 'Enter', shiftKey: true });
    expect(controller.send).not.toHaveBeenCalled();

    fireEvent.keyDown(message, { key: 'Enter' });
    expect(controller.send).toHaveBeenCalledWith('First line', []);
  });

  it('opens model settings as a popover instead of a persistent row', () => {
    render(<AssistantSheet conversation={conversation()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog', { name: 'Model settings' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assistant provider')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Model settings' }));
    expect(screen.getByRole('dialog', { name: 'Model settings' })).toBeInTheDocument();
    expect(screen.getByLabelText('Assistant provider')).toBeInTheDocument();
  });

  it('closes the model settings popover with Escape without closing the sheet', () => {
    const onClose = vi.fn();
    render(<AssistantSheet conversation={conversation()} onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Model settings' });
    fireEvent.click(trigger);

    fireEvent.keyDown(screen.getByLabelText('Assistant provider'), { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Model settings' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('sends a complete-app request through the conversation controller', () => {
    const controller = conversation();
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Build a task app' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controller.send).toHaveBeenCalledWith('Build a task app', []);
  });

  it('shows a loading badge only while capabilities are pending', () => {
    render(<AssistantSheet conversation={conversation({
      capabilitiesStatus: 'loading',
      providers: [],
    })} onClose={vi.fn()} />);

    expect(screen.getByText('Loading assistant providers…')).toBeInTheDocument();
  });

  it('shows a failed provider probe with a retry instead of an endless loading state', () => {
    const reloadCapabilities = vi.fn();
    render(<AssistantSheet conversation={conversation({
      capabilitiesStatus: 'error',
      capabilitiesError: 'The provider check took too long.',
      providers: [],
      reloadCapabilities,
    })} onClose={vi.fn()} />);

    expect(screen.getByText(/Couldn't load providers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reloadCapabilities).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Model settings' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The provider check took too long.');
    expect(screen.getByRole('option', { name: 'No providers available' })).toBeInTheDocument();
  });

  it('retries a failed capability probe when model settings are opened', () => {
    const reloadCapabilities = vi.fn();
    render(<AssistantSheet conversation={conversation({
      capabilitiesStatus: 'error',
      capabilitiesError: 'Backend unreachable.',
      providers: [],
      reloadCapabilities,
    })} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Model settings' }));

    expect(reloadCapabilities).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('lets the builder explicitly select an available provider', () => {
    const setSelectedProviderId = vi.fn();
    render(<AssistantSheet conversation={conversation({
      providers: [
        { id: 'opencode', model: 'nemotron', available: true, imageInput: true, location: 'remote', costWarning: false, defaultModelId: null, models: [], maxImages: 6 },
        { id: 'ollama', model: 'qwen3', available: true, imageInput: false, location: 'local', costWarning: false, defaultModelId: null, models: [], maxImages: 0 },
        { id: 'openrouter', model: '', available: false, imageInput: true, location: 'remote', costWarning: true, defaultModelId: null, models: [], maxImages: 6 },
      ],
      setSelectedProviderId,
    })} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Model settings' }));
    fireEvent.change(screen.getByLabelText('Assistant provider'), { target: { value: 'ollama' } });

    expect(setSelectedProviderId).toHaveBeenCalledWith('ollama');
    expect(screen.getByRole('option', { name: /OpenRouter/ })).toBeDisabled();
  });

  it('lets the builder select GPT-6.1 Terra and discloses account usage', () => {
    const setSelectedModelId = vi.fn();
    render(<AssistantSheet conversation={conversation({
      selectedModelId: 'gpt-6.1-terra',
      setSelectedModelId,
    })} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Model settings' }));
    expect(screen.getByLabelText('Assistant model')).toHaveValue('gpt-6.1-terra');
    expect(screen.getByText('Uses the OpenAI account connected to OpenCode.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Assistant model'), {
      target: { value: 'nemotron-super' },
    });
    expect(setSelectedModelId).toHaveBeenCalledWith('nemotron-super');
  });

  it('attaches a supported image to the next request', async () => {
    const controller = conversation();
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])],
      'layout.png',
      { type: 'image/png' },
    );

    fireEvent.change(screen.getByLabelText('Attach design references'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('1. layout.png')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Use this layout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controller.send).toHaveBeenCalledWith(
      'Use this layout',
      [expect.objectContaining({ name: 'layout.png', mimeType: 'image/png' })],
    );
  });

  it('only exposes high-fidelity mode when the guarded V2 pipeline is enabled', () => {
    const { unmount } = render(<AssistantSheet conversation={conversation()} onClose={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'High fidelity' })).not.toBeInTheDocument();
    unmount();

    const controller = conversation({ designPipelineV2: true, qualityMode: 'high-fidelity' });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'High fidelity' })).toBeChecked();
    expect(screen.getByTestId('assistant-quality-disclosure')).toHaveTextContent('no lower-fidelity draft is substituted');
  });

  it('supports multiple thumbnails, reordering, and image-only V2 submission', async () => {
    const controller = conversation({
      designPipelineV2: true,
      referenceLimits: {
        maxCount: 6,
        maxBytesEach: 3 * 1024 * 1024,
        maxBytesTotal: 12 * 1024 * 1024,
        maxPixelsEach: 16_000_000,
        maxPixelsTotal: 40_000_000,
      },
    });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    const mobile = new File([new Uint8Array([1, 2, 3])], 'mobile.png', { type: 'image/png' });
    const desktop = new File([new Uint8Array([4, 5, 6])], 'desktop.webp', { type: 'image/webp' });

    fireEvent.change(screen.getByLabelText('Attach design references'), {
      target: { files: [mobile, desktop] },
    });
    await waitFor(() => expect(screen.getByText('2. desktop.webp')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Move desktop.webp earlier' }));
    expect(screen.getByText('1. desktop.webp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controller.send).toHaveBeenCalledWith('', [
      expect.objectContaining({ name: 'desktop.webp', order: 0 }),
      expect.objectContaining({ name: 'mobile.png', order: 1 }),
    ]);
  });

  it('replaces and removes references with accessible controls', async () => {
    const controller = conversation({ designPipelineV2: true });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    const original = new File([new Uint8Array([1])], 'original.png', { type: 'image/png' });
    const replacement = new File([new Uint8Array([2])], 'replacement.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByLabelText('Attach design references'), {
      target: { files: [original] },
    });
    await waitFor(() => expect(screen.getByText('1. original.png')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Replace original.png'), {
      target: { files: [replacement] },
    });
    await waitFor(() => expect(screen.getByText('1. replacement.jpg')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Remove replacement.jpg' }));
    expect(screen.queryByText('1. replacement.jpg')).not.toBeInTheDocument();
  });

  it('restores pending references for refinement and clears them on discard', () => {
    const reference = {
      name: 'mobile.png',
      mimeType: 'image/png' as const,
      contentBase64: 'bW9iaWxl',
      role: 'mobile-reference' as const,
      order: 0,
    };
    const controller = conversation({
      designPipelineV2: true,
      pendingReferences: [reference],
      messages: [{
        id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message,
        proposal: PROPOSAL, status: 'pending',
      }],
    });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Make changes' }));
    expect(screen.getByText('1. mobile.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.queryByText('1. mobile.png')).not.toBeInTheDocument();
    expect(controller.reject).toHaveBeenCalledWith('assistant_1');
  });

  it('reviews a high-fidelity draft and surfaces retry/continue/cancel on failure', async () => {
    const highFidelityProposal: AssistantProposalV1 = {
      ...PROPOSAL,
      qualityMode: 'high-fidelity',
      visualReview: {
        required: true,
        status: 'pending',
        qualityStatus: 'unreviewed',
        captureRequests: [{ screenKey: 'home', viewport: 'mobile' }],
      },
    };
    const reviewVisual = vi.fn().mockResolvedValue(undefined);
    const continueUnreviewed = vi.fn();
    const controller = conversation({
      designPipelineV2: true,
      qualityMode: 'high-fidelity',
      reviewVisual,
      continueUnreviewed,
      messages: [{
        id: 'assistant_hf', mode: 'build', role: 'assistant', text: highFidelityProposal.message,
        proposal: highFidelityProposal, status: 'pending',
      }],
    });
    mockCaptureScreenFrames.mockResolvedValue([{
      screenKey: 'home',
      viewport: 'mobile',
      name: 'home_mobile.png',
      mimeType: 'image/png',
      contentBase64: 'aGVsbG8=',
      order: 0,
    }]);
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);

    expect(screen.getByTestId('assistant-visual-review-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review visual match' }));
    await waitFor(() => expect(screen.getByTestId('assistant-visual-capture-stage')).toBeInTheDocument());
    await waitFor(() => expect(reviewVisual).toHaveBeenCalledWith(
      'assistant_hf',
      expect.arrayContaining([expect.objectContaining({ contentBase64: 'aGVsbG8=' })]),
    ));

    reviewVisual.mockRejectedValueOnce(new Error('review failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Review visual match' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be completed/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue without review' }));
    expect(continueUnreviewed).toHaveBeenCalledWith('assistant_hf');

    reviewVisual.mockRejectedValueOnce(new Error('review failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Review visual match' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be completed/));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a visual draft with collapsed details and persistent explicit actions', () => {
    const controller = conversation({
      messages: [
        { id: 'user_1', mode: 'build', role: 'user', text: 'Build tasks' },
        { id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' },
      ],
    });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    const preview = screen.getByRole('region', { name: 'App proposal preview' });

    expect(within(preview).getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    expect(within(preview).getByRole('img', { name: 'Visual preview of Tasks' })).toBeInTheDocument();
    expect(within(preview).getByRole('region', { name: 'Build verification' })).toHaveTextContent('Automated checks passed');
    expect(within(preview).getByText('Create task')).not.toBeVisible();
    fireEvent.click(within(preview).getByText('What’s included'));
    expect(within(preview).getByText('Create task')).toBeVisible();
    expect(within(preview).getByText('Tasks data · 1 field')).toBeVisible();
    expect(within(preview).getByText(/Mobile 390×780 · Passed/)).not.toBeVisible();
    fireEvent.click(within(preview).getByText('Check details'));
    expect(within(preview).getByText(/Mobile 390×780 · Passed/)).toBeVisible();

    const actions = screen.getByRole('region', { name: 'Draft actions' });
    expect(screen.getByRole('log')).not.toContainElement(actions);
    fireEvent.click(within(actions).getByRole('button', { name: 'Use this app' }));
    expect(controller.accept).toHaveBeenCalledWith('assistant_1');
    fireEvent.click(within(actions).getByRole('button', { name: 'Discard draft' }));
    expect(controller.reject).toHaveBeenCalledWith('assistant_1');
  });

  it('opens a local interactive preview without accepting, and returns focus on Escape', async () => {
    const controller = conversation({ messages: [{ id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' }] });
    const onClose = vi.fn();
    render(<AssistantSheet conversation={controller} onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Preview app' });
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Previewing Tasks' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(dialog).queryByLabelText('Save data changes')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Draft preview only/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add task' }));
    await waitFor(() => expect(within(dialog).getByText('Add a task')).toBeInTheDocument());
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Screen' }), { target: { value: 'screen_tasks' } });
    expect(within(dialog).getByText('Your tasks')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Previewing Tasks' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(controller.accept).not.toHaveBeenCalled();
    expect(opener).toHaveFocus();
  });

  it('focuses refinement without generating or discarding and preserves typed changes', () => {
    const controller = conversation({ messages: [{ id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' }] });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Keep this request' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make changes' }));
    expect(screen.getByLabelText('Message')).toHaveFocus();
    expect(screen.getByLabelText('Message')).toHaveValue('Keep this request');
    expect(screen.getByPlaceholderText('What would you like to change?')).toBeInTheDocument();
    expect(controller.send).not.toHaveBeenCalled();
    expect(controller.reject).not.toHaveBeenCalled();
  });

  it('labels acceptance as applying, not building', () => {
    const controller = conversation({ isWorking: true, operation: 'apply', messages: [{ id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' }] });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Applying your app');
    expect(screen.queryByText(/Thinking…/)).not.toBeInTheDocument();
  });

  it('shows an activity indicator for the current operation', () => {
    const { rerender } = render(<AssistantSheet conversation={conversation({ isWorking: true, operation: 'build' })} onClose={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Thinking…');
    expect(screen.queryByText(/automated checks/)).not.toBeInTheDocument();

    rerender(<AssistantSheet conversation={conversation({
      isWorking: true,
      operation: 'build',
      messages: [
        { id: 'user_1', mode: 'build', role: 'user', text: 'Build tasks' },
        { id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' },
      ],
    })} onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Refining…');

    rerender(<AssistantSheet conversation={conversation({ isWorking: true, operation: 'help', mode: 'help' })} onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Searching docs…');

    rerender(<AssistantSheet conversation={conversation()} onClose={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('switches modes through the selector menu', () => {
    const setMode = vi.fn();
    render(<AssistantSheet conversation={conversation({ setMode })} onClose={vi.fn()} />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitemradio', { name: 'Agent' })).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemradio', { name: 'Ask' })).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(within(menu).getByRole('menuitemradio', { name: 'Agent' }), { key: 'ArrowDown' });
    expect(within(menu).getByRole('menuitemradio', { name: 'Ask' })).toHaveFocus();
    fireEvent.keyDown(within(menu).getByRole('menuitemradio', { name: 'Ask' }), { key: 'Enter' });

    expect(setMode).toHaveBeenCalledWith('help');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agent' })).toHaveFocus();
  });

  it('opens model settings from the selector without closing the sheet', () => {
    const onClose = vi.fn();
    render(<AssistantSheet conversation={conversation({
      messages: [{ id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' }],
    })} onClose={onClose} />);
    expect(screen.queryByRole('dialog', { name: 'Model settings' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Model settings…' }));

    expect(screen.getByRole('dialog', { name: 'Model settings' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes only the mode menu on Escape', () => {
    const onClose = vi.fn();
    render(<AssistantSheet conversation={conversation()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));

    fireEvent.keyDown(within(screen.getByRole('menu')).getByRole('menuitemradio', { name: 'Ask' }), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Agent' })).toHaveFocus();
  });

  it('shows grounded help citations in Ask mode', () => {
    render(<AssistantSheet conversation={conversation({
      mode: 'help',
      messages: [{
        id: 'help_1',
        mode: 'help',
        role: 'assistant',
        text: 'Autosave uses optimistic concurrency. [S1]',
        help: {
          answer: 'Autosave uses optimistic concurrency. [S1]',
          insufficientContext: false,
          sources: [{
            reference: 'S1',
            title: 'PD6 traceability',
            uri: 'novy-web/docs/pd6-traceability.md',
            heading: 'Persistence',
            page: null,
          }],
        },
      }],
    })} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(within(screen.getByRole('menu')).getByRole('menuitemradio', { name: 'Ask' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('region', { name: 'Answer sources' })).toHaveTextContent('PD6 traceability');
  });

  it('closes via the close button, scrim, and Escape', () => {
    const onClose = vi.fn();
    render(<AssistantSheet conversation={conversation()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    fireEvent.click(screen.getByTestId('assistant-scrim'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

