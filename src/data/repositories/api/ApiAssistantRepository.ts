import axios from 'axios';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import type {
  AppBlueprintV1,
  AppBlueprintV2,
  AssistantBlueprint,
  AssistantCapabilities,
  AssistantBuildResult,
  AssistantConversationTurn,
  AssistantHelpAnswer,
  AssistantHelpSource,
  AssistantFeasibilityReport,
  AssistantPreviewCollection,
  AssistantPreviewRagProfile,
  AssistantProposalV1,
  AssistantVerificationReport,
  AssistantImageAttachment,
  AssistantReferenceAttachment,
  AssistantModelCapability,
  AssistantProviderCapability,
  AssistantProviderId,
  AssistantViewContext,
  AssistantQualityMode,
  AssistantStageTrace,
  AssistantVisualCategoryScore,
  AssistantVisualQualityStatus,
  AssistantVisualReview,
  AssistantVisualReviewStatus,
  AssistantRenderCapture,
  AssistantQualityReport,
  BlueprintCollection,
  BlueprintComponent,
  BlueprintDesignChange,
  BlueprintField,
  BlueprintLayoutItem,
  BlueprintRagProfiles,
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

const ASSISTANT_REQUEST_TIMEOUT_MS = 300_000;

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
      draftBlueprint?: AssistantBlueprint;
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
      references?: AssistantReferenceAttachment[];
      view?: AssistantViewContext;
      qualityMode?: AssistantQualityMode;
    },
  ): Promise<AssistantBuildResult> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/assistant/proposals`,
        {
          prompt,
          conversation: context?.conversation ?? [],
          draftBlueprint: context?.draftBlueprint ? toApiBlueprint(context.draftBlueprint) : null,
          providerId: context?.providerId ?? null,
          modelId: context?.modelId ?? null,
          images: context?.images ?? [],
          references: context?.references ?? [],
          view: context?.view ?? null,
          qualityMode: context?.qualityMode ?? 'standard',
        },
        { timeout: ASSISTANT_REQUEST_TIMEOUT_MS },
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
      references?: AssistantReferenceAttachment[];
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
          references: context.references ?? [],
        },
        { timeout: ASSISTANT_REQUEST_TIMEOUT_MS },
      );
      return parseHelpAnswer(response.data);
    } catch (error) {
      throw mapAssistantError(error);
    }
  }

  async visualReview(
    projectId: string,
    proposal: AssistantProposalV1,
    input: {
      references?: AssistantReferenceAttachment[];
      images?: AssistantImageAttachment[];
      captures: AssistantRenderCapture[];
      providerId?: AssistantProviderId;
      modelId?: string;
    },
  ): Promise<AssistantProposalV1> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/assistant/proposals/${encodeURIComponent(proposal.id)}/visual-review`,
        {
          baseRevision: proposal.baseRevision,
          blueprint: toApiBlueprint(proposal.blueprint),
          providerId: input.providerId ?? null,
          modelId: input.modelId ?? null,
          qualityMode: 'high-fidelity',
          references: input.references ?? [],
          images: input.images ?? [],
          captures: input.captures,
        },
        { timeout: ASSISTANT_REQUEST_TIMEOUT_MS },
      );
      return parseProposal(response.data);
    } catch (error) {
      throw mapAssistantError(error);
    }
  }

  async acceptProposal(projectId: string, proposal: AssistantProposalV1): Promise<Project> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/assistant/proposals/${encodeURIComponent(proposal.id)}/accept`,
        { baseRevision: proposal.baseRevision, blueprint: toApiBlueprint(proposal.blueprint) },
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
    || typeof value.designPipelineV2 !== 'boolean'
    || !isReferenceLimits(value.referenceLimits)
    || !Array.isArray(value.providers)
  ) {
    throw new AssistantError('unexpected', 'The backend returned invalid assistant capabilities.');
  }
  return {
    defaultProviderId: value.defaultProviderId,
    helpRetrievalAvailable: value.helpRetrievalAvailable,
    designPipelineV2: value.designPipelineV2,
    referenceLimits: value.referenceLimits,
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
    || !isNonNegativeInteger(value.maxImages)
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
    maxImages: value.maxImages,
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
    || !isNonNegativeInteger(value.maxImages)
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
    maxImages: value.maxImages,
  };
}

function isReferenceLimits(value: unknown): value is AssistantCapabilities['referenceLimits'] {
  return isRecord(value)
    && isPositiveInteger(value.maxCount)
    && isPositiveInteger(value.maxBytesEach)
    && isPositiveInteger(value.maxBytesTotal)
    && isPositiveInteger(value.maxPixelsEach)
    && isPositiveInteger(value.maxPixelsTotal);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
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
    (value.preview.schemaVersion !== 13 && value.preview.schemaVersion !== 14) ||
    !Array.isArray(value.preview.screens) ||
    !Array.isArray(value.preview.collections) ||
    !isRecord(value.verification)
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
      schemaVersion: value.preview.schemaVersion,
      document: {
        ...(value.preview.designSystem
          ? { designSystem: parsePreviewDesignSystem(value.preview.designSystem) }
          : {}),
        screens: value.preview.screens.map((screen, index) =>
          mapScreenFromDto(screen as ScreenDTO, index)),
      },
      collections,
      ragProfiles: parsePreviewRagProfiles(value.preview.ragProfiles),
      seedRecords: parsePreviewSeedRecords(value.preview.seedRecords),
    },
    verification: parseVerification(value.verification),
    feasibility: parseFeasibility(value.feasibility),
    seedRecordCount: isNonNegativeInteger(value.seedRecordCount) ? value.seedRecordCount : 0,
    seedExclusions: Array.isArray(value.seedExclusions)
      ? value.seedExclusions.filter((item): item is string => typeof item === 'string')
      : [],
    deferredIntent: Array.isArray(value.deferredIntent)
      ? value.deferredIntent.filter((item): item is string => typeof item === 'string')
      : [],
    qualityMode: value.qualityMode === 'high-fidelity' ? 'high-fidelity' : 'standard',
    stageTrace: parseStageTrace(value.stageTrace),
    visualReview: parseVisualReview(value.visualReview),
    quality: parseQuality(value.quality),
  };
}

function parseStageTrace(value: unknown): AssistantStageTrace[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AssistantStageTrace[] => {
    if (
      !isRecord(item)
      || typeof item.id !== 'string'
      || (item.status !== 'passed' && item.status !== 'repaired'
        && item.status !== 'skipped' && item.status !== 'failed')
      || !isNonNegativeInteger(item.attempts)
    ) {
      return [];
    }
    return [{
      id: item.id,
      status: item.status,
      attempts: item.attempts,
      repaired: item.repaired === true,
    }];
  });
}

function parseQuality(value: unknown): AssistantQualityReport | undefined {
  if (value === null || value === undefined) return undefined;
  if (
    !isRecord(value)
    || typeof value.passed !== 'boolean'
    || typeof value.label !== 'string'
    || typeof value.overallScore !== 'number'
  ) {
    throw new AssistantError('unexpected', 'The backend returned invalid quality metadata.');
  }
  return {
    passed: value.passed,
    label: value.label,
    overallScore: value.overallScore,
    categoryScores: isRecord(value.categoryScores)
      ? Object.fromEntries(Object.entries(value.categoryScores).filter(([, score]) => typeof score === 'number')) as Record<string, number>
      : {},
    issueCounts: isRecord(value.issueCounts)
      ? Object.fromEntries(Object.entries(value.issueCounts).filter(([, count]) => typeof count === 'number')) as Record<string, number>
      : {},
  };
}

function parseVisualReview(value: unknown): AssistantVisualReview | undefined {
  if (value === null || value === undefined) return undefined;
  if (!isRecord(value) || typeof value.required !== 'boolean') {
    throw new AssistantError('unexpected', 'The backend returned invalid visual-review metadata.');
  }
  const statuses: AssistantVisualReviewStatus[] = [
    'not-required', 'pending', 'reviewed', 'review-failed', 'continued-unreviewed',
  ];
  const qualities: AssistantVisualQualityStatus[] = [
    'unreviewed', 'reviewed', 'review-failed', 'continued-unreviewed',
  ];
  if (
    !statuses.includes(value.status as AssistantVisualReviewStatus)
    || !qualities.includes(value.qualityStatus as AssistantVisualQualityStatus)
    || !Array.isArray(value.captureRequests)
  ) {
    throw new AssistantError('unexpected', 'The backend returned invalid visual-review metadata.');
  }
  const requests = value.captureRequests.flatMap((item) => {
    if (
      !isRecord(item)
      || typeof item.screenKey !== 'string'
      || (item.viewport !== 'mobile' && item.viewport !== 'tablet' && item.viewport !== 'desktop')
    ) {
      return [];
    }
    return [{ screenKey: item.screenKey, viewport: item.viewport as 'mobile' | 'tablet' | 'desktop' }];
  });
  const categoryScores: AssistantVisualCategoryScore[] = Array.isArray(value.categoryScores)
    ? value.categoryScores.flatMap((item) => {
      if (!isRecord(item) || typeof item.category !== 'string' || typeof item.score !== 'number') {
        return [];
      }
      return [{ category: item.category, score: item.score, note: typeof item.note === 'string' ? item.note : '' }];
    })
    : [];
  return {
    required: value.required,
    status: value.status as AssistantVisualReviewStatus,
    qualityStatus: value.qualityStatus as AssistantVisualQualityStatus,
    captureRequests: requests,
    score: typeof value.score === 'number' ? value.score : null,
    categoryScores,
    approximations: Array.isArray(value.approximations)
      ? value.approximations.filter((item): item is string => typeof item === 'string')
      : [],
    summary: typeof value.summary === 'string' ? value.summary : '',
  };
}

function parseFeasibility(value: unknown): AssistantFeasibilityReport | undefined {
  if (value === null || value === undefined) return undefined;
  if (
    !isRecord(value)
    || (value.status !== 'feasible' && value.status !== 'approximate')
    || typeof value.summary !== 'string'
    || !isBoundedScore(value.predictedFidelity)
    || !isNonNegativeInteger(value.approximationCount)
    || !isNonNegativeInteger(value.unsupportedCount)
    || !Array.isArray(value.notices)
  ) {
    throw new AssistantError('unexpected', 'The backend returned invalid feasibility metadata.');
  }
  const severities = ['minor', 'moderate', 'major', 'critical'] as const;
  return {
    status: value.status,
    summary: value.summary,
    predictedFidelity: value.predictedFidelity,
    approximationCount: value.approximationCount,
    unsupportedCount: value.unsupportedCount,
    notices: value.notices.map((notice) => {
      if (
        !isRecord(notice)
        || typeof notice.requirement !== 'string'
        || typeof notice.impact !== 'string'
        || !severities.includes(notice.severity as typeof severities[number])
        || (notice.safeAlternative !== null && typeof notice.safeAlternative !== 'string')
      ) {
        throw new AssistantError('unexpected', 'The backend returned an invalid feasibility notice.');
      }
      return {
        requirement: notice.requirement,
        impact: notice.impact,
        severity: notice.severity as typeof severities[number],
        safeAlternative: notice.safeAlternative,
      };
    }),
  };
}

function isBoundedScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100;
}

function parsePreviewDesignSystem(value: unknown): AppDesignSystem {
  if (
    !isRecord(value)
    || !isRecord(value.colors)
    || !isRecord(value.darkColors)
    || !isRecord(value.typography)
    || !isRecord(value.radii)
    || !Array.isArray(value.styles)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid preview design system.');
  }
  return value as unknown as AppDesignSystem;
}

function parsePreviewRagProfiles(value: unknown): AssistantPreviewRagProfile[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AssistantError('unexpected', 'The backend returned invalid RAG profile metadata.');
  }
  const capabilities = ['embedding', 'chat', 'vector', 'memory', 'reranking'] as const;
  const locations = ['local', 'remote', 'backend'] as const;
  return value.map((candidate) => {
    if (
      !isRecord(candidate)
      || typeof candidate.id !== 'string'
      || !capabilities.includes(candidate.capability as typeof capabilities[number])
      || !locations.includes(candidate.location as typeof locations[number])
      || typeof candidate.costWarning !== 'boolean'
      || typeof candidate.usageNote !== 'string'
    ) {
      throw new AssistantError('unexpected', 'The backend returned an invalid RAG profile entry.');
    }
    return {
      id: candidate.id,
      capability: candidate.capability as AssistantPreviewRagProfile['capability'],
      location: candidate.location as AssistantPreviewRagProfile['location'],
      costWarning: candidate.costWarning,
      usageNote: candidate.usageNote,
    };
  });
}

function parsePreviewSeedRecords(
  value: unknown,
): AssistantProposalV1['preview']['seedRecords'] {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new AssistantError('unexpected', 'The backend returned invalid seed-record metadata.');
  }
  return Object.fromEntries(Object.entries(value).map(([collectionId, records]) => {
    if (!Array.isArray(records) || records.length > 50) {
      throw new AssistantError('unexpected', 'The backend returned invalid seed records.');
    }
    return [collectionId, records.map((record) => {
      if (!isRecord(record) || !isRecord(record.values)) {
        throw new AssistantError('unexpected', 'The backend returned an invalid seed record.');
      }
      return { values: record.values as Record<string, string | number | boolean | null> };
    })];
  }));
}

function parseVerification(value: unknown): AssistantVerificationReport {
  if (
    !isRecord(value)
    || typeof value.passed !== 'boolean'
    || typeof value.repairAttempts !== 'number'
    || !Array.isArray(value.stages)
    || !Array.isArray(value.viewports)
    || !Array.isArray(value.issues)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid assistant verification report.');
  }
  const stageIds = ['contract', 'responsive', 'navigation', 'workflows'] as const;
  const viewportIds = ['mobile', 'tablet', 'desktop'] as const;
  const isStageId = (candidate: unknown): candidate is typeof stageIds[number] =>
    typeof candidate === 'string' && stageIds.includes(candidate as typeof stageIds[number]);
  const isViewportId = (candidate: unknown): candidate is typeof viewportIds[number] =>
    typeof candidate === 'string' && viewportIds.includes(candidate as typeof viewportIds[number]);
  return {
    passed: value.passed,
    repairAttempts: value.repairAttempts,
    stages: value.stages.map((stage) => {
      if (!isRecord(stage) || !isStageId(stage.id) || typeof stage.label !== 'string' || typeof stage.passed !== 'boolean') {
        throw new AssistantError('unexpected', 'The backend returned an invalid assistant verification stage.');
      }
      return { id: stage.id, label: stage.label, passed: stage.passed };
    }),
    viewports: value.viewports.map((viewport) => {
      if (
        !isRecord(viewport)
        || !isViewportId(viewport.id)
        || typeof viewport.width !== 'number'
        || typeof viewport.height !== 'number'
        || typeof viewport.passed !== 'boolean'
      ) {
        throw new AssistantError('unexpected', 'The backend returned an invalid assistant viewport result.');
      }
      return {
        id: viewport.id,
        width: viewport.width,
        height: viewport.height,
        passed: viewport.passed,
      };
    }),
    issues: value.issues.map((issue) => {
      if (
        !isRecord(issue)
        || typeof issue.code !== 'string'
        || typeof issue.message !== 'string'
        || !isStageId(issue.stage)
        || (issue.viewport !== null && !isViewportId(issue.viewport))
        || (issue.screenId !== null && typeof issue.screenId !== 'string')
        || (issue.componentId !== null && typeof issue.componentId !== 'string')
      ) {
        throw new AssistantError('unexpected', 'The backend returned an invalid assistant verification issue.');
      }
      return {
        code: issue.code,
        message: issue.message,
        stage: issue.stage,
        viewport: issue.viewport,
        screenId: issue.screenId,
        componentId: issue.componentId,
      };
    }),
  };
}

export function toApiBlueprint(blueprint: AssistantBlueprint): unknown {
  if (blueprint.version !== 2) return blueprint;
  const { designSystemIntent, ...rest } = blueprint;
  return { ...rest, designSystem: designSystemIntent };
}

function parseBlueprint(value: unknown): AssistantBlueprint {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2) ||
    typeof value.summary !== 'string' ||
    !Array.isArray(value.screens) ||
    !Array.isArray(value.collections)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid app blueprint.');
  }
  const common = {
    summary: value.summary,
    screens: value.screens.map(parseScreen),
    collections: value.collections.map(parseCollection),
    design: parseDesign(value.design),
  };
  const ragProfiles = parseRagProfiles(value.ragProfiles);
  const designChanges = parseDesignChanges(value.designChanges);
  if (value.version === 1) {
    const blueprint: AppBlueprintV1 = { version: 1, ...common };
    if (Object.keys(ragProfiles).length > 0) blueprint.ragProfiles = ragProfiles;
    if (designChanges.length > 0) blueprint.designChanges = designChanges;
    return blueprint;
  }
  const blueprint: AppBlueprintV2 = {
    version: 2,
    ...common,
    designSystemIntent: parseV2DesignSystem(value.designSystem),
    screenIntents: parseV2ScreenIntents(value.screenIntents),
    seedRecords: parseV2SeedRecords(value.seedRecords),
    rationale: typeof value.rationale === 'string' ? value.rationale : '',
    ...(Object.keys(ragProfiles).length > 0 ? { ragProfiles } : {}),
    ...(designChanges.length > 0 ? { designChanges } : {}),
  };
  return blueprint;
}

function parseV2DesignSystem(value: unknown): AppBlueprintV2['designSystemIntent'] {
  if (!isRecord(value) || !isRecord(value.lightPalette) || !isRecord(value.darkPalette)) {
    throw new AssistantError('unexpected', 'The backend returned an invalid V2 design system.');
  }
  const colors = ['primary', 'accent', 'canvas', 'surface', 'surfaceElevated', 'text', 'textMuted', 'border', 'success', 'warning', 'danger'];
  const palette = (source: Record<string, unknown>) => {
    if (!colors.every((key) => typeof source[key] === 'string')) {
      throw new AssistantError('unexpected', 'The backend returned an invalid V2 palette.');
    }
    return Object.fromEntries(colors.map((key) => [key, source[key]])) as unknown as AppBlueprintV2['designSystemIntent']['lightPalette'];
  };
  const fonts = ['inter', 'jetbrains-mono', 'system-sans', 'system-serif'] as const;
  if (
    !fonts.includes(value.bodyFontFamily as typeof fonts[number])
    || !fonts.includes(value.headingFontFamily as typeof fonts[number])
    || !['light', 'dark', 'system'].includes(String(value.defaultTheme))
    || !Array.isArray(value.typeScale)
    || !Array.isArray(value.spacingScale)
    || !Array.isArray(value.radiusScale)
  ) {
    throw new AssistantError('unexpected', 'The backend returned invalid V2 design intent.');
  }
  return {
    defaultTheme: value.defaultTheme as AppBlueprintV2['designSystemIntent']['defaultTheme'],
    lightPalette: palette(value.lightPalette),
    darkPalette: palette(value.darkPalette),
    bodyFontFamily: value.bodyFontFamily as AppBlueprintV2['designSystemIntent']['bodyFontFamily'],
    headingFontFamily: value.headingFontFamily as AppBlueprintV2['designSystemIntent']['headingFontFamily'],
    typeScale: value.typeScale.filter((item): item is number => typeof item === 'number'),
    spacingScale: value.spacingScale.filter((item): item is number => typeof item === 'number'),
    radiusScale: value.radiusScale.filter((item): item is number => typeof item === 'number'),
    rationale: typeof value.rationale === 'string' ? value.rationale : '',
  };
}

function parseV2ScreenIntents(value: unknown): AppBlueprintV2['screenIntents'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AssistantError('unexpected', 'The backend returned invalid V2 screen intent.');
  }
  return value.map((candidate) => {
    if (
      !isRecord(candidate)
      || typeof candidate.key !== 'string'
      || !['start', 'center', 'end', 'space-between'].includes(String(candidate.horizontalStrategy))
      || !['start', 'center', 'end'].includes(String(candidate.verticalStrategy))
      || !['plain', 'subtle', 'outlined', 'elevated'].includes(String(candidate.canvas))
      || !['fixed', 'vertical', 'horizontal', 'none'].includes(String(candidate.scrollIntent))
      || typeof candidate.maxContentWidth !== 'number'
      || !Array.isArray(candidate.layoutGroups)
      || !Array.isArray(candidate.placements)
      || !Array.isArray(candidate.repeatedRows)
      || !Array.isArray(candidate.textBindings)
    ) {
      throw new AssistantError('unexpected', 'The backend returned an invalid V2 screen intent.');
    }
    return candidate as unknown as AppBlueprintV2['screenIntents'][number];
  });
}

function parseV2SeedRecords(value: unknown): AppBlueprintV2['seedRecords'] {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) {
    throw new AssistantError('unexpected', 'The backend returned invalid V2 seed records.');
  }
  return Object.fromEntries(Object.entries(value).map(([key, records]) => {
    if (!Array.isArray(records) || records.length > 50 || records.some((record) => !isRecord(record) || !isRecord(record.values))) {
      throw new AssistantError('unexpected', 'The backend returned invalid V2 seed records.');
    }
    return [key, records as AppBlueprintV2['seedRecords'][string]];
  }));
}

function parseDesignChanges(value: unknown): BlueprintDesignChange[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 25) {
    throw new AssistantError('unexpected', 'The backend returned invalid design changes.');
  }
  const types = [
    'center-horizontal',
    'center-vertical',
    'surface',
    'border',
    'field-style',
    'chat-style',
  ];
  return value.map((candidate) => {
    if (
      !isRecord(candidate)
      || !types.includes(String(candidate.type))
      || typeof candidate.targetComponentKey !== 'string'
      || typeof candidate.value !== 'string'
      || candidate.value.length < 1
      || candidate.value.length > 100
    ) {
      throw new AssistantError('unexpected', 'The backend returned an invalid design change.');
    }
    return candidate as unknown as BlueprintDesignChange;
  });
}

function parseRagProfiles(value: unknown): BlueprintRagProfiles {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) {
    throw new AssistantError('unexpected', 'The backend returned invalid RAG profiles.');
  }
  const roles = ['embedding', 'chat', 'vector', 'memory', 'reranking'] as const;
  const result: BlueprintRagProfiles = {};
  for (const role of roles) {
    const candidate = value[role];
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate !== 'string') {
      throw new AssistantError('unexpected', 'The backend returned an invalid RAG profile id.');
    }
    result[role] = candidate;
  }
  return result;
}

function parseDesign(value: unknown): AppBlueprintV1['design'] {
  const styles = ['product', 'marketing', 'editorial', 'developer'] as const;
  const palettes = ['indigo', 'ocean', 'emerald', 'amber', 'rose', 'violet', 'slate', 'monochrome'] as const;
  const typographies = ['modern-sans', 'editorial-serif', 'technical-mono'] as const;
  const radii = ['sharp', 'soft', 'rounded', 'pill'] as const;
  const densities = ['compact', 'comfortable', 'spacious'] as const;
  const fieldStyles = ['outline', 'underline', 'filled'] as const;
  const alignments = ['start', 'center'] as const;
  const surfaces = ['plain', 'subtle', 'outlined', 'elevated'] as const;
  const horizontalAlignment = isRecord(value) ? value.horizontalAlignment ?? 'start' : undefined;
  const verticalAlignment = isRecord(value) ? value.verticalAlignment ?? 'start' : undefined;
  const surface = isRecord(value) ? value.surface ?? 'plain' : undefined;
  if (
    !isRecord(value)
    || !styles.includes(value.style as typeof styles[number])
    || !palettes.includes(value.palette as typeof palettes[number])
    || !typographies.includes(value.typography as typeof typographies[number])
    || !radii.includes(value.radius as typeof radii[number])
    || !densities.includes(value.density as typeof densities[number])
    || !fieldStyles.includes(value.fieldStyle as typeof fieldStyles[number])
    || !alignments.includes(horizontalAlignment as typeof alignments[number])
    || !alignments.includes(verticalAlignment as typeof alignments[number])
    || !surfaces.includes(surface as typeof surfaces[number])
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint design.');
  }
  return {
    style: value.style as typeof styles[number],
    palette: value.palette as typeof palettes[number],
    typography: value.typography as typeof typographies[number],
    radius: value.radius as typeof radii[number],
    density: value.density as typeof densities[number],
    fieldStyle: value.fieldStyle as typeof fieldStyles[number],
    horizontalAlignment: horizontalAlignment as typeof alignments[number],
    verticalAlignment: verticalAlignment as typeof alignments[number],
    surface: surface as typeof surfaces[number],
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
    || (value.layout !== undefined && !Array.isArray(value.layout))
    || (Array.isArray(value.layout) && value.layout.length > 200)
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid blueprint screen.');
  }
  const screen: BlueprintScreen = {
    key: value.key,
    name: value.name,
    path: value.path,
    components: value.components.map(parseComponent),
    workflows: value.workflows.map(parseWorkflow),
    routeParameters: (value.routeParameters ?? []).map(parseRouteParameter),
    recordFields: (value.recordFields ?? []).map(parseRecordField),
  };
  const layout = (value.layout ?? []).map(parseLayoutItem);
  if (layout.length > 0) screen.layout = layout;
  return screen;
}

function parseLayoutItem(value: unknown): BlueprintLayoutItem {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.order !== 'number') {
    throw new AssistantError('unexpected', 'The backend returned an invalid layout item.');
  }
  if (value.parentKey !== undefined && value.parentKey !== null && typeof value.parentKey !== 'string') {
    throw new AssistantError('unexpected', 'The backend returned an invalid layout parent.');
  }
  if (value.kind === 'component') {
    if (
      typeof value.componentKey !== 'string'
      || (value.width !== 'content' && value.width !== 'stretch')
    ) {
      throw new AssistantError('unexpected', 'The backend returned an invalid component placement.');
    }
    return value as unknown as BlueprintLayoutItem;
  }
  const layouts = ['column', 'row', 'container'];
  const mainAlignments = ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'];
  const crossAlignments = ['start', 'center', 'end', 'stretch'];
  const spacing = ['none', 'compact', 'comfortable', 'spacious'];
  const surfaces = ['plain', 'subtle', 'outlined', 'elevated'];
  const widths = ['content', 'wide', 'full'];
  if (
    value.kind !== 'group'
    || !layouts.includes(String(value.layout))
    || !mainAlignments.includes(String(value.mainAxisAlignment))
    || !crossAlignments.includes(String(value.crossAxisAlignment))
    || !spacing.includes(String(value.gap))
    || !spacing.includes(String(value.padding))
    || !surfaces.includes(String(value.surface))
    || !widths.includes(String(value.width))
  ) {
    throw new AssistantError('unexpected', 'The backend returned an invalid layout group.');
  }
  return value as unknown as BlueprintLayoutItem;
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
  const allowed = ['text', 'button', 'input', 'image', 'list', 'checkbox', 'dropdown', 'switch', 'divider', 'file-input', 'chat'];
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
    case 'assistant_provider_timeout': return new AssistantError('timeout', message, envelope.error.details);
    case 'assistant_provider_quota_exceeded': return new AssistantError('quota-exceeded', message, envelope.error.details);
    case 'assistant_knowledge_unavailable': return new AssistantError('knowledge-unavailable', message);
    case 'invalid_assistant_response': return new AssistantError('validation', message, envelope.error.details);
    case 'assistant_feasibility_blocked': return new AssistantError('feasibility-blocked', message, envelope.error.details);
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
