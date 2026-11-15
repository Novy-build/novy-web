import axios from 'axios';
import type {
  AppBlueprintV1,
  AssistantCapabilities,
  AssistantBuildResult,
  AssistantConversationTurn,
  AssistantHelpAnswer,
  AssistantHelpSource,
  AssistantPreviewCollection,
  AssistantProposalV1,
  AssistantImageAttachment,
  AssistantModelCapability,
  AssistantProviderCapability,
  AssistantProviderId,
  BlueprintCollection,
  BlueprintComponent,
  BlueprintField,
  BlueprintRecordField,
  BlueprintRouteParameter,
  BlueprintScreen,
  BlueprintWorkflow,
} from '@domain/entities/assistant';
import type { Project } from '@domain/entities/project';
import { AssistantError } from '@domain/errors/AssistantError';
import type { AssistantRepository } from '@domain/repositories/assistant.repository';
import { isRecord, readApiErrorEnvelope, type ApiHttpClient } from '../../api/http';
import { mapScreenFromDto } from '../../mappers/project.mapper';
import type { ScreenDTO } from '../../dto/project.dto';

export class ApiAssistantRepository implements AssistantRepository {
  readonly isAvailable = true;
  private readonly client: ApiHttpClient;
  private readonly adoptProject: (value: unknown) => Project;

  constructor(
    client: ApiHttpClient,
    adoptProject: (value: unknown) => Project,
  ) {
    this.client = client;
    this.adoptProject = adoptProject;
  }

  async getCapabilities(): Promise<AssistantCapabilities> {
    try {
      const response = await this.client.get('/assistant/capabilities');
      return parseCapabilities(response.data);
    } catch (error) {
      throw mapAssistantError(error);
    }
  }

