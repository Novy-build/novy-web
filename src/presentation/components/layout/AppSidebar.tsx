import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  Globe2,
  Home,
  LayoutTemplate,
  MoreHorizontal,
  Plus,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useSession } from '@main/providers/SessionProvider';
import { userInitials } from './userInitials';
import { ThemeToggle } from '@presentation/components/ui/ThemeToggle';
import novyLogo from '@presentation/assets/novy-logo.png';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenGallery: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed, onOpenGallery }: AppSidebarProps) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const displayName = user?.displayName ?? '';

  async function handleSignOut() {
    setMenuOpen(false);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      // Keep the current screen when the server session could not be cleared.
      console.warn('[novy] sign-out failed; the session is still active.');
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-2 rounded-tile px-2.5 py-2 text-sm font-medium transition-colors',
      collapsed ? 'justify-center px-0' : '',
      isActive
        ? 'bg-sidebar-active text-sidebar-ink'
        : 'text-sidebar-ink-muted hover:bg-sidebar-soft hover:text-sidebar-ink',
    ].join(' ');

  return (
    <aside
      aria-label="Primary navigation"
      className={`relative flex h-full shrink-0 flex-col border-r border-sidebar-hairline bg-sidebar text-sidebar-ink transition-[width] duration-150 ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* Logo + new project */}
      <div className="flex items-center gap-2 px-2.5 py-3">
        <img
          alt=""
          aria-hidden="true"
          className="h-8 w-8 shrink-0 rounded-tile object-contain"
          data-testid="novy-brand-logo"
          draggable={false}
          src={novyLogo}
        />
        {!collapsed ? (
          <>
            <span className="text-base font-bold tracking-tight text-sidebar-ink">Novy</span>
            <button
              aria-label="Create new project"
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-tile border border-sidebar-hairline text-sidebar-ink-muted transition-colors hover:bg-sidebar-soft hover:text-sidebar-ink"
              onClick={onOpenGallery}
              title="New project"
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
            </button>
          </>
        ) : null}
      </div>

      {/* Top nav */}
      <nav aria-label="Workspace" className="flex flex-col gap-0.5 px-2">
        <NavLink aria-label="Projects" className={navLinkClass} end to="/projects" title={collapsed ? 'Projects' : undefined}>
          <Home aria-hidden="true" className="shrink-0" size={18} />
          {!collapsed ? <span className="truncate">Projects</span> : null}
        </NavLink>

        <NavLink
          aria-label="Published"
          className={navLinkClass}
          end
          title={collapsed ? 'Published' : undefined}
          to="/published"
        >
          <Globe2 aria-hidden="true" className="shrink-0" size={18} />
          {!collapsed ? <span className="truncate">Published</span> : null}
        </NavLink>

        <button
          aria-label="Templates"
          className={[
            'flex items-center gap-2 rounded-tile px-2.5 py-2 text-sm font-medium transition-colors',
            collapsed ? 'justify-center px-0' : '',
            'text-sidebar-ink-muted hover:bg-sidebar-soft hover:text-sidebar-ink',
          ].join(' ')}
          onClick={onOpenGallery}
          title={collapsed ? 'Templates' : undefined}
          type="button"
        >
          <LayoutTemplate aria-hidden="true" className="shrink-0" size={18} />
          {!collapsed ? <span className="truncate">Templates</span> : null}
        </button>
      </nav>

      <div className="flex-1" />

      {/* Theme toggle */}
      <div className="border-t border-sidebar-hairline px-2.5 py-2">
        <div className={collapsed ? 'flex justify-center' : 'flex'}>
          <ThemeToggle className="border-sidebar-hairline bg-sidebar-soft text-sidebar-ink-muted hover:bg-sidebar-active hover:text-sidebar-ink" />
        </div>
      </div>

      {/* User chip */}
      <div className="relative border-t border-sidebar-hairline p-2.5" ref={menuRef}>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white"
          >
            {userInitials(displayName)}
          </span>
          {!collapsed ? (
            <>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-ink">{displayName}</p>
              <button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Account options"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-tile text-sidebar-ink-muted transition-colors hover:bg-sidebar-soft hover:text-sidebar-ink"
                onClick={() => setMenuOpen((value) => !value)}
                title="Account options"
                type="button"
              >
                <MoreHorizontal aria-hidden="true" size={16} />
              </button>
            </>
          ) : null}
        </div>

        {menuOpen ? (
          <div
            className="absolute bottom-full left-2.5 right-2.5 mb-2 rounded-tile border border-sidebar-hairline bg-sidebar-soft py-1 shadow-lg"
            role="menu"
          >
            <button
              className="block w-full px-3 py-2 text-left text-sm text-sidebar-ink transition-colors hover:bg-sidebar-active"
              onClick={() => void handleSignOut()}
              role="menuitem"
              type="button"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      {/* Collapse toggle */}
      <button
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-hairline bg-surface text-ink shadow-sm transition-colors hover:bg-canvas"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
      >
        {collapsed ? <ChevronsRight aria-hidden="true" size={14} /> : <ChevronsLeft aria-hidden="true" size={14} />}
      </button>
    </aside>
  );
}
