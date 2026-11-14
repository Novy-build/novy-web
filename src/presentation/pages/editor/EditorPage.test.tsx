import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import type { Repositories } from '@data/repositories/local';
import type { Project } from '@domain/entities/project';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

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

    const canvas = await screen.findByTestId('canvas-frame');
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

  it('applies an AI assistant proposal to the canvas and undoes it', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    const canvas = await screen.findByTestId('canvas-frame');
    await screen.findByRole('button', { name: 'Hello, World!' });

    const assistantChip = screen.getByRole('button', { name: /AI assistant/ });
    assistantChip.focus();
    fireEvent.click(assistantChip);
    const dialog = await screen.findByRole('dialog', { name: 'AI assistant' });
    fireEvent.change(within(dialog).getByLabelText('Message'), {
      target: { value: 'add a button "Sign up"' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }));

    expect(within(dialog).getByText('Add a button “Sign up”')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep' }));

    expect(within(canvas).getByRole('button', { name: 'Sign up' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo' }));
    expect(within(canvas).queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close assistant' }));
    expect(assistantChip).toHaveFocus();
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
