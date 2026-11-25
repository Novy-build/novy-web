import { describe, expect, it } from 'vitest';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import { assistantPreviewCollections, assistantProposalRagDisclosure, assistantProposalTitle } from './assistantProposalPreview';

const PROPOSAL: AssistantProposalV1 = {
  id: 'draft', projectId: 'project', baseRevision: 1, message: 'Build inventory',
  blueprint: {
    version: 1,
    summary: 'Track equipment',
    screens: [],
    collections: [],
    design: {
      style: 'product',
      palette: 'indigo',
      typography: 'modern-sans',
      radius: 'soft',
      density: 'comfortable', fieldStyle: 'outline',
    },
  },
  preview: {
    schemaVersion: 14,
    document: { screens: [{ id: 'home', name: 'Equipment', path: '/', nodes: [], behaviors: [], logicGraphs: [] }] },
    collections: [{ id: 'equipment', name: 'Equipment', fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }] }],
  },
};

describe('assistant proposal preview', () => {
  it('uses the actual compiled home screen name', () => {
    expect(assistantProposalTitle(PROPOSAL)).toBe('Equipment');
  });

  it('adapts preview schemas without importing records or mutating the proposal', () => {
    const before = structuredClone(PROPOSAL);
    const collections = assistantPreviewCollections(PROPOSAL);
    expect(collections[0]).toMatchObject({
      id: 'equipment', projectId: 'project', databaseId: 'assistant-preview-draft',
      fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
    });
    expect(PROPOSAL).toEqual(before);
    expect(collections[0]?.fields).not.toBe(PROPOSAL.preview.collections[0]?.fields);
  });

  it('discloses RAG usage and remote profile costs from the proposal', () => {
    const ragProposal: AssistantProposalV1 = {
      ...PROPOSAL,
      blueprint: {
        ...PROPOSAL.blueprint,
        screens: [{
          key: 'home', name: 'Documents', path: '/',
          components: [{ key: 'picker', type: 'file-input' }],
          workflows: [{
            key: 'ingest', name: 'Ingest', triggerComponentKey: 'picker', event: 'change',
            actions: [{ type: 'ingest-document', fileInputKey: 'picker' }],
          }],
        }],
      },
      preview: {
        ...PROPOSAL.preview,
        ragProfiles: [{
          id: 'openrouter-chat', capability: 'chat', location: 'remote',
          costWarning: true, usageNote: 'remote',
        }],
      },
    };
    expect(assistantProposalRagDisclosure(ragProposal)).toEqual({
      usesRag: true,
      remoteProfiles: ['openrouter-chat'],
    });
    expect(assistantProposalRagDisclosure(PROPOSAL)).toEqual({ usesRag: false, remoteProfiles: [] });
  });
});

