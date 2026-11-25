import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type {
  AssistantReferenceAttachment,
  AssistantReferenceLimits,
  AssistantProviderCapability,
  AssistantProviderId,
  AssistantConversationTurn,
  AssistantHelpAnswer,
  AssistantProposalV1,
  AssistantViewComponent,
  AssistantViewContext,
  AssistantQualityMode,
  AssistantRenderCapture,
} from '@domain/entities/assistant';
import { AssistantError } from '@domain/errors/AssistantError';
import type { ProjectType } from '@domain/entities/project';
import { generateId } from '@domain/ids';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import { getActiveScreen, type EditorAction, type EditorState } from '../state/editorState';
import { geometryAtBreakpoint } from '@domain/entities/componentNode';

export type AssistantMode = 'build' | 'help';
export type AssistantProposalStatus = 'pending' | 'applied' | 'rejected' | 'superseded';
export type AssistantCapabilitiesStatus = 'loading' | 'ready' | 'error' | 'unavailable';

export interface AssistantMessage {
  id: string;
  mode: AssistantMode;
  role: 'user' | 'assistant';
  text: string;
  proposal?: AssistantProposalV1;
  help?: AssistantHelpAnswer;
  status?: AssistantProposalStatus;
  referenceNames?: string[];
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
  designPipelineV2: boolean;
  referenceLimits: AssistantReferenceLimits;
  pendingReferences: AssistantReferenceAttachment[];
  capabilitiesStatus: AssistantCapabilitiesStatus;
  capabilitiesError: string | null;
  reloadCapabilities: () => void;
  selectedProviderId: AssistantProviderId;
  setSelectedProviderId: (provider: AssistantProviderId) => void;
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string) => void;
  qualityMode: AssistantQualityMode;
  setQualityMode: (mode: AssistantQualityMode) => void;
  setMode: (mode: AssistantMode) => void;
  send: (message: string, references?: AssistantReferenceAttachment[]) => Promise<void>;
  accept: (messageId: string) => Promise<void>;
  reviewVisual: (messageId: string, captures: AssistantRenderCapture[]) => Promise<void>;
  continueUnreviewed: (messageId: string) => void;
  reject: (messageId: string) => void;
}

