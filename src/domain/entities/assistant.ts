import type { DataValue } from './appData';
import type { Project } from './project';
import type { ProjectDocument } from './screen';

export type AssistantProviderId = 'opencode' | 'ollama' | 'openrouter';

export interface AssistantModelCapability {
  id: string;
  name: string;
  model: string;
  available: boolean;
  imageInput: boolean;
  location: 'local' | 'remote';
  costWarning: boolean;
  usageNote: string;
  maxImages: number;
}

export interface AssistantProviderCapability {
  id: AssistantProviderId;
  model: string;
  available: boolean;
  imageInput: boolean;
  location: 'local' | 'remote';
  costWarning: boolean;
  defaultModelId: string | null;
  models: AssistantModelCapability[];
  maxImages: number;
}

export interface AssistantReferenceLimits {
  maxCount: number;
  maxBytesEach: number;
  maxBytesTotal: number;
  maxPixelsEach: number;
  maxPixelsTotal: number;
}

export interface AssistantCapabilities {
  defaultProviderId: AssistantProviderId;
  helpRetrievalAvailable: boolean;
  designPipelineV2: boolean;
  referenceLimits: AssistantReferenceLimits;
  providers: AssistantProviderCapability[];
}

export interface AssistantImageAttachment {
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  contentBase64: string;
}

export type AssistantReferenceRole =
  | 'design-reference'
  | 'mobile-reference'
  | 'tablet-reference'
  | 'desktop-reference';

export interface AssistantReferenceAttachment extends AssistantImageAttachment {
  role: AssistantReferenceRole;
  order: number;
}

export type BlueprintFieldType = 'text' | 'number' | 'boolean' | 'date';

export interface BlueprintField {
  key: string;
  label: string;
  type: BlueprintFieldType;
  required: boolean;
}

export interface BlueprintCollection {
  key: string;
  name: string;
  fields: BlueprintField[];
}

export interface BlueprintComponent {
  key: string;
  type: 'text' | 'button' | 'input' | 'image' | 'list' | 'checkbox' | 'dropdown' | 'switch' | 'divider' | 'file-input' | 'chat';
  name?: string;
  [property: string]: unknown;
}

export interface BlueprintDesignChange {
  type: 'center-horizontal' | 'center-vertical' | 'surface' | 'border' | 'field-style' | 'chat-style';
  targetComponentKey: string;
  value: string;
}

export interface AssistantViewComponent {
  key: string;
  type: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  centeredHorizontally: boolean;
  centeredVertically: boolean;
}

export interface AssistantViewContext {
  screenId: string;
  screenName: string;
  screenPath: string;
  components: AssistantViewComponent[];
  selectedComponentKey: string | null;
}

export interface BlueprintRagProfiles {
  embedding?: string | null;
  chat?: string | null;
  vector?: string | null;
  memory?: string | null;
  reranking?: string | null;
}

export interface BlueprintWorkflow {
  key: string;
  name: string;
  triggerComponentKey: string;
  event: 'click' | 'change' | 'load';
  condition?: Record<string, unknown> | null;
  conditions?: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
}

export interface BlueprintRouteParameter {
  name: string;
  collectionKey: string;
}

export interface BlueprintRecordField {
  key: string;
  name?: string | null;
  fieldKey: string;
}

export interface BlueprintLayoutGroup {
  kind: 'group';
  key: string;
  layout: 'column' | 'row' | 'container';
  parentKey?: string | null;
  order: number;
  mainAxisAlignment: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  crossAxisAlignment: 'start' | 'center' | 'end' | 'stretch';
  gap: 'none' | 'compact' | 'comfortable' | 'spacious';
  padding: 'none' | 'compact' | 'comfortable' | 'spacious';
  surface: 'plain' | 'subtle' | 'outlined' | 'elevated';
  width: 'content' | 'wide' | 'full';
}

