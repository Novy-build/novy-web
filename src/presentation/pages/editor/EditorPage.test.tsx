import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import type { Repositories } from '@data/repositories/local';
import type { Project } from '@domain/entities/project';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import type { ProjectDocument } from '@domain/entities/screen';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';
import { makeListView } from '@test/editorFixtures';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function renderRoutesAt(path: string, repositories?: Repositories) {
  render(
    <RepositoriesProvider repositories={repositories ?? createStubRepositories({ sessionUser: STUB_USER })}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

describe('EditorPage (integration over the real route tree)', () => {
  it('mounts the design workspace for an existing project', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    expect(projects).toHaveLength(1);

    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);

    const canvas = await screen.findByTestId('canvas-frame', {}, { timeout: 5_000 });
    expect(within(canvas).getByText('Hello, World!')).toBeInTheDocument();
    expect(within(canvas).getByText('Press the button to change the text above.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Editor' })).toBeInTheDocument();
  });

  it('minimizes and restores the design Inspector panel without overlaying its content', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByTestId('canvas-frame');

    const collapse = screen.getByRole('button', { name: 'Collapse inspector panel' });
    expect(collapse).not.toHaveClass('absolute');
    expect(collapse.parentElement).toHaveTextContent('Inspector');
    expect(screen.getByTestId('inspector-properties-region')).toHaveClass('min-h-40', 'overflow-hidden');
    expect(screen.getByTestId('inspector-layers-region')).toHaveClass('min-h-28', 'overflow-hidden');
    fireEvent.click(collapse);
    expect(screen.queryByRole('region', { name: 'Inspector' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'inspector panel minimized' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand inspector panel' }));
    expect(screen.getByRole('region', { name: 'Inspector' })).toBeInTheDocument();
  });

  it('switches to the Logic workspace and back to design', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByRole('button', { name: 'Hello, World!' });

    // The demo project ships without workflows; Logic still opens the full
    // node library and dotted canvas instead of a blocking empty-state card.
    fireEvent.click(screen.getByRole('button', { name: 'logic' }));
    expect(await screen.findByRole('heading', { name: 'Nodes' })).toBeInTheDocument();
    expect(screen.getByTestId('logic-stage')).toBeInTheDocument();
    expect(screen.getByText(/Add a trigger node from Nodes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New behavior' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'design' }));
    expect(await screen.findByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('keeps Figma-style Layers selection and canvas visibility in sync', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    const canvas = await screen.findByTestId('canvas-frame');
    const sidebar = screen.getByRole('complementary', { name: 'Editor sidebar' });

    const heroLayer = within(sidebar).getByRole('button', { name: 'Text — Hello, World!' });
    fireEvent.click(heroLayer);
    expect(canvas.querySelector('[data-node-id][data-selected="true"]')).toHaveAttribute(
      'data-selected',
      'true',
    );

    fireEvent.click(within(sidebar).getByRole('button', { name: 'Hide Text — Hello, World!' }));
    expect(within(canvas).queryByText('Hello, World!')).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Text — Hello, World!' })).toBeInTheDocument();
  });

  it('places, edits, and previews a ListView component', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByTestId('canvas-frame');

    fireEvent.click(screen.getByRole('tab', { name: 'assets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add ListView' }));
    expect(screen.getByText('Design how each item displayed in this ListView should look.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(screen.getByText(/Item design/)).toBeInTheDocument();
    expect(screen.getByTestId('canvas-frame')).toHaveStyle({ width: '320px', height: '800px' });
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Text content' }), { target: { value: 'value' } });
    fireEvent.click(screen.getByRole('button', { name: 'Exit item design' }));
    expect(screen.getByTestId('listview-item-outlines')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Static items'), {
      target: { value: 'First note\nSecond note' },
    });
    expect(screen.queryByTestId('listview-item-outlines')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = await screen.findByRole('dialog');
    expect(within(preview).getByText('First note')).toBeInTheDocument();
    expect(within(preview).getByText('Second note')).toBeInTheDocument();
  });

  it('previews the active screen and closes again', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByRole('button', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Previewing Hello, World!');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('button', { name: 'Preview' })).toBeInTheDocument();
  });

  it('previews and explicitly applies a backend assistant proposal', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    const current = await repositories.projects.getProject(projects[0]!.id);
    if (!current) throw new Error('Expected seeded project.');
    const acceptedDocument = {
      screens: current.document.screens.map((candidate, index) => index === 0 ? {
        ...candidate,
        nodes: [...candidate.nodes, {
          id: 'assistant_sign_up',
          type: 'button' as const,
          x: 24,
          y: 680,
          w: 160,
          h: 44,
          props: { label: 'Sign up', variant: 'solid' as const },
        }],
      } : candidate),
    };
    const proposal = {
      id: 'proposal_signup',
      projectId: current.id,
      baseRevision: 1,
      message: 'A complete signup app proposal.',
      blueprint: {
        version: 1 as const,
        summary: 'A complete signup app proposal.',
        screens: [{
          key: 'home', name: 'Home', path: '/',
          components: [{ key: 'signup', type: 'button' as const, label: 'Sign up' }],
          workflows: [],
        }],
        collections: [],
      },
      preview: { schemaVersion: 13 as const, document: acceptedDocument, collections: [] },
    };
    repositories.assistant = {
      isAvailable: true,
      getCapabilities: vi.fn().mockResolvedValue({
        defaultProviderId: 'opencode', helpRetrievalAvailable: true,
        providers: [{
          id: 'opencode', model: 'nemotron-free', available: true,
          imageInput: true, location: 'remote', costWarning: false,
          defaultModelId: 'nemotron-super',
          models: [{
            id: 'nemotron-super', name: 'Nemotron 3.5 Super VL',
            model: 'opencode/nemotron-free', available: true,
            imageInput: true, location: 'remote', costWarning: false,
            usageNote: 'Free OpenCode quota.',
          }],
        }],
      }),
      generateProposal: vi.fn().mockResolvedValue(proposal),
      answerHelp: vi.fn().mockResolvedValue({ answer: 'Help', insufficientContext: false, sources: [] }),
      acceptProposal: vi.fn().mockResolvedValue({ ...current, document: acceptedDocument }),
    };
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    const canvas = await screen.findByTestId('canvas-frame');
    await screen.findByRole('button', { name: 'Hello, World!' });

    const assistantChip = screen.getByRole('button', { name: /AI assistant/ });
    assistantChip.focus();
    fireEvent.click(assistantChip);
    const dialog = await screen.findByRole('dialog', { name: 'AI assistant' });
    fireEvent.change(within(dialog).getByLabelText('Message'), {
      target: { value: 'Build a signup app' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }));

    expect(await within(dialog).findByText('A complete signup app proposal.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close assistant' }));
    fireEvent.click(assistantChip);
    const reopened = await screen.findByRole('dialog', { name: 'AI assistant' });
    expect(within(reopened).getByRole('region', { name: 'App proposal preview' })).toBeInTheDocument();
    fireEvent.click(within(reopened).getByRole('button', { name: 'Apply app' }));

    expect(await within(canvas).findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(within(reopened).getByText('Applied and saved to the project.')).toBeInTheDocument();

    fireEvent.click(within(reopened).getByRole('button', { name: 'Close assistant' }));
    expect(assistantChip).toHaveFocus();
  });

  it('validates accepted collection bindings from the refreshed project data', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const project = (await repositories.projects.listProjects())[0]!;
    const current = await repositories.projects.getProject(project.id);
    if (!current) throw new Error('Expected seeded project.');
    let proposal: AssistantProposalV1 | undefined;
    repositories.assistant = {
      isAvailable: true,
      getCapabilities: vi.fn().mockResolvedValue({
        defaultProviderId: 'opencode', helpRetrievalAvailable: true,
        providers: [{
          id: 'opencode', model: 'nemotron-free', available: true,
          imageInput: true, location: 'remote', costWarning: false,
          defaultModelId: 'nemotron-super',
          models: [{
            id: 'nemotron-super', name: 'Nemotron 3.5 Super VL',
            model: 'opencode/nemotron-free', available: true,
            imageInput: true, location: 'remote', costWarning: false,
            usageNote: 'Free OpenCode quota.',
          }],
        }],
      }),
      generateProposal: vi.fn(async () => {
        if (!proposal) throw new Error('Expected the collection proposal fixture.');
        return proposal;
      }),
      answerHelp: vi.fn().mockResolvedValue({ answer: 'Help', insufficientContext: false, sources: [] }),
      acceptProposal: vi.fn(async () => {
        if (!proposal) throw new Error('Expected the collection proposal fixture.');
        return { ...current, document: proposal.preview.document };
      }),
    };
    renderRoutesAt(`/project/${project.id}/editor`, repositories);
    await screen.findByTestId('canvas-frame');
    fireEvent.click(screen.getByRole('button', { name: 'data' }));
    await screen.findByRole('heading', { name: 'Create your project database' });
    fireEvent.click(screen.getByRole('button', { name: 'design' }));

    const database = await repositories.appData.createDatabase(project.id, { name: 'Assistant data' });
    const collection = await repositories.appData.createCollection(project.id, {
      databaseId: database.id,
      name: 'Notes',
      fields: [{
        id: 'assistant_field_title', key: 'title', label: 'Title', type: 'text', required: true,
      }],
    });
    const list = makeListView('assistant_list', {
      name: 'Collection ListView',
      props: {
        ...makeListView('assistant_list_base').props,
        dataSource: {
          kind: 'collection',
          collectionId: collection.id,
          displayFieldIds: ['assistant_field_title'],
        },
      },
      children: [{
        id: 'assistant_title',
        type: 'text',
        x: 0,
        y: 0,
        w: 320,
        h: 44,
        props: { text: 'title', level: 'body' },
        bindings: [{
          target: 'text.content',
          value: { source: 'list-item', fieldId: 'assistant_field_title' },
        }],
      }],
    });
    const acceptedDocument: ProjectDocument = {
      screens: current.document.screens.map((candidate, index) => index === 0
        ? { ...candidate, nodes: [list], behaviors: [], logicGraphs: [] }
        : candidate),
    };
    proposal = {
      id: 'proposal_notes',
      projectId: project.id,
      baseRevision: 1,
      message: 'A notes app proposal.',
      blueprint: {
        version: 1,
        summary: 'A notes app proposal.',
        screens: [{
          key: 'home', name: 'Home', path: '/',
          components: [{ key: 'notes', type: 'list', collectionKey: 'notes' }],
          workflows: [],
        }],
        collections: [{
          key: 'notes', name: 'Notes',
          fields: [{ key: 'title', label: 'Title', type: 'text', required: true }],
        }],
      },
      preview: {
        schemaVersion: 13,
        document: acceptedDocument,
        collections: [{
          id: collection.id,
          name: collection.name,
          fields: collection.fields,
        }],
      },
    };

    fireEvent.click(screen.getByRole('button', { name: /AI assistant/ }));
    const dialog = await screen.findByRole('dialog', { name: 'AI assistant' });
    fireEvent.change(within(dialog).getByLabelText('Message'), {
      target: { value: 'Build a notes app' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('A notes app proposal.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply app' }));

    await within(dialog).findByText('Applied and saved to the project.');
    await waitFor(() => expect(screen.getByTestId('validation-badge')).toHaveTextContent('Valid'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close assistant' }));
    const editorSidebar = screen.getByRole('complementary', { name: 'Editor sidebar' });
    fireEvent.click(within(editorSidebar).getByRole('button', { name: 'ListView — Collection ListView' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit item design' }));
    expect(await screen.findByText('Title')).toBeInTheDocument();
    expect(screen.queryByText('assistant_field_title')).not.toBeInTheDocument();
  });

  it('navigates to the deployment flow from Deploy', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByRole('button', { name: 'Hello, World!' });

    fireEvent.click(screen.getByRole('button', { name: 'Deploy' }));

    expect(await screen.findByRole('heading', { name: 'Publish your app' })).toBeInTheDocument();
  });

  it('shows not-found for a missing project id', async () => {
    renderRoutesAt('/project/missing-id/editor');

    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
    expect(screen.getByText('missing-id')).toBeInTheDocument();
  });

  it('keeps loading while the project resolves', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    vi.spyOn(repositories.projects, 'getProject').mockImplementation(
      () => new Promise<Project | null>(() => undefined),
    );

    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);

    expect(await screen.findByText('Loading editor…')).toBeInTheDocument();
  });
});
