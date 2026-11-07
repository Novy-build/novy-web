import { describe, expect, it } from 'vitest';
import type { DataCollection, ProjectDatabase } from '@domain/entities/appData';
import type { Project } from '@domain/entities/project';
import { buildGeneratedAppManifest, generatedAppManifestFilename } from './generatedAppManifest';

const database: ProjectDatabase = {
  id: 'database_notes',
  projectId: 'project_notes',
  name: 'Notes database',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const collection: DataCollection = {
  id: 'notes',
  projectId: 'project_notes',
  databaseId: database.id,
  name: 'Notes',
  fields: [{ id: 'title', key: 'title', label: 'Title', type: 'text', required: true }],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const project: Project = {
  id: 'project_notes',
  name: 'Private Notes',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  document: {
    screens: [{
      id: 'screen_home',
      name: 'Home',
      path: '/',
      nodes: [{
        id: 'camera_face',
        type: 'camera',
        x: 24,
        y: 24,
        w: 320,
        h: 220,
        props: { label: 'Face camera', facingMode: 'user', captureLabel: 'Capture' },
      }],
      behaviors: [],
      logicGraphs: [{
        id: 'graph_integrations',
        name: 'Integrations',
        sourceNodeId: 'camera_face',
        nodes: [
          { kind: 'trigger', id: 'trigger', event: 'change', position: { x: 80, y: 160 } },
          { kind: 'action', id: 'query', payload: { type: 'vector-retrieve', connectionProfileId: 'vector-profile', indexName: 'notes', namespace: '', topK: 5, minimumScore: 0, metadataFilter: {} }, position: { x: 312, y: 80 } },
          { kind: 'action', id: 'verify', payload: { type: 'cv-verify', mediaReference: '' }, position: { x: 312, y: 200 } },
          { kind: 'action', id: 'email', payload: { type: 'send-email', to: '', subject: 'Note', body: '' }, position: { x: 544, y: 80 } },
        ],
        edges: [],
      }],
    }],
  },
};

describe('generated app manifest', () => {
  it('packages project JSON, data schema, routes, and inferred runtime requirements', () => {
    const manifest = buildGeneratedAppManifest(
      project,
      database,
      [collection],
      new Date('2026-11-07T12:00:00Z'),
    );

    expect(manifest).toMatchObject({
      manifestVersion: 1,
      generatedAt: '2026-11-07T12:00:00.000Z',
      project: { schemaVersion: 5, id: 'project_notes' },
      appData: {
        database: { id: 'database_notes' },
        recordsIncluded: false,
      },
      runtime: {
        routes: [{ screenId: 'screen_home', path: '/' }],
        responsiveBreakpoints: { tabletMinWidth: 768, desktopMinWidth: 1024 },
      },
      security: {
        secretsIncluded: false,
        rawMediaIncluded: false,
        biometricTemplatesIncluded: false,
      },
    });
    expect(manifest.runtime.requirements.map((requirement) => requirement.capability)).toEqual([
      'authentication',
      'camera',
      'computer-vision',
      'database',
      'deployment',
      'email',
      'rag',
    ]);
    expect(JSON.stringify(manifest)).not.toContain('data:image');
  });

  it('creates a stable, filesystem-safe export name', () => {
    expect(generatedAppManifestFilename(' Private Notes! ')).toBe('private-notes-handoff.json');
    expect(generatedAppManifestFilename('   ')).toBe('novy-project-handoff.json');
  });
});
