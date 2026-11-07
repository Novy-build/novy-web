import { describe, expect, it } from 'vitest';
import type { Template } from '../entities/template';
import type { ComponentNode, TextNode } from '../entities/componentNode';
import { createProjectFromTemplate, createScreen } from './screen';

const SAMPLE_NODE: TextNode = {
  id: 'node_fixed',
  type: 'text',
  x: 10,
  y: 20,
  w: 100,
  h: 24,
  props: { text: 'Sample', level: 'body' },
};

const TEMPLATE: Template = {
  id: 'template_test',
  name: 'Test template',
  description: 'For factory tests',
  screens: [
    {
      id: 'screen_template',
      name: 'Home',
      path: '/',
      nodes: [SAMPLE_NODE],
      behaviors: [],
      logicGraphs: [],
    },
  ],
};

describe('createScreen', () => {
  it('starts with empty nodes, behaviors and graphs', () => {
    const screen = createScreen({ name: 'Home' });

    expect(screen.name).toBe('Home');
    expect(screen.nodes).toEqual([]);
    expect(screen.behaviors).toEqual([]);
    expect(screen.logicGraphs).toEqual([]);
  });

  it('accepts initial nodes', () => {
    const screen = createScreen({ name: 'Home', nodes: [SAMPLE_NODE] });
    expect(screen.nodes).toEqual([SAMPLE_NODE]);
  });
});

describe('createProjectFromTemplate', () => {
  const now = new Date('2026-01-01T10:00:00.000Z');

  it('copies template screens into a fresh project', () => {
    const project = createProjectFromTemplate(TEMPLATE, 'My App', now);

    expect(project.id).toMatch(/^project_/);
    expect(project.name).toBe('My App');
    expect(project.createdAt).toBe(now);
    expect(project.updatedAt).toBe(now);
    expect(project.document.screens).toHaveLength(1);
  });

  it('regenerates screen ids so projects do not share template ids', () => {
    const project = createProjectFromTemplate(TEMPLATE, 'My App', now);
    const screen = project.document.screens[0];

    expect(screen.id).not.toBe(TEMPLATE.screens[0].id);
    expect(screen.name).toBe('Home');
  });

  it('keeps template node contents deep-cloned', () => {
    const project = createProjectFromTemplate(TEMPLATE, 'My App', now);
    const screen = project.document.screens[0];

    expect(screen.nodes).toEqual([TEMPLATE.screens[0].nodes[0]]);
    expect(screen.nodes[0]).not.toBe(TEMPLATE.screens[0].nodes[0]);

    // Mutating the project must not leak into the template definition.
    (screen.nodes[0] as TextNode).props.text = 'Mutated';
    expect((TEMPLATE.screens[0].nodes[0] as ComponentNode & { props: { text: string } }).props.text).toBe('Sample');
  });
});
