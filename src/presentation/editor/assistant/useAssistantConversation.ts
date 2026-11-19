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
import type { ProjectType } from '@domain/entities/project';
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
  operation: 'build' | 'help' | 'apply' | null;
  hasExistingContent: boolean;
  projectType: ProjectType;
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
  const [operation, setOperation] = useState<AssistantConversation['operation']>(null);
  const isWorking = operation !== null;
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
    setOperation(mode);
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
      setOperation(null);
    }
  }

  async function accept(messageId: string): Promise<void> {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message?.proposal || message.status !== 'pending' || workingRef.current) return;
    if (message.proposal.verification?.passed === false) return;
    if (state.hasUnsavedChanges || state.isSaving) {
      appendAssistantMessage(
        'build',
        'The project has newer unsaved changes. Wait for autosave, then generate a new proposal.',
      );
      return;
    }
    workingRef.current = true;
    setOperation('apply');
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
      setOperation(null);
    }
  }

  function reject(messageId: string): void {
    if (workingRef.current) return;
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
    operation,
    hasExistingContent: state.document.screens.length > 1 || state.document.screens.some((screen) =>
      screen.nodes.length > 0 || screen.behaviors.length > 0 || screen.logicGraphs.length > 0),
    projectType: state.projectType,
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
  const messages = issues.flatMap((issue) => {
    if (issue === null || typeof issue !== 'object') return [];
    const message = (issue as { message?: unknown }).message;
    return typeof message === 'string' && message.trim() ? [message] : [];
  });
  if (messages.length === 0) return fallback;
  if (messages.some(isResponsiveOverflowMessage)) {
    return "Novy couldn't fit all requested content within the supported screen sizes after automatic repair. Try splitting the form across screens or simplifying the layout.";
  }
  const message = conciseValidationIssue(messages[0]!);
  return message ? `The model draft failed Novy's checks: ${message}` : fallback;
}

function isResponsiveOverflowMessage(message: string): boolean {
  return /\bcomponents?\b[^.]{0,200}\boutside the (?:mobile|tablet|desktop) viewport\b/i.test(message);
}

function conciseValidationIssue(message: string): string {
  const normalized = message.replace(/\s+/g, ' ').trim();
  const sentences = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  const seen = new Set<string>();
  const unique = sentences.filter((sentence) => {
    const key = sentence.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((sentence) => sentence.trim()).join(' ');
  if (unique.length <= 240) return unique;
  const clipped = unique.slice(0, 239);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 180 ? lastSpace : 239).trimEnd()}…`;
}
