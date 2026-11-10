import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Button } from '@presentation/components/ui/Button';
import { ThemeToggle } from '@presentation/components/ui/ThemeToggle';
import { useRepositories } from '@main/providers/RepositoriesProvider';
import { useSession } from '@main/providers/SessionProvider';
import { isDemoLoginVisible } from './demoAvailability';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

type AuthMode = 'login' | 'register';

const MODE_COPY: Record<AuthMode, { heading: string; caption: string; switchLabel: string }> = {
  login: {
    heading: 'Welcome back',
    caption: 'Log in to keep building your apps.',
    switchLabel: 'Create one',
  },
  register: {
    heading: 'Create your account',
    caption: 'Start building apps in minutes — no code required.',
    switchLabel: 'Log in instead',
  },
};

function BrandPanel() {
  return (
    <aside className="hidden w-[46%] flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
      <div className="text-xl font-bold tracking-tight">Novy</div>
      <div>
        <h2 className="text-3xl font-semibold leading-snug">
          Build real web apps
          <br />
          without writing code.
        </h2>
        <ul className="mt-6 space-y-2 text-sm text-brand-100">
          <li>Drag and drop your interface onto the canvas.</li>
          <li>Wire up behavior with the visual logic builder.</li>
          <li>Publish your app with one click.</li>
        </ul>
      </div>
      <p className="text-xs text-brand-200">A course project build.</p>
    </aside>
  );
}

interface AuthCardProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  showDemo: boolean;
}

function AuthCard({ mode, onModeChange, showDemo }: AuthCardProps) {
  const copy = MODE_COPY[mode];
  const { continueAsDemo } = useSession();
  return (
    <div className="w-full max-w-sm rounded-panel border border-hairline bg-surface p-8">
      <div
        aria-hidden="true"
        className="mb-6 flex h-11 w-11 items-center justify-center rounded-tile bg-brand-600 text-lg font-bold text-white lg:hidden"
      >
        N
      </div>
      <h1 className="text-xl font-semibold text-ink">{copy.heading}</h1>
      <p className="mt-1 text-sm text-ink-muted">{copy.caption}</p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-tile bg-canvas p-1" role="group" aria-label="Authentication mode">
        <button
          aria-pressed={mode === 'login'}
          className={`rounded-tile px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'login' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
          onClick={() => onModeChange('login')}
          type="button"
        >
          Log in
        </button>
        <button
          aria-pressed={mode === 'register'}
          className={`rounded-tile px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'register' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
          onClick={() => onModeChange('register')}
          type="button"
        >
          Sign up
        </button>
      </div>

      <div className="mt-6">
        {mode === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>

      {showDemo ? (
        <>
          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-hairline" />
            <span className="text-xs uppercase tracking-wide text-ink-muted">or</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <Button isBlock onClick={() => void continueAsDemo()} variant="ghost">
            Continue as demo user
          </Button>
        </>
      ) : null}
    </div>
  );
}

/**
 * /login route: split layout with the brand story on the left and the
 * login/register card on the right. Once the session becomes authenticated
 * (login, registration, or demo) the user is sent back where they tried to
 * go, defaulting to their projects.
 */
export function AuthPage() {
  const { status } = useSession();
  const { auth } = useRepositories();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  // Demo sign-in is a development-only local shortcut; API sessions never use it.
  const showDemo = isDemoLoginVisible(import.meta.env.DEV, auth.supportsDemo);

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? '/projects';
  }, [location.state]);

  if (status === 'authenticated') {
    return <Navigate replace to={redirectTo} />;
  }

  return (
    <main className="flex min-h-full bg-canvas" id="main-content">
      <BrandPanel />
      <section className="relative flex flex-1 items-center justify-center p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <AuthCard mode={mode} onModeChange={setMode} showDemo={showDemo} />
      </section>
    </main>
  );
}