export interface BlueprintLayoutComponent {
  kind: 'component';
  key: string;
  componentKey: string;
  parentKey?: string | null;
  order: number;
  width: 'content' | 'stretch';
}

export type BlueprintLayoutItem = BlueprintLayoutGroup | BlueprintLayoutComponent;

export interface BlueprintScreen {
  key: string;
  name: string;
  path: string;
  components: BlueprintComponent[];
  workflows: BlueprintWorkflow[];
  routeParameters?: BlueprintRouteParameter[];
  recordFields?: BlueprintRecordField[];
  layout?: BlueprintLayoutItem[];
}

export interface BlueprintDesign {
  style: 'product' | 'marketing' | 'editorial' | 'developer';
  palette: 'indigo' | 'ocean' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' | 'monochrome';
  typography: 'modern-sans' | 'editorial-serif' | 'technical-mono';
  radius: 'sharp' | 'soft' | 'rounded' | 'pill';
  density: 'compact' | 'comfortable' | 'spacious';
  fieldStyle: 'outline' | 'underline' | 'filled';
  /** Omitted only by legacy in-memory fixtures; current backend proposals always provide these. */
  horizontalAlignment?: 'start' | 'center';
  verticalAlignment?: 'start' | 'center';
  surface?: 'plain' | 'subtle' | 'outlined' | 'elevated';
}

export interface AppBlueprintV1 {
  version: 1;
  summary: string;
  screens: BlueprintScreen[];
  collections: BlueprintCollection[];
  design: BlueprintDesign;
  designChanges?: BlueprintDesignChange[];
  ragProfiles?: BlueprintRagProfiles;
}

export interface AssistantPreviewCollection {
  id: string;
  name: string;
  fields: Array<BlueprintField & { id: string }>;
}

export interface AssistantPreviewRagProfile {
  id: string;
  capability: 'embedding' | 'chat' | 'vector' | 'memory' | 'reranking';
  location: 'local' | 'remote' | 'backend';
  costWarning: boolean;
  usageNote: string;
}

export type AssistantVerificationStageId = 'contract' | 'responsive' | 'navigation' | 'workflows';
export type AssistantVerificationViewportId = 'mobile' | 'tablet' | 'desktop';

export interface AssistantVerificationReport {
  passed: boolean;
  repairAttempts: number;
  stages: Array<{
    id: AssistantVerificationStageId;
    label: string;
    passed: boolean;
  }>;
  viewports: Array<{
    id: AssistantVerificationViewportId;
    width: number;
    height: number;
    passed: boolean;
  }>;
  issues: Array<{
    code: string;
    message: string;
    stage: AssistantVerificationStageId;
    viewport: AssistantVerificationViewportId | null;
    screenId: string | null;
    componentId: string | null;
  }>;
}

export interface AssistantFeasibilityNotice {
  requirement: string;
  impact: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  safeAlternative: string | null;
}

export interface AssistantFeasibilityReport {
  status: 'feasible' | 'approximate';
  summary: string;
  predictedFidelity: number;
  approximationCount: number;
  unsupportedCount: number;
  notices: AssistantFeasibilityNotice[];
}

