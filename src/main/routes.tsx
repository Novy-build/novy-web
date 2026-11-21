import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from '@presentation/components/routing/RequireAuth';
import { AppShell } from '@presentation/components/layout/AppShell';
import { LoadingScreen } from '@presentation/components/system/LoadingScreen';
import { AuthPage } from '@presentation/pages/auth/AuthPage';

const ProjectsPage = lazy(() =>
  import('@presentation/pages/projects/ProjectsPage').then((module) => ({
    default: module.ProjectsPage,
  })),
);
const EditorPage = lazy(() =>
  import('@presentation/pages/editor/EditorPage').then((module) => ({
    default: module.EditorPage,
  })),
);
const DeploymentPage = lazy(() =>
  import('@presentation/pages/deployment/DeploymentPage').then((module) => ({
    default: module.DeploymentPage,
  })),
);
const PublishedPage = lazy(() =>
  import('@presentation/pages/published/PublishedPage').then((module) => ({
    default: module.PublishedPage,
  })),
);

/**
 * Route tree per docs/frontend-plan.md:
 *   /login                      AuthPage
 *   /projects                   ProjectsPage (guarded, with app shell)
 *   /published                  PublishedPage (guarded, with app shell)
 *   /project/:projectId         redirect -> editor
 *   /project/:projectId/editor  EditorPage (guarded, full canvas)
 *   /project/:projectId/deploy  DeploymentPage (guarded, focused project flow)
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading page…" />}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/published" element={<PublishedPage />} />
          </Route>
          <Route path="/project/:projectId" element={<Navigate to="editor" replace />} />
          <Route path="/project/:projectId/editor" element={<EditorPage />} />
          <Route path="/project/:projectId/deploy" element={<DeploymentPage />} />
        </Route>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </Suspense>
  );
}
