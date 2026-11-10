import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { createRepositories } from '@data/repositories';
import { ensureDemoProject } from '@data/seeding/demoSeed';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { SessionProvider } from '@main/providers/SessionProvider';
import { AppRoutes } from '@main/routes';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { SkipLink } from '@presentation/components/system/SkipLink';import { AppErrorBoundary } from '@presentation/components/system/AppErrorBoundary';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@presentation/styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element "#root" was not found.');
}

/*
 * Bootstrap owns composition and cold-start work: the repository set is built
 * once, the sample workspace is seeded before the dashboard's first render,
 * and only then does the routed app mount (so data hooks never race seeding).
 */
const root = createRoot(rootElement);
const repositories = createRepositories();
root.render(<StrictMode><LoadingScreen label="Preparing Novy…" /></StrictMode>);

async function bootstrap(): Promise<void> {
  try {
    await ensureDemoProject(repositories);
  } catch (error: unknown) {
    console.warn('[novy] demo project seeding skipped:', error);
  }

  root.render(
    <StrictMode>
      <SkipLink />
      <AppErrorBoundary>
        <RepositoriesProvider repositories={repositories}>
          <SessionProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </SessionProvider>
        </RepositoriesProvider>
      </AppErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
