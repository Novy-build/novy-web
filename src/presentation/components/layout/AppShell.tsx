import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { AppSidebar } from './AppSidebar';
import { useSidebarCollapsed } from './useSidebarCollapsed';
import { useTemplates } from '@presentation/pages/projects/useTemplates';
import { useCreateProject } from '@presentation/hooks/useCreateProject';
import { NewProjectDialog } from '@presentation/pages/projects/dialogs/NewProjectDialog';

/**
 * App shell for dashboard routes: persistent n8n-style sidebar
 * on the left, routed content on the right. The New Project gallery is hosted
 * here so the sidebar's "+" / "Templates" entries work from every shell page.
 */
export function AppShell() {
  const { collapsed, toggle } = useSidebarCollapsed();
  const { templates } = useTemplates();
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  async function handleCreate(name: string, template: Parameters<typeof createProject>[1]): Promise<void> {
    const created = await createProject(name, template);
    setIsGalleryOpen(false);
    navigate(`/project/${created.id}/editor`);
  }

  return (
    <div className="flex h-screen w-full bg-canvas">
      <AppSidebar
        collapsed={collapsed}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onToggleCollapsed={toggle}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto bg-canvas" id="main-content">
        <Outlet />
      </main>
      {isGalleryOpen ? (
        <NewProjectDialog
          onCancel={() => setIsGalleryOpen(false)}
          onCreate={handleCreate}
          templates={templates}
        />
      ) : null}
    </div>
  );
}
