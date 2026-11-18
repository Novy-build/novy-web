import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import { AssistantSheet } from './AssistantSheet';
import type { AssistantConversation } from './useAssistantConversation';

const PROPOSAL: AssistantProposalV1 = {
  id: 'proposal_1',
  projectId: 'project_1',
  baseRevision: 2,
  message: 'A task app proposal.',
  blueprint: {
    version: 1,
    summary: 'A task app proposal.',
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
    document: { screens: [] },
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
    isAvailable: overrides.isAvailable ?? true,
    providers: overrides.providers ?? [{
      id: 'opencode', model: 'nemotron-free', available: true,
      imageInput: true, location: 'remote', costWarning: false,
      defaultModelId: 'nemotron-super',
      models: [
        {
          id: 'nemotron-super', name: 'Nemotron 3.5 Super VL', model: 'opencode/nemotron',
          available: true, imageInput: true, location: 'remote', costWarning: false,
          usageNote: 'Free OpenCode quota; remote processing.',
        },
        {
          id: 'gpt-6.1-terra', name: 'GPT-6.1 Terra', model: 'openai/gpt-6.1-terra',
          available: true, imageInput: true, location: 'remote', costWarning: true,
          usageNote: 'Uses the OpenAI account connected to OpenCode.',
        },
      ],
    }],
    selectedProviderId: overrides.selectedProviderId ?? 'opencode',
    setSelectedProviderId: overrides.setSelectedProviderId ?? vi.fn(),
    selectedModelId: overrides.selectedModelId ?? 'nemotron-super',
    setSelectedModelId: overrides.setSelectedModelId ?? vi.fn(),
    setMode: overrides.setMode ?? vi.fn(),
    send: overrides.send ?? vi.fn().mockResolvedValue(undefined),
    accept: overrides.accept ?? vi.fn().mockResolvedValue(undefined),
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

  it('sends a complete-app request through the conversation controller', () => {
    const controller = conversation();
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Build a task app' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controller.send).toHaveBeenCalledWith('Build a task app', []);
  });

  it('lets the builder explicitly select an available provider', () => {
    const setSelectedProviderId = vi.fn();
    render(<AssistantSheet conversation={conversation({
      providers: [
        { id: 'opencode', model: 'nemotron', available: true, imageInput: true, location: 'remote', costWarning: false, defaultModelId: null, models: [] },
        { id: 'ollama', model: 'qwen3', available: true, imageInput: false, location: 'local', costWarning: false, defaultModelId: null, models: [] },
        { id: 'openrouter', model: '', available: false, imageInput: true, location: 'remote', costWarning: true, defaultModelId: null, models: [] },
      ],
      setSelectedProviderId,
    })} onClose={vi.fn()} />);

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

    fireEvent.change(screen.getByLabelText('Attach image'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('Image: layout.png')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Use this layout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(controller.send).toHaveBeenCalledWith(
      'Use this layout',
      [expect.objectContaining({ name: 'layout.png', mimeType: 'image/png' })],
    );
  });

  it('shows proposal details and requires explicit apply or reject', () => {
    const controller = conversation({
      messages: [
        { id: 'user_1', mode: 'build', role: 'user', text: 'Build tasks' },
        { id: 'assistant_1', mode: 'build', role: 'assistant', text: PROPOSAL.message, proposal: PROPOSAL, status: 'pending' },
      ],
    });
    render(<AssistantSheet conversation={controller} onClose={vi.fn()} />);
    const preview = screen.getByRole('region', { name: 'App proposal preview' });

    expect(within(preview).getByText('Tasks')).toBeInTheDocument();
    expect(within(preview).getByText('Create task')).toBeInTheDocument();
    expect(within(preview).getByText(/Tasks \(1 fields\)/)).toBeInTheDocument();
    expect(within(preview).getByRole('region', { name: 'Build verification' })).toHaveTextContent('Built, checked, and ready to review');
    expect(within(preview).getByText(/Mobile 390×780 · Passed/)).toBeInTheDocument();
    expect(within(preview).getByText(/repaired the draft 1 time/)).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole('button', { name: 'Apply app' }));
    expect(controller.accept).toHaveBeenCalledWith('assistant_1');
    fireEvent.click(within(preview).getByRole('button', { name: 'Reject' }));
    expect(controller.reject).toHaveBeenCalledWith('assistant_1');
  });

  it('shows grounded help citations in Ask Novy mode', () => {
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

    expect(screen.getByRole('tab', { name: 'Ask Novy' })).toHaveAttribute('aria-selected', 'true');
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
