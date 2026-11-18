import { useEffect, useRef, useState, type Dispatch } from 'react';
import type {
  AssistantImageAttachment,
  AssistantProviderCapability,
  AssistantProviderId,
  AssistantConversationTurn,
  AssistantHelpAnswer,
  AssistantProposalV1,
} from '@domain/entities/assistant';
import { AssistantError } from '@domain/errors/AssistantError';
import { generateId } from '@domain/ids';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import type { EditorAction, EditorState } from '../state/editorState';

export type AssistantMode = 'build' | 'help';
export type AssistantProposalStatus = 'pending' | 'applied' | 'rejected' | 'superseded';

export interface AssistantMessage {
  id: string;
  mode: AssistantMode;
  role: 'user' | 'assistant';
  text: string;
  proposal?: AssistantProposalV1;
  help?: AssistantHelpAnswer;
  status?: AssistantProposalStatus;
  images?: AssistantImageAttachment[];
}

export interface AssistantConversation {
  messages: AssistantMessage[];
  mode: AssistantMode;
  isWorking: boolean;
  isAvailable: boolean;
  providers: AssistantProviderCapability[];
  selectedProviderId: AssistantProviderId;
  setSelectedProviderId: (provider: AssistantProviderId) => void;
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string) => void;
  setMode: (mode: AssistantMode) => void;
  send: (message: string, images?: AssistantImageAttachment[]) => Promise<void>;
  accept: (messageId: string) => Promise<void>;
  reject: (messageId: string) => void;
}

export function useAssistantConversation(
  projectId: string,
  state: EditorState,
  dispatch: Dispatch<EditorAction>,
  onAccepted: () => void,
): AssistantConversation {
  const { assistant } = useRepositories();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [mode, setMode] = useState<AssistantMode>('build');
  const [isWorking, setIsWorking] = useState(false);
  const workingRef = useRef(false);
  const [providers, setProviders] = useState<AssistantProviderCapability[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<AssistantProviderId>('opencode');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!assistant.isAvailable) return undefined;
    void assistant.getCapabilities().then((capabilities) => {
      if (!active) return;
      setProviders(capabilities.providers);
      setSelectedProviderId(capabilities.defaultProviderId);
      setSelectedModelId(
        capabilities.providers.find(
          (provider) => provider.id === capabilities.defaultProviderId,
        )?.defaultModelId ?? null,
      );
    }).catch(() => {
      if (active) setProviders([]);
    });
    return () => { active = false; };
  }, [assistant]);

  async function send(message: string, images: AssistantImageAttachment[] = []): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || workingRef.current) return;
    const userMessage: AssistantMessage = {
      id: generateId('message'),
      mode,
      role: 'user',
      text: trimmed,
      images,
    };
    setMessages((previous) => [...previous, userMessage]);
    const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
    const selectedModel = selectedProvider?.models.find((model) => model.id === selectedModelId);
    const selectedCapability = selectedModel ?? selectedProvider;
    if (providers.length > 0 && !selectedCapability?.available) {
      appendAssistantMessage(mode, 'The selected assistant provider is unavailable. Choose another provider.');
      return;
    }
    if (images.length > 0 && selectedCapability && !selectedCapability.imageInput) {
      appendAssistantMessage(mode, 'The selected assistant model does not support image input.');
      return;
    }
    if (mode === 'build' && (state.hasUnsavedChanges || state.isSaving)) {
      appendAssistantMessage(
        mode,
        'Wait for autosave to finish before generating an authoritative app proposal.',
      );
      return;
    }
    workingRef.current = true;
    setIsWorking(true);
    try {
      const conversation = conversationTurns(messages, mode);
      if (mode === 'help') {
        const help = await assistant.answerHelp(projectId, trimmed, {
          conversation,
          providerId: selectedProviderId,
          modelId: selectedModelId ?? undefined,
          images,
        });
        setMessages((previous) => [
          ...previous,
          {
            id: generateId('message'),
            mode,
            role: 'assistant',
            text: help.answer,
            help,
          },
        ]);
      } else {
        const draft = latestPendingProposal(messages);
        const result = await assistant.generateProposal(projectId, trimmed, {
          conversation,
          draftBlueprint: draft?.blueprint,
          providerId: selectedProviderId,
          modelId: selectedModelId ?? undefined,
          images,
        });
        if (!('id' in result)) {
          appendAssistantMessage(mode, result.message);
          return;
        }
        const proposal = result;
        setMessages((previous) => [
          ...previous.map((candidate) =>
            candidate.status === 'pending'
              ? { ...candidate, status: 'superseded' as const }
              : candidate),
          {
            id: generateId('message'),
            mode,
            role: 'assistant',
            text: proposal.message,
            proposal,
            status: 'pending',
          },
        ]);
      }
    } catch (error) {
      appendAssistantMessage(mode, assistantErrorMessage(error));
    } finally {
      workingRef.current = false;
      setIsWorking(false);
    }
  }

  async function accept(messageId: string): Promise<void> {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message?.proposal || message.status !== 'pending' || workingRef.current) return;
    if (state.hasUnsavedChanges || state.isSaving) {
      appendAssistantMessage(
        'build',
        'The project has newer unsaved changes. Wait for autosave, then generate a new proposal.',
      );
      return;
    }
    workingRef.current = true;
    setIsWorking(true);
    try {
      const project = await assistant.acceptProposal(projectId, message.proposal);
      dispatch({ type: 'document/set', document: project.document });
      onAccepted();
      setMessages((previous) => previous.map((candidate) =>
        candidate.id === messageId ? { ...candidate, status: 'applied' } : candidate));
    } catch (error) {
      appendAssistantMessage('build', assistantErrorMessage(error));
    } finally {
      workingRef.current = false;
      setIsWorking(false);
    }
  }

  function reject(messageId: string): void {
    setMessages((previous) => previous.map((candidate) =>
      candidate.id === messageId && candidate.status === 'pending'
        ? { ...candidate, status: 'rejected' }
        : candidate));
  }

  function appendAssistantMessage(messageMode: AssistantMode, text: string): void {
    setMessages((previous) => [
      ...previous,
      { id: generateId('message'), mode: messageMode, role: 'assistant', text },
    ]);
  }

  return {
    messages,
    mode,
    isWorking,
    isAvailable: assistant.isAvailable,
    providers,
    selectedProviderId,
    setSelectedProviderId: (providerId) => {
      setSelectedProviderId(providerId);
      setSelectedModelId(
        providers.find((provider) => provider.id === providerId)?.defaultModelId ?? null,
      );
    },
    selectedModelId,
    setSelectedModelId,
    setMode,
    send,
    accept,
    reject,
  };
}

