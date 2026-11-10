import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { createStubRepositories } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
});

/**
 * Renders the real route tree at /login inside a MemoryRouter. Auth flows all
 * start from an anonymous session, so the AuthPage login card is visible.
 */
function renderRoutesAt(
  initialEntry: string | { pathname: string; state: Record<string, unknown> },
  authOptions: Parameters<typeof createStubRepositories>[0] = {},
) {
  return render(
    <RepositoriesProvider
      repositories={createStubRepositories({ sessionUser: null, ...authOptions })}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </MemoryRouter>
    </RepositoriesProvider>,
  );
}

/** The login submit button lives inside the named form, distinct from the mode tab. */
function getLoginSubmitButton(): HTMLElement {
  const form = screen.getByRole('form', { name: 'Log in' });
  return within(form).getByRole('button', { name: 'Log in' });
}

function fillLoginForm(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(getLoginSubmitButton());
}

function openRegisterForm(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
}

function fillRegisterForm(displayName: string, email: string, password: string, confirm: string): void {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: displayName } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirm } });
}

describe('auth flows', () => {
  it('shows the login card with the demo shortcut', () => {
    renderRoutesAt('/login');

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as demo user' })).toBeInTheDocument();
  });

  it('switches to the registration form via the sign-up tab', () => {
    renderRoutesAt('/login');

    openRegisterForm();

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });

  it('shows inline validation for malformed emails', () => {
    renderRoutesAt('/login');

    fillLoginForm('not-an-email', 'secret123');

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('surfaces typed auth failures as an honest banner', async () => {
    renderRoutesAt('/login');

    fillLoginForm('student@novy.app', 'wrong-pass');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Incorrect email or password. Please try again.',
    );
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('hides the demo shortcut when the auth backend does not support it', () => {
    renderRoutesAt('/login', { supportsDemo: false });

    expect(screen.queryByRole('button', { name: 'Continue as demo user' })).not.toBeInTheDocument();
  });

  it('logs in and lands on the requested deep link after sign-in', async () => {
    renderRoutesAt({ pathname: '/login', state: { from: '/project/acme/deploy' } });

    fillLoginForm('student@novy.app', 'secret123');

    // The protected deploy route was restored; its real page then resolves
    // the unknown project id to the expected not-found state.
    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument();
  });

  it('logs in and defaults to the projects screen', async () => {
    renderRoutesAt('/login');

    fillLoginForm('student@novy.app', 'secret123');

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('registers a brand-new account and lands on projects', async () => {
    renderRoutesAt('/login');

    openRegisterForm();
    fillRegisterForm('Peter Bañares', 'peter@novy.app', 'secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('reports password mismatches inline', () => {
    renderRoutesAt('/login');

    openRegisterForm();
    fillRegisterForm('Peter Bañares', 'peter@novy.app', 'secret123', 'secret999');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
  });

  it('rejects duplicate registrations with guidance', async () => {
    renderRoutesAt('/login');

    openRegisterForm();
    fillRegisterForm('Impostor', 'student@novy.app', 'secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('An account with this email already exists. Try logging in instead.'),
    ).toBeInTheDocument();
  });

  it('explains that registration is pending email confirmation', async () => {
    renderRoutesAt('/login', { registrationRequiresConfirmation: true });

    openRegisterForm();
    fillRegisterForm('Peter Bañares', 'peter@novy.app', 'secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Check your inbox');
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
  });

  it('demo users land on the projects screen without credentials', async () => {
    renderRoutesAt('/login');

    fireEvent.click(screen.getByRole('button', { name: 'Continue as demo user' }));

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });
});
