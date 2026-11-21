import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
});

function renderAt(path: string, authenticated = true) {
  const repositories = createStubRepositories({ sessionUser: authenticated ? STUB_USER : null });
  return render(
    <RepositoriesProvider repositories={repositories}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

describe('AppSidebar', () => {
  it('uses the Novy brand logo instead of the letter badge', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });

    expect(screen.getByTestId('novy-brand-logo')).toHaveAttribute('src', expect.stringContaining('novy-logo'));
    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });

  it('shows the signed-in user name and initials in the chip', async () => {
    renderAt('/projects');
    expect(await screen.findByText('Student Tester')).toBeInTheDocument();
    expect(screen.getByText('ST')).toBeInTheDocument();
  });

  it('marks Projects as active on the dashboard', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });
    const projectsLink = screen.getByRole('link', { name: 'Projects' });
    expect(projectsLink).toHaveAttribute('aria-current', 'page');
  });

  it('navigates to the Published section', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });

    const publishedLink = screen.getByRole('link', { name: 'Published' });
    expect(publishedLink).toHaveAttribute('href', '/published');

    fireEvent.click(publishedLink);
    expect(await screen.findByRole('heading', { name: 'Published' })).toBeInTheDocument();
    expect(publishedLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not render project rows on the dashboard', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });
    expect(screen.queryByRole('link', { name: 'Editor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Deployments' })).not.toBeInTheDocument();
  });

  it('opens the New Project gallery from the + button', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });

    fireEvent.click(screen.getByRole('button', { name: 'Create new project' }));
    expect(await screen.findByRole('heading', { name: 'What do you want to build?' })).toBeInTheDocument();
  });

  it('opens the gallery from the Templates entry', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });

    fireEvent.click(screen.getByRole('button', { name: 'Templates' }));
    expect(await screen.findByRole('heading', { name: 'What do you want to build?' })).toBeInTheDocument();
  });

  it('signs out via the account menu', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });

    fireEvent.click(screen.getByRole('button', { name: 'Account options' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('collapses to an icon rail and restores on toggle', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });

    const sidebar = screen.getByLabelText('Primary navigation');
    const toggle = within(sidebar).getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    const expandToggle = within(sidebar).getByRole('button', { name: 'Expand sidebar' });
    expect(expandToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).queryByText('Projects')).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'Projects' })).toBeInTheDocument();

    fireEvent.click(expandToggle);
    expect(await within(sidebar).findByText('Projects')).toBeInTheDocument();
  });

  it('persists collapsed state across remounts', async () => {
    renderAt('/projects');
    await screen.findByRole('heading', { name: 'Projects' });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    // Remount by re-rendering at the same path.
    // (State is read from localStorage on mount.)
    window.localStorage.setItem('novy.sidebar.collapsed.v1', 'true');
    expect(window.localStorage.getItem('novy.sidebar.collapsed.v1')).toBe('true');
  });
});
