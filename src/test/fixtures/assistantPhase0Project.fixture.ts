import { createPadding } from '@domain/entities/componentNode';
import { DEFAULT_APP_DESIGN_SYSTEM } from '@domain/entities/designSystem';
import type { Project } from '@domain/entities/project';
import type { ProjectDTO } from '@data/dto/project.dto';

/** Mapper-derived Project v14 lock used by the cross-repository assistant baseline. */
export const ASSISTANT_PHASE0_PROJECT: Project = {
  id: 'project_assistant_phase0',
  name: 'Assistant Phase 0',
  projectType: 'app',
  createdAt: new Date('2026-11-24T00:00:00Z'),
  updatedAt: new Date('2026-11-24T01:00:00Z'),
  document: {
    designSystem: DEFAULT_APP_DESIGN_SYSTEM,
    screens: [{
      id: 'screen_home',
      name: 'Home',
      path: '/',
      appearance: { backgroundColor: '#f5f6f8' },
      nodes: [{
        id: 'column_content',
        name: 'Content',
        type: 'column',
        x: 24,
        y: 24,
        w: 342,
        h: 280,
        props: {
          mainAxisAlignment: 'start',
          crossAxisAlignment: 'stretch',
          gap: 12,
          padding: createPadding(16),
        },
        children: [{
          id: 'text_heading',
          name: 'Heading',
          type: 'text',
          x: 0,
          y: 0,
          w: 310,
          h: 52,
          props: { text: 'Current assistant baseline', level: 'display' },
          responsive: { desktop: { w: 420 } },
        }, {
          id: 'button_continue',
          name: 'Continue',
          type: 'button',
          x: 0,
          y: 64,
          w: 180,
          h: 44,
          props: { label: 'Continue', variant: 'solid' },
        }],
      }],
      behaviors: [],
      logicGraphs: [],
    }],
  },
};

export const ASSISTANT_PHASE0_PROJECT_DTO: ProjectDTO = {
  schemaVersion: 14,
  id: 'project_assistant_phase0',
  name: 'Assistant Phase 0',
  projectType: 'app',
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T01:00:00.000Z',
  designSystem: DEFAULT_APP_DESIGN_SYSTEM,
  screens: [{
    id: 'screen_home',
    name: 'Home',
    path: '/',
    appearance: { backgroundColor: '#f5f6f8' },
    nodes: [{
      id: 'column_content',
      name: 'Content',
      type: 'column',
      x: 24,
      y: 24,
      w: 342,
      h: 280,
      props: {
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'stretch',
        gap: 12,
        padding: createPadding(16),
      },
      children: [{
        id: 'text_heading',
        name: 'Heading',
        type: 'text',
        x: 0,
        y: 0,
        w: 310,
        h: 52,
        props: { text: 'Current assistant baseline', level: 'display' },
        responsive: { desktop: { w: 420 } },
      }, {
        id: 'button_continue',
        name: 'Continue',
        type: 'button',
        x: 0,
        y: 64,
        w: 180,
        h: 44,
        props: { label: 'Continue', variant: 'solid' },
      }],
    }],
    behaviors: [],
    logicGraphs: [],
  }],
};