function buildAssistantViewContext(state: EditorState): AssistantViewContext {
  const screen = getActiveScreen(state);
  const breakpoint = state.device === 'desktop' ? 'desktop' : state.device === 'tablet' ? 'tablet' : 'mobile';
  const canvasWidth = breakpoint === 'desktop' ? 1200 : breakpoint === 'tablet' ? 768 : 390;
  const canvasHeight = breakpoint === 'desktop' ? 800 : breakpoint === 'tablet' ? 1024 : 780;
  const components: AssistantViewComponent[] = screen.nodes.slice(0, 40).map((node) => {
    const geometry = geometryAtBreakpoint(node, breakpoint);
    const props = 'props' in node ? node.props : {};
    const label = 'label' in props && typeof props.label === 'string'
      ? props.label
      : 'text' in props && typeof props.text === 'string'
        ? props.text
        : node.name ?? node.type;
    return {
      key: node.id,
      type: node.type,
      label: label.slice(0, 120),
      x: geometry.x,
      y: geometry.y,
      w: geometry.w,
      h: geometry.h,
      centeredHorizontally: Math.abs(geometry.x + geometry.w / 2 - canvasWidth / 2) <= 2,
      centeredVertically: Math.abs(geometry.y + geometry.h / 2 - canvasHeight / 2) <= 2,
    };
  });
  return {
    screenId: screen.id,
    screenName: screen.name,
    screenPath: screen.path,
    components,
    selectedComponentKey: state.selectedNodeId,
  };
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
  const [designPipelineV2, setDesignPipelineV2] = useState(false);
  const [referenceLimits, setReferenceLimits] = useState<AssistantReferenceLimits>({
    maxCount: 1,
    maxBytesEach: 3 * 1024 * 1024,
    maxBytesTotal: 3 * 1024 * 1024,
    maxPixelsEach: 16_000_000,
    maxPixelsTotal: 16_000_000,
  });
  const [pendingReferences, setPendingReferences] = useState<AssistantReferenceAttachment[]>([]);
  const [capabilitiesStatus, setCapabilitiesStatus] = useState<AssistantCapabilitiesStatus>(
    assistant.isAvailable ? 'loading' : 'unavailable',
  );
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  const capabilitiesRequestRef = useRef(0);
  const [selectedProviderId, setSelectedProviderId] = useState<AssistantProviderId>('opencode');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [qualityMode, setQualityMode] = useState<AssistantQualityMode>('standard');

  const reloadCapabilities = useCallback((): void => {
    if (!assistant.isAvailable) {
      capabilitiesRequestRef.current += 1;
      setProviders([]);
      setDesignPipelineV2(false);
      setPendingReferences([]);
      setCapabilitiesStatus('unavailable');
      setCapabilitiesError(null);
      return;
    }
    const requestId = ++capabilitiesRequestRef.current;
    setCapabilitiesStatus('loading');
    setCapabilitiesError(null);
    void assistant.getCapabilities().then((capabilities) => {
      if (requestId !== capabilitiesRequestRef.current) return;
      setProviders(capabilities.providers);
      setDesignPipelineV2(capabilities.designPipelineV2);
      setReferenceLimits(capabilities.referenceLimits);
      setSelectedProviderId(capabilities.defaultProviderId);
      setSelectedModelId(
        capabilities.providers.find(
          (provider) => provider.id === capabilities.defaultProviderId,
        )?.defaultModelId ?? null,
      );
      setCapabilitiesStatus('ready');
    }).catch((error: unknown) => {
      if (requestId !== capabilitiesRequestRef.current) return;
      setProviders([]);
      setDesignPipelineV2(false);
      setPendingReferences([]);
      setCapabilitiesError(assistantCapabilitiesErrorMessage(error));
      setCapabilitiesStatus('error');
    });
  }, [assistant]);

  useEffect(() => {
    reloadCapabilities();
  }, [reloadCapabilities]);

  async function send(
    message: string,
    references: AssistantReferenceAttachment[] = [],
  ): Promise<void> {
    const trimmed = message.trim();
    const pendingProposal = latestPendingProposal(messages);
    const requestReferences = canonicalReferences(
      references.length > 0 ? references : mode === 'build' && pendingProposal ? pendingReferences : [],
    );
    if ((!trimmed && (!designPipelineV2 || requestReferences.length === 0)) || workingRef.current) return;
    const userMessage: AssistantMessage = {
      id: generateId('message'),
      mode,
      role: 'user',
      text: trimmed || 'Use the attached design references.',
      referenceNames: requestReferences.map((reference) => reference.name),
    };
    setMessages((previous) => [...previous, userMessage]);
    const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);
    const selectedModel = selectedProvider?.models.find((model) => model.id === selectedModelId);
    const selectedCapability = selectedModel ?? selectedProvider;
    if (providers.length > 0 && !selectedCapability?.available) {
      appendAssistantMessage(mode, 'The selected assistant provider is unavailable. Choose another provider.');
      return;
    }
    if (requestReferences.length > 0 && selectedCapability && !selectedCapability.imageInput) {
      appendAssistantMessage(mode, 'The selected assistant model does not support image input.');
      return;
    }
    if (
      requestReferences.length > 0
      && selectedCapability
      && requestReferences.length > selectedCapability.maxImages
    ) {
      appendAssistantMessage(
        mode,
        `The selected assistant model supports at most ${selectedCapability.maxImages} references.`,
      );
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
          ...(designPipelineV2
            ? { references: requestReferences }
            : { images: legacyImages(requestReferences) }),
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
        const result = await assistant.generateProposal(projectId, trimmed, {
          conversation,
          draftBlueprint: pendingProposal?.blueprint,
          providerId: selectedProviderId,
          modelId: selectedModelId ?? undefined,
          ...(designPipelineV2
            ? { references: requestReferences }
            : { images: legacyImages(requestReferences) }),
          view: buildAssistantViewContext(state),
          qualityMode: designPipelineV2 ? qualityMode : 'standard',
        });
        if (!('id' in result)) {
          appendAssistantMessage(mode, result.message);
          return;
        }
        const proposal = result;
        setPendingReferences(requestReferences);
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
    const review = message.proposal.visualReview;
    if (
      review?.required
      && review.status !== 'reviewed'
      && review.qualityStatus !== 'continued-unreviewed'
    ) {
      appendAssistantMessage(
        'build',
        'Complete the visual review or choose “Continue without review” before applying this draft.',
      );
      return;
    }
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
      setPendingReferences([]);
      setMessages((previous) => previous.map((candidate) =>
        candidate.id === messageId ? { ...candidate, status: 'applied' } : candidate));
    } catch (error) {
      appendAssistantMessage('build', assistantErrorMessage(error));
    } finally {
      workingRef.current = false;
      setOperation(null);
    }
  }

  async function reviewVisual(
    messageId: string,
    captures: AssistantRenderCapture[],
  ): Promise<void> {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (!message?.proposal || message.status !== 'pending' || workingRef.current) return;
    if (message.proposal.visualReview?.status !== 'pending') return;
    workingRef.current = true;
    setOperation('build');
    try {
      const reviewed = await assistant.visualReview(projectId, message.proposal, {
        ...(designPipelineV2
          ? { references: pendingReferences }
          : { images: pendingReferences.map((reference) => ({
            name: reference.name,
            mimeType: reference.mimeType,
            contentBase64: reference.contentBase64,
          })) }),
        captures,
        providerId: selectedProviderId,
        modelId: selectedModelId ?? undefined,
      });
      setMessages((previous) => previous.map((candidate) => (
        candidate.id === messageId ? { ...candidate, proposal: reviewed } : candidate
      )));
    } finally {
      workingRef.current = false;
      setOperation(null);
    }
  }

  function continueUnreviewed(messageId: string): void {
    setMessages((previous) => previous.map((candidate) => {
      if (candidate.id !== messageId || !candidate.proposal?.visualReview) return candidate;
      return {
        ...candidate,
        proposal: {
          ...candidate.proposal,
          visualReview: {
            ...candidate.proposal.visualReview,
            status: 'continued-unreviewed',
            qualityStatus: 'continued-unreviewed',
            score: null,
            summary: 'Visual review was skipped. This draft was not visually compared with the reference.',
          },
        },
      };
    }));
  }

  function reject(messageId: string): void {
    if (workingRef.current) return;
    if (!messages.some((candidate) => candidate.id === messageId && candidate.status === 'pending')) {
      return;
    }
    setMessages((previous) => previous.map((candidate) =>
      candidate.id === messageId && candidate.status === 'pending'
        ? { ...candidate, status: 'rejected' }
        : candidate));
    setPendingReferences([]);
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
    designPipelineV2,
    referenceLimits,
    pendingReferences,
    capabilitiesStatus,
    capabilitiesError,
    reloadCapabilities,
    selectedProviderId,
    setSelectedProviderId: (providerId) => {
      setSelectedProviderId(providerId);
      setSelectedModelId(
        providers.find((provider) => provider.id === providerId)?.defaultModelId ?? null,
      );
    },
    selectedModelId,
    setSelectedModelId,
    qualityMode,
    setQualityMode,
    setMode,
    send,
    accept,
    reviewVisual,
    continueUnreviewed,
    reject,
  };
}

