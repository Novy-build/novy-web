import { AssistantError } from '@domain/errors/AssistantError';
import type {
  AssistantBlueprint,
  AssistantCapabilities,
  AssistantBuildResult,
  AssistantConversationTurn,
  AssistantHelpAnswer,
  AssistantProposalV1,
  AssistantImageAttachment,
  AssistantReferenceAttachment,
  AssistantProviderId,
  AssistantRenderCapture,
} from '@domain/entities/assistant';
import type { Project } from '@domain/entities/project';
import type { AssistantRepository } from '@domain/repositories/assistant.repository';

export class UnavailableAssistantRepository implements AssistantRepository {
  readonly isAvailable = false;

  async getCapabilities(): Promise<AssistantCapabilities> {
    return {
      defaultProviderId: 'opencode',
      helpRetrievalAvailable: false,
      designPipelineV2: false,
      referenceLimits: {
        maxCount: 1,
        maxBytesEach: 3 * 1024 * 1024,
        maxBytesTotal: 3 * 1024 * 1024,
        maxPixelsEach: 16_000_000,
        maxPixelsTotal: 16_000_000,
      },
      providers: [],
    };
  }

  async generateProposal(
    _projectId: string,
    _prompt: string,
    _context?: {
      conversation?: AssistantConversationTurn[];
      draftBlueprint?: AssistantBlueprint;
      providerId?: AssistantProviderId;
      modelId?: string;
      images?: AssistantImageAttachment[];
      references?: AssistantReferenceAttachment[];
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
      references?: AssistantReferenceAttachment[];
    },
  ): Promise<AssistantHelpAnswer> {
    throw new AssistantError('not-configured', 'The AI assistant is not configured.');
  }

  async acceptProposal(_projectId: string, _proposal: AssistantProposalV1): Promise<Project> {
    throw new AssistantError('not-configured', 'The AI assistant is not configured.');
  }

  async visualReview(
    _projectId: string,
    _proposal: AssistantProposalV1,
    _input: {
      references?: AssistantReferenceAttachment[];
      images?: AssistantImageAttachment[];
      captures: AssistantRenderCapture[];
      providerId?: AssistantProviderId;
      modelId?: string;
    },
  ): Promise<AssistantProposalV1> {
    throw new AssistantError('not-configured', 'The AI assistant is not configured.');
  }
}
