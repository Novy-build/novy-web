import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RepositoriesProvider } from './RepositoriesProvider';
import { SessionProvider, useSession } from './SessionProvider';
import { createStubRepositories, STUB_USER } from '@test/stubRepositories';

beforeEach(() => {
  window.localStorage.clear();
});

function Probe() {
  const session = useSession();
  return (
    <div>
      <div data-testid="status">{session.status}</div>
      <div data-testid="user">{session.user?.displayName ?? 'none'}</div>
      <button onClick={() => void session.continueAsDemo()} type="button">
        demo
      </button>
      <button onClick={() => session.signIn({ email: 'nope@x.com', password: 'bad' }).catch(() => {})} type="button">
        fail
      </button>
      <button
        onClick={() => session.signIn({ email: 'student@novy.app', password: 'secret123' }).catch(() => {})}
        type="button"
      >
        pass
      </button>
      <button onClick={() => void session.signOut()} type="button">
        out
      </button>
    </div>
  );
}

function renderWithStub(options: Parameters<typeof createStubRepositories>[0]) {
  return render(
    <RepositoriesProvider repositories={createStubRepositories(options)}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </RepositoriesProvider>,
  );
}

describe('SessionProvider', () => {
  it('starts as loading while the session is being restored', () => {
    renderWithStub({});

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('restores an existing session after mount', async () => {
    renderWithStub({ sessionUser: STUB_USER });

    expect(await screen.findByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('Student Tester');
  });

  it('falls back to anonymous when no session exists', async () => {
    renderWithStub({ sessionUser: null });

    expect(await screen.findByTestId('status')).toHaveTextContent('anonymous');
  });

  it('authenticates via the demo shortcut', async () => {
    renderWithStub({});
    await screen.findByTestId('status');
    fireEvent.click(screen.getByText('demo'));

    expect(await screen.findByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('Demo User');
  });

  it('keeps the session anonymous when sign-in fails', async () => {
    renderWithStub({});
    await screen.findByTestId('status');
    fireEvent.click(screen.getByText('fail'));

    await screen.findByTestId('status');
    await screen.findByText('anonymous');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('authenticates on successful sign-in', async () => {
    renderWithStub({});
    await screen.findByText('anonymous');
    fireEvent.click(screen.getByText('pass'));

    expect(await screen.findByText('authenticated')).toBeInTheDocument();
    expect(screen.getByTestId('user')).toHaveTextContent('Student Tester');
  });

  it('signs out from an active session', async () => {
    renderWithStub({ sessionUser: STUB_USER });
    await screen.findByText('authenticated');
    fireEvent.click(screen.getByText('out'));

    expect(await screen.findByText('anonymous')).toBeInTheDocument();
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });
});
