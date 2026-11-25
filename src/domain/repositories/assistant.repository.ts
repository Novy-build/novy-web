import type {
  AssistantCapabilities,
  AssistantBuildResult,
  AssistantConversationTurn,
  AssistantBlueprint,
  AssistantImageAttachment,
  AssistantReferenceAttachment,
  AssistantProviderId,
  AssistantHelpAnswer,
  AssistantProposalV1,
  AssistantViewContext,
  AssistantQualityMode,
  AssistantRenderCapture,
} from '../entities/assistant';
import type { Project } from '../entities/project';

export interface AssistantRepository {
  readonly isAvailable: boolean;
  getCapabilities(): Promise<AssistantCapabilities>;
  generateProposal(
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
  ): Promise<AssistantBuildResult>;
  answerHelp(
    projectId: string,
    prompt: string,
    context?: {
      conversation?: AssistantConversationTurn[];
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
      references?: AssistantReferenceAttachment[];
    },
  ): Promise<AssistantHelpAnswer>;
  acceptProposal(projectId: string, proposal: AssistantProposalV1): Promise<Project>;
  visualReview(
    projectId: string,
    proposal: AssistantProposalV1,
    input: {
      references?: AssistantReferenceAttachment[];
      images?: AssistantImageAttachment[];
      captures: AssistantRenderCapture[];
      providerId?: AssistantProviderId;
      modelId?: string;
    },
  ): Promise<AssistantProposalV1>;
}
