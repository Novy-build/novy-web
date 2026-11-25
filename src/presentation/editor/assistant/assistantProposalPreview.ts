import type { DataCollection } from '@domain/entities/appData';
import type { AssistantProposalV1 } from '@domain/entities/assistant';

export function assistantProposalTitle(proposal: AssistantProposalV1): string {
  const screens = proposal.preview.document.screens;
  return screens.find((screen) => screen.path === '/')?.name
    || screens[0]?.name
    || proposal.blueprint.screens.find((screen) => screen.path === '/')?.name
    || proposal.blueprint.screens[0]?.name
    || 'Your app';
}

export function assistantProposalRagDisclosure(proposal: AssistantProposalV1): {
  usesRag: boolean;
  remoteProfiles: string[];
} {
  const usesRag = proposal.blueprint.screens.some((screen) =>
    screen.workflows.some((workflow) =>
      workflow.actions.some((action) =>
        action.type === 'ingest-document' || action.type === 'answer-with-documents')));
  const remoteProfiles = (proposal.preview.ragProfiles ?? [])
    .filter((profile) => profile.location === 'remote' || profile.costWarning)
    .map((profile) => profile.id);
  return { usesRag, remoteProfiles };
}

/** Proposal schemas only: never load or mutate the project's saved records. */
export function assistantPreviewCollections(proposal: AssistantProposalV1): DataCollection[] {
  return proposal.preview.collections.map((collection) => ({
    id: collection.id,
    projectId: proposal.projectId,
    databaseId: `assistant-preview-${proposal.id}`,
    name: collection.name,
    fields: collection.fields.map(({ id, key, label, type, required }) => ({ id, key, label, type, required })),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
}