  async generateProposal(
    projectId: string,
    prompt: string,
    context?: {
      conversation?: AssistantConversationTurn[];
      draftBlueprint?: AppBlueprintV1;
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
    },
  ): Promise<AssistantBuildResult> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/assistant/proposals`,
        {
          prompt,
          conversation: context?.conversation ?? [],
          draftBlueprint: context?.draftBlueprint ?? null,
          providerId: context?.providerId ?? null,
          modelId: context?.modelId ?? null,
          images: context?.images ?? [],
        },
      );
      if (isRecord(response.data) && response.data.kind === 'message') {
        if (typeof response.data.message !== 'string') {
          throw new AssistantError('unexpected', 'The backend returned an invalid assistant message.');
        }
        return { kind: 'message', message: response.data.message };
      }
      return parseProposal(response.data);
    } catch (error) {
      throw mapAssistantError(error);
    }
  }

  async answerHelp(
    projectId: string,
    prompt: string,
    context: {
      conversation?: AssistantConversationTurn[];
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
    } = {},
  ): Promise<AssistantHelpAnswer> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/assistant/help`,
        {
          prompt,
          conversation: context.conversation ?? [],
          providerId: context.providerId ?? null,
          modelId: context.modelId ?? null,
          images: context.images ?? [],
        },
      );
      return parseHelpAnswer(response.data);
    } catch (error) {
      throw mapAssistantError(error);
    }
  }

  async acceptProposal(projectId: string, proposal: AssistantProposalV1): Promise<Project> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/assistant/proposals/${encodeURIComponent(proposal.id)}/accept`,
        { baseRevision: proposal.baseRevision, blueprint: proposal.blueprint },
        { headers: { 'If-Match': `"${proposal.baseRevision}"` } },
      );
      return this.adoptProject(response.data);
    } catch (error) {
      throw mapAssistantError(error);
    }
  }
}

export function parseCapabilities(value: unknown): AssistantCapabilities {
  if (
    !isRecord(value)
    || !isProviderId(value.defaultProviderId)
    || typeof value.helpRetrievalAvailable !== 'boolean'
    || !Array.isArray(value.providers)
  ) {
    throw new AssistantError('unexpected', 'The backend returned invalid assistant capabilities.');
  }
  return {
    defaultProviderId: value.defaultProviderId,
    helpRetrievalAvailable: value.helpRetrievalAvailable,
    providers: value.providers.map(parseProviderCapability),
  };
}

function parseProviderCapability(value: unknown): AssistantProviderCapability {
  if (
    !isRecord(value)
    || !isProviderId(value.provider)
    || typeof value.model !== 'string'
    || typeof value.modelAvailable !== 'boolean'
    || typeof value.imageInput !== 'boolean'
    || (value.location !== 'local' && value.location !== 'remote')
    || typeof value.costWarning !== 'boolean'
    || (value.defaultModelId !== null && typeof value.defaultModelId !== 'string')
    || !Array.isArray(value.models)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid provider capability.');
  }
  return {
    id: value.provider,
    model: value.model,
    available: value.modelAvailable,
    imageInput: value.imageInput,
    location: value.location,
    costWarning: value.costWarning,
    defaultModelId: value.defaultModelId,
    models: value.models.map(parseModelCapability),
  };
}

function parseModelCapability(value: unknown): AssistantModelCapability {
  if (
    !isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.name !== 'string'
    || typeof value.model !== 'string'
    || typeof value.available !== 'boolean'
    || typeof value.imageInput !== 'boolean'
    || (value.location !== 'local' && value.location !== 'remote')
    || typeof value.costWarning !== 'boolean'
    || typeof value.usageNote !== 'string'
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid model capability.');
  }
  return {
    id: value.id,
    name: value.name,
    model: value.model,
    available: value.available,
    imageInput: value.imageInput,
    location: value.location,
    costWarning: value.costWarning,
    usageNote: value.usageNote,
  };
}

function isProviderId(value: unknown): value is AssistantProviderId {
  return value === 'opencode' || value === 'ollama' || value === 'openrouter';
}

export function parseHelpAnswer(value: unknown): AssistantHelpAnswer {
  if (
    !isRecord(value) ||
    typeof value.answer !== 'string' ||
    typeof value.insufficientContext !== 'boolean' ||
    !Array.isArray(value.sources)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid help answer.');
  }
  return {
    answer: value.answer,
    insufficientContext: value.insufficientContext,
    sources: value.sources.map(parseHelpSource),
  };
}

function parseHelpSource(value: unknown): AssistantHelpSource {
  if (
    !isRecord(value) ||
    typeof value.reference !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.uri !== 'string' ||
    (value.heading !== null && typeof value.heading !== 'string') ||
    (value.page !== null && typeof value.page !== 'number')
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid help citation.');
  }
  return {
    reference: value.reference,
    title: value.title,
    uri: value.uri,
    heading: value.heading,
    page: value.page,
  };
}

export function parseProposal(value: unknown): AssistantProposalV1 {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.projectId !== 'string' ||
    typeof value.baseRevision !== 'number' ||
    typeof value.message !== 'string' ||
    !isRecord(value.preview) ||
    value.preview.schemaVersion !== 13 ||
    !Array.isArray(value.preview.screens) ||
    !Array.isArray(value.preview.collections)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid assistant proposal.');
  }
  const blueprint = parseBlueprint(value.blueprint);
  const collections = value.preview.collections.map(parsePreviewCollection);
  return {
    id: value.id,
    projectId: value.projectId,
    baseRevision: value.baseRevision,
    message: value.message,
    blueprint,
    preview: {
      schemaVersion: 13,
      document: {
        screens: value.preview.screens.map((screen, index) =>
          mapScreenFromDto(screen as ScreenDTO, index)),
      },
      collections,
    },
  };
}

function parseBlueprint(value: unknown): AppBlueprintV1 {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.summary !== 'string' ||
    !Array.isArray(value.screens) ||
    !Array.isArray(value.collections)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid app blueprint.');
  }
  return {
    version: 1,
    summary: value.summary,
    screens: value.screens.map(parseScreen),
    collections: value.collections.map(parseCollection),
  };
}

function parseScreen(value: unknown): BlueprintScreen {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.path !== 'string' ||
    !Array.isArray(value.components) ||
    !Array.isArray(value.workflows) ||
    (value.routeParameters !== undefined && !Array.isArray(value.routeParameters)) ||
    (value.recordFields !== undefined && !Array.isArray(value.recordFields))
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint screen.');
  }
  return {
    key: value.key,
    name: value.name,
    path: value.path,
    components: value.components.map(parseComponent),
    workflows: value.workflows.map(parseWorkflow),
    routeParameters: (value.routeParameters ?? []).map(parseRouteParameter),
    recordFields: (value.recordFields ?? []).map(parseRecordField),
  };
}

function parseRouteParameter(value: unknown): BlueprintRouteParameter {
  if (
    !isRecord(value)
    || typeof value.name !== 'string'
    || typeof value.collectionKey !== 'string'
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid route parameter.');
  }
  return { name: value.name, collectionKey: value.collectionKey };
}

function parseRecordField(value: unknown): BlueprintRecordField {
  if (
    !isRecord(value)
    || typeof value.key !== 'string'
    || typeof value.fieldKey !== 'string'
    || (value.name !== undefined && value.name !== null && typeof value.name !== 'string')
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid record field.');
  }
  return { key: value.key, name: value.name, fieldKey: value.fieldKey };
}

function parseComponent(value: unknown): BlueprintComponent {
  const allowed = ['text', 'button', 'input', 'image', 'list', 'checkbox', 'dropdown', 'switch', 'divider'];
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.type !== 'string' || !allowed.includes(value.type)) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint component.');
  }
  return value as BlueprintComponent;
}

function parseWorkflow(value: unknown): BlueprintWorkflow {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.triggerComponentKey !== 'string' ||
    (value.event !== 'click' && value.event !== 'change' && value.event !== 'load') ||
    !Array.isArray(value.actions)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint workflow.');
  }
  return value as unknown as BlueprintWorkflow;
}

function parseCollection(value: unknown): BlueprintCollection {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.name !== 'string' || !Array.isArray(value.fields)) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint collection.');
  }
  return { key: value.key, name: value.name, fields: value.fields.map(parseField) };
}

function parseField(value: unknown): BlueprintField {
  if (
    !isRecord(value) ||
    typeof value.key !== 'string' ||
    typeof value.label !== 'string' ||
    !['text', 'number', 'boolean', 'date'].includes(String(value.type)) ||
    typeof value.required !== 'boolean'
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint field.');
  }
  return value as unknown as BlueprintField;
}

function parsePreviewCollection(value: unknown): AssistantPreviewCollection {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !Array.isArray(value.fields)) {
    throw new AssistantError('unexpected', 'The backend returned an invalid collection preview.');
  }
  return {
    id: value.id,
    name: value.name,
    fields: value.fields.map((field) => {
      if (!isRecord(field) || typeof field.id !== 'string') {
        throw new AssistantError('unexpected', 'The backend returned an invalid collection field preview.');
      }
      return { id: field.id, ...parseField(field) };
    }),
  };
}

export function mapAssistantError(error: unknown): AssistantError {
  if (error instanceof AssistantError) return error;
  if (!axios.isAxiosError(error)) return new AssistantError('unexpected', 'The assistant request failed.');
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? new AssistantError('timeout', 'The assistant took too long. Try a smaller request.')
      : new AssistantError('network', 'The backend could not be reached.');
  }
  const envelope = readApiErrorEnvelope(error.response.data);
  const message = envelope?.error.message ?? 'The assistant request failed.';
  switch (envelope?.error.code) {
    case 'assistant_not_configured': return new AssistantError('not-configured', message);
    case 'assistant_provider_unavailable': return new AssistantError('unavailable', message);
    case 'assistant_provider_quota_exceeded': return new AssistantError('quota-exceeded', message, envelope.error.details);
    case 'assistant_knowledge_unavailable': return new AssistantError('knowledge-unavailable', message);
    case 'invalid_assistant_response': return new AssistantError('validation', message, envelope.error.details);
    case 'invalid_assistant_proposal': return new AssistantError('invalid-proposal', message, envelope.error.details);
    case 'assistant_acceptance_failed': return new AssistantError('apply-failed', message, envelope.error.details);
    case 'validation_error': return new AssistantError('validation', message, envelope.error.details);
    case 'stale_revision': return new AssistantError('stale-revision', 'The project changed after this preview. Generate a new proposal.');
    case 'session_required':
    case 'invalid_session': return new AssistantError('session-expired', message);
    case 'rate_limited': return new AssistantError('rate-limited', message);
    default: return new AssistantError('unexpected', message);
  }
}