function conversationTurns(
  messages: AssistantMessage[],
  mode: AssistantMode,
): AssistantConversationTurn[] {
  return messages
    .filter((message) => message.mode === mode)
    .slice(-12)
    .map((message) => ({ role: message.role, content: message.text.slice(0, 2_000) }));
}

function latestPendingProposal(messages: AssistantMessage[]): AssistantProposalV1 | undefined {
  return [...messages]
    .reverse()
    .find((message) => message.status === 'pending' && message.proposal)
    ?.proposal;
}

function assistantErrorMessage(error: unknown): string {
  if (!(error instanceof AssistantError)) {
    return 'The assistant request failed. Try again.';
  }
  switch (error.code) {
    case 'stale-revision':
      return 'This proposal is stale because the saved project changed. Generate a new proposal.';
    case 'invalid-proposal':
      return 'This preview changed before it could be applied safely. Generate a new proposal.';
    case 'apply-failed':
      return 'The app proposal could not be applied. Your project was not changed. Try again.';
    case 'not-configured':
      return error.message;
    case 'rate-limited':
      return 'The assistant rate limit was reached. Try again later.';
    case 'quota-exceeded':
      return 'The selected model has reached its usage quota. Choose another model or try again after it resets.';
    case 'unavailable':
      return 'The selected assistant provider could not be reached. Your project was not changed.';
    case 'network':
      return 'The Novy backend could not be reached. Your project was not changed.';
    case 'timeout':
      return 'The selected assistant model took too long to finish. Try again or choose another model.';
    case 'validation':
      return validationAssistantMessage(error.details);
    case 'knowledge-unavailable':
      return 'The Novy documentation index is unavailable. Index the approved documentation first.';
    default:
      return error.message || 'The assistant request failed. Try again.';
  }
}

function validationAssistantMessage(details: unknown): string {
  const fallback = 'The selected model could not produce a valid Novy app after repair. Rephrase the request or choose another model.';
  if (!details || typeof details !== 'object') return fallback;
  const issues = (details as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return fallback;
  const first = issues.find((issue) =>
    issue !== null
    && typeof issue === 'object'
    && typeof (issue as { message?: unknown }).message === 'string');
  if (!first) return fallback;
  const message = (first as { message: string }).message.trim();
  return message ? `The model draft failed Novy's checks: ${message}` : fallback;
}