export interface V2SemanticColorSet {
  primary: string;
  accent: string;
  canvas: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface V2DesignSystemIntent {
  defaultTheme: 'light' | 'dark' | 'system';
  lightPalette: V2SemanticColorSet;
  darkPalette: V2SemanticColorSet;
  bodyFontFamily: 'inter' | 'jetbrains-mono' | 'system-sans' | 'system-serif';
  headingFontFamily: 'inter' | 'jetbrains-mono' | 'system-sans' | 'system-serif';
  typeScale: number[];
  spacingScale: number[];
  radiusScale: number[];
  rationale: string;
}

export interface V2ScreenIntent {
  key: string;
  horizontalStrategy: 'start' | 'center' | 'end' | 'space-between';
  verticalStrategy: 'start' | 'center' | 'end';
  canvas: 'plain' | 'subtle' | 'outlined' | 'elevated';
  safeArea: number;
  scrollIntent: 'fixed' | 'vertical' | 'horizontal' | 'none';
  maxContentWidth: number;
  referenceViewport: { width: number; height: number; viewportClass: string } | null;
  desktopBehavior: 'compact' | 'preserve' | 'expand';
  viewportFill: boolean;
  rootHeight: boolean;
  layoutGroups: Array<Record<string, unknown>>;
  placements: Array<Record<string, unknown>>;
  repeatedRows: Array<Record<string, unknown>>;
  textBindings: Array<Record<string, unknown>>;
}

export interface AppBlueprintV2 extends Omit<AppBlueprintV1, 'version'> {
  version: 2;
  designSystemIntent: V2DesignSystemIntent;
  screenIntents: V2ScreenIntent[];
  seedRecords: Record<string, Array<{ values: Record<string, string | number | boolean | null> }>>;
  rationale: string;
}

export type AssistantBlueprint = AppBlueprintV1 | AppBlueprintV2;

export interface AssistantProposalV1 {
  id: string;
  projectId: string;
  baseRevision: number;
  message: string;
  blueprint: AssistantBlueprint;
  preview: {
    schemaVersion: 13 | 14;
    document: ProjectDocument;
    collections: AssistantPreviewCollection[];
    ragProfiles?: AssistantPreviewRagProfile[];
    seedRecords?: Record<string, Array<{ values: Record<string, DataValue> }>>;
  };
  verification?: AssistantVerificationReport;
  feasibility?: AssistantFeasibilityReport;
  seedRecordCount?: number;
  seedExclusions?: string[];
  deferredIntent?: string[];
  qualityMode?: AssistantQualityMode;
  stageTrace?: AssistantStageTrace[];
  visualReview?: AssistantVisualReview;
  quality?: AssistantQualityReport;
}

export interface AssistantQualityReport {
  passed: boolean;
  label: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  issueCounts: Record<string, number>;
}

export type AssistantQualityMode = 'standard' | 'high-fidelity';
export type AssistantStageStatus = 'passed' | 'repaired' | 'skipped' | 'failed';

export interface AssistantStageTrace {
  id: string;
  status: AssistantStageStatus;
  attempts: number;
  repaired: boolean;
}

export type AssistantVisualQualityStatus =
  | 'unreviewed'
  | 'reviewed'
  | 'review-failed'
  | 'continued-unreviewed';
export type AssistantVisualReviewStatus =
  | 'not-required'
  | 'pending'
  | 'reviewed'
  | 'review-failed'
  | 'continued-unreviewed';

export interface AssistantCaptureRequest {
  screenKey: string;
  viewport: 'mobile' | 'tablet' | 'desktop';
}

export interface AssistantRenderCapture {
  screenKey: string;
  viewport: 'mobile' | 'tablet' | 'desktop';
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  contentBase64: string;
  order: number;
}

export interface AssistantVisualCategoryScore {
  category: string;
  score: number;
  note: string;
}

export interface AssistantVisualReview {
  required: boolean;
  status: AssistantVisualReviewStatus;
  qualityStatus: AssistantVisualQualityStatus;
  captureRequests: AssistantCaptureRequest[];
  score?: number | null;
  categoryScores?: AssistantVisualCategoryScore[];
  approximations?: string[];
  summary?: string;
}

export interface AssistantBuildMessage {
  kind: 'message';
  message: string;
}

export type AssistantBuildResult = AssistantProposalV1 | AssistantBuildMessage;

export interface AcceptedAssistantProposal {
  project: Project;
}

export interface AssistantConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantHelpSource {
  reference: string;
  title: string;
  uri: string;
  heading: string | null;
  page: number | null;
}

export interface AssistantHelpAnswer {
  answer: string;
  insufficientContext: boolean;
  sources: AssistantHelpSource[];
}
