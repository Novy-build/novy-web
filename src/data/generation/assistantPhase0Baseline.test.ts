import { describe, expect, it } from 'vitest';
import { mapProjectToDto } from '@data/mappers/project.mapper';
import {
  ASSISTANT_PHASE0_PROJECT,
  ASSISTANT_PHASE0_PROJECT_DTO,
} from '@test/fixtures/assistantPhase0Project.fixture';
import { buildGeneratedAppManifest } from './generatedAppManifest';
import { mapProjectToGeneratedLayout } from './generatedLayout';

function serialized<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe('assistant Phase 0 contract baseline', () => {
  it('locks the representative mapper output to Project schema v14', () => {
    expect(mapProjectToDto(ASSISTANT_PHASE0_PROJECT)).toEqual(ASSISTANT_PHASE0_PROJECT_DTO);
  });

  it('locks generated manifest v2 and generated layout v2', () => {
    const layout = mapProjectToGeneratedLayout(ASSISTANT_PHASE0_PROJECT);
    const manifest = buildGeneratedAppManifest(
      ASSISTANT_PHASE0_PROJECT,
      null,
      [],
      new Date('2026-11-24T02:00:00Z'),
    );

    expect(layout.layoutVersion).toBe(2);
    expect(manifest.manifestVersion).toBe(2);
    expect(manifest.project.schemaVersion).toBe(14);
    expect(manifest.layout).toEqual(layout);
    expect(manifest.project).toEqual(ASSISTANT_PHASE0_PROJECT_DTO);
  });

  it('keeps preview ProjectDTO geometry aligned with generated renderer geometry', () => {
    const projectDto = mapProjectToDto(ASSISTANT_PHASE0_PROJECT);
    const layout = mapProjectToGeneratedLayout(ASSISTANT_PHASE0_PROJECT);

    expect(serialized(layout.screens[0]?.nodes)).toEqual(serialized(projectDto.screens[0]?.nodes));
    expect(serialized(layout.screens[0]?.appearance)).toEqual(
      serialized(projectDto.screens[0]?.appearance),
    );
  });
});
