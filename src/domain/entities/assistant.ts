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
}

export interface AssistantCapabilities {
  defaultProviderId: AssistantProviderId;
  helpRetrievalAvailable: boolean;
  providers: AssistantProviderCapability[];
}

export interface AssistantImageAttachment {
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  contentBase64: string;
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
  type: 'text' | 'button' | 'input' | 'image' | 'list' | 'checkbox' | 'dropdown' | 'switch' | 'divider';
  name?: string;
  [property: string]: unknown;
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

export interface BlueprintScreen {
  key: string;
  name: string;
  path: string;
  components: BlueprintComponent[];
  workflows: BlueprintWorkflow[];
  routeParameters?: BlueprintRouteParameter[];
  recordFields?: BlueprintRecordField[];
}

export interface AppBlueprintV1 {
  version: 1;
  summary: string;
  screens: BlueprintScreen[];
  collections: BlueprintCollection[];
}

export interface AssistantPreviewCollection {
  id: string;
  name: string;
  fields: Array<BlueprintField & { id: string }>;
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

export interface AssistantProposalV1 {
  id: string;
  projectId: string;
  baseRevision: number;
  message: string;
  blueprint: AppBlueprintV1;
  preview: {
    schemaVersion: 13 | 14;
    document: ProjectDocument;
    collections: AssistantPreviewCollection[];
  };
  verification?: AssistantVerificationReport;
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
