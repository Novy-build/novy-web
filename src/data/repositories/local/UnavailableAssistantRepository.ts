import { AssistantError } from '@domain/errors/AssistantError';
import type {
  AppBlueprintV1,
  AssistantCapabilities,
  AssistantBuildResult,
  AssistantConversationTurn,
  AssistantHelpAnswer,
  AssistantProposalV1,
  AssistantImageAttachment,
  AssistantProviderId,
} from '@domain/entities/assistant';
import type { Project } from '@domain/entities/project';
import type { AssistantRepository } from '@domain/repositories/assistant.repository';

export class UnavailableAssistantRepository implements AssistantRepository {
  readonly isAvailable = false;

  async getCapabilities(): Promise<AssistantCapabilities> {
    return {
      defaultProviderId: 'opencode',
      helpRetrievalAvailable: false,
      providers: [],
    };
  }

  async generateProposal(
    _projectId: string,
    _prompt: string,
    _context?: {
      conversation?: AssistantConversationTurn[];
      draftBlueprint?: AppBlueprintV1;
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
    },
  ): Promise<AssistantBuildResult> {
    throw new AssistantError(
      'not-configured',
      'Connect Novy to FastAPI and configure at least one assistant provider.',
    );
  }

  async answerHelp(
    _projectId: string,
    _prompt: string,
    _context?: {
      conversation?: AssistantConversationTurn[];
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
    },
  ): Promise<AssistantHelpAnswer> {
    throw new AssistantError('not-configured', 'The AI assistant is not configured.');
  }

  async acceptProposal(_projectId: string, _proposal: AssistantProposalV1): Promise<Project> {
    throw new AssistantError('not-configured', 'The AI assistant is not configured.');
  }
}
