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

  it('adapts the editor chrome to the selected device preset', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByTestId('canvas-frame');

    // Desktop keeps both rails inline and hides the compact panel bar.
    expect(screen.queryByTestId('preset-panel-bar')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Editor sidebar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));

    expect(screen.getByTestId('preset-panel-bar')).toHaveTextContent('mobile preset');
    expect(screen.queryByRole('complementary', { name: 'Editor sidebar' })).not.toBeInTheDocument();

    // Panels are available as drawers while a compact preset is active.
    fireEvent.click(screen.getByRole('button', { name: 'Toggle layers panel' }));
    const layersDrawer = screen.getByRole('dialog', { name: 'Editor panel' });
    expect(within(layersDrawer).getByRole('complementary', { name: 'Editor sidebar' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Editor panel' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle inspector panel' }));
    expect(screen.getByRole('dialog', { name: 'Editor panel' })).toBeInTheDocument();

    // Returning to desktop restores the inline rails and closes the drawer.
    fireEvent.click(screen.getByRole('button', { name: 'Desktop' }));

    expect(screen.queryByTestId('preset-panel-bar')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Editor panel' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Editor sidebar' })).toBeInTheDocument();
  });

  it('centers canvas content as a group when the preset changes', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    const canvas = await screen.findByTestId('canvas-frame');

    const titleFrame = () => within(canvas).getByText('Hello, World!').closest('[data-node-id]');
    const bodyFrame = () =>
      within(canvas).getByText('Press the button to change the text above.').closest('[data-node-id]');
    const buttonFrame = () => within(canvas).getByRole('button', { name: 'Click me' }).closest('[data-node-id]');

    // Seeded mobile composition: the group spans x 80..310 (230 wide).
    expect(titleFrame()).toHaveStyle({ left: '95px' });
    expect(bodyFrame()).toHaveStyle({ left: '90px' });
    expect(buttonFrame()).toHaveStyle({ left: '80px' });

    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));

    // Tablet centers that 230px group at (768 - 230) / 2 = 269, so every
    // node shifts by +189 and keeps its relative offset.
    expect(titleFrame()).toHaveStyle({ left: '284px' });
    expect(bodyFrame()).toHaveStyle({ left: '279px' });
    expect(buttonFrame()).toHaveStyle({ left: '269px' });
  });

  it('places, edits, and previews the PD6 Form component', async () => {
    const repositories = createStubRepositories({ sessionUser: STUB_USER });
    await ensureDemoProject(repositories);
    const projects = await repositories.projects.listProjects();
    renderRoutesAt(`/project/${projects[0]!.id}/editor`, repositories);
    await screen.findByTestId('canvas-frame');

    fireEvent.click(screen.getByRole('tab', { name: 'assets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Form' }));
    fireEvent.change(screen.getByLabelText('Form title'), {
      target: { value: 'Course registration' },
    });
    fireEvent.change(screen.getByLabelText('Submit button label'), {
      target: { value: 'Register' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = await screen.findByRole('dialog');
    expect(within(preview).getByRole('form', { name: 'Course registration' })).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: 'Register' })).toBeInTheDocument();
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