function canonicalReferences(
  references: AssistantReferenceAttachment[],
): AssistantReferenceAttachment[] {
  return references.map((reference, order) => ({ ...reference, order }));
}

function legacyImages(references: AssistantReferenceAttachment[]): Array<{
  name: string;
  mimeType: AssistantReferenceAttachment['mimeType'];
  contentBase64: string;
}> {
  return references.map(({ name, mimeType, contentBase64 }) => ({ name, mimeType, contentBase64 }));
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

function assistantCapabilitiesErrorMessage(error: unknown): string {
  if (!(error instanceof AssistantError)) {
    return 'Assistant providers could not be loaded. Try again.';
  }
  switch (error.code) {
    case 'rate-limited':
      return 'The provider check was rate limited. Try again shortly.';
    case 'network':
      return 'The Novy backend could not be reached. Check the connection and try again.';
    case 'timeout':
      return 'The provider check took too long. Try again.';
    case 'not-configured':
      return error.message;
    case 'unavailable':
      return error.message || 'Assistant providers are temporarily unavailable.';
    default:
      return error.message || 'Assistant providers could not be loaded. Try again.';
  }
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
      return timeoutAssistantMessage(error.details);
    case 'validation':
      return validationAssistantMessage(error.details, error.message);
    case 'feasibility-blocked':
      return error.message || 'The requested design cannot be represented safely with the active Novy capabilities.';
    case 'knowledge-unavailable':
      return 'The Novy documentation index is unavailable. Index the approved documentation first.';
    default:
      return error.message || 'The assistant request failed. Try again.';
  }
}

function timeoutAssistantMessage(details: unknown): string {
  const stage = typeof details === 'object' && details !== null
    ? (details as { stage?: unknown }).stage
    : undefined;
  const stageLabels: Record<string, string> = {
    'reference-analysis': 'reading the reference image',
    'design-intent': 'planning the design',
    blueprint: 'building the responsive draft',
    'v2-blueprint': 'refining the high-fidelity draft',
    'visual-critique': 'comparing the rendered design',
    'visual-repair': 'repairing the visual match',
  };
  const activity = typeof stage === 'string' ? stageLabels[stage] : undefined;
  return activity
    ? `The selected model timed out while ${activity}. High fidelity can take several minutes; try again, choose GPT-6.1 Terra Fast, or switch to Standard. No lower-fidelity draft was substituted.`
    : 'The selected assistant model took too long to finish. Try again or choose another model.';
}

function validationAssistantMessage(details: unknown, envelopeMessage?: string): string {
  const fallback = 'The selected model could not produce a valid Novy app after repair. Rephrase the request or choose another model.';
  if (!details || typeof details !== 'object') return fallback;
  const stage = (details as { stage?: unknown }).stage;
  const issues = (details as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return fallback;
  const parsedIssues = issues.flatMap((issue) => {
    if (issue === null || typeof issue !== 'object') return [];
    const field = (issue as { field?: unknown }).field;
    const message = (issue as { message?: unknown }).message;
    return typeof message === 'string' && message.trim()
      ? [{ field: typeof field === 'string' ? field : '', message }]
      : [];
  });
  if (stage === 'v2-blueprint') {
    const base = envelopeMessage?.trim() || 'The model produced a draft that failed Novy’s V2 validation.';
    const first = parsedIssues[0];
    const detail = first
      ? ` Check: ${first.field ? `${first.field}: ` : ''}${conciseValidationIssue(first.message)}`
      : '';
    return `${base}${detail} Try again or switch to Standard.`;
  }
  const messages = parsedIssues.map((issue) => issue.message);
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
