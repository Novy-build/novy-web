import type {
  AppBlueprintV1,
  AssistantCapabilities,
  AssistantBuildResult,
  AssistantConversationTurn,
  AssistantImageAttachment,
  AssistantProviderId,
  AssistantHelpAnswer,
  AssistantProposalV1,
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
      draftBlueprint?: AppBlueprintV1;
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
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
    },
  ): Promise<AssistantHelpAnswer>;
  acceptProposal(projectId: string, proposal: AssistantProposalV1): Promise<Project>;
}
