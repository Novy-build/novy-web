import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from '@presentation/components/routing/RequireAuth';
import { AuthPage } from '@presentation/pages/auth/AuthPage';
import { ProjectsPage } from '@presentation/pages/projects/ProjectsPage';
import { EditorPage } from '@presentation/pages/editor/EditorPage';
import { DeploymentPage } from '@presentation/pages/deployment/DeploymentPage';

/**
 * Route tree per docs/frontend-plan.md:
 *   /login                      AuthPage
 *   /projects                   ProjectsPage (guarded)
 *   /project/:projectId         redirect -> editor
 *   /project/:projectId/editor  EditorPage (guarded)
 *   /project/:projectId/deploy  DeploymentPage (guarded)
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/project/:projectId" element={<Navigate to="editor" replace />} />
        <Route path="/project/:projectId/editor" element={<EditorPage />} />
        <Route path="/project/:projectId/deploy" element={<DeploymentPage />} />
      </Route>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}
