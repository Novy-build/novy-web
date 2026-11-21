import { Database, House, Layers, PanelsTopLeft, Shapes, Workflow } from 'lucide-react';
import type { EditorMode } from '../state/editorState';
import type { LeftPanelSection } from './EditorLeftPanel';

interface EditorLeftRailProps {
  activeSection: LeftPanelSection;
  isPanelOpen: boolean;
  mode: EditorMode;
  onHome: () => void;
  onModeChange: (mode: EditorMode) => void;
  onSectionChange: (section: LeftPanelSection) => void;
}

const SECTION_ITEMS = [
  { id: 'screens', label: 'Screens', icon: PanelsTopLeft },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'assets', label: 'Assets', icon: Shapes },
] as const;

const MODE_ITEMS = [
  { id: 'logic', label: 'Logic', icon: Workflow },
  { id: 'data', label: 'Data', icon: Database },
] as const;

/** Narrow activity rail, matching the far-left rail of a design tool. */
export function EditorLeftRail({
  activeSection,
  isPanelOpen,
  mode,
  onHome,
  onModeChange,
  onSectionChange,
}: EditorLeftRailProps) {
  return (
    <aside aria-label="Editor activity rail" className="flex w-14 shrink-0 flex-col items-center border-r border-hairline bg-surface py-2">
      {SECTION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = mode === 'design' && activeSection === item.id;
        return (
          <button
            aria-label={`${item.label} section`}
            aria-expanded={isActive && isPanelOpen}
            aria-pressed={isActive}
            className={`flex w-full flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
            type="button"
          >
            <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div aria-hidden="true" className="my-2 w-7 border-t border-hairline" />

      {MODE_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = mode === item.id;
        return (
          <button
            aria-label={`${item.label} mode`}
            aria-pressed={isActive}
            className={`flex w-full flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
            }`}
            key={item.id}
            onClick={() => onModeChange(item.id)}
            title={item.label}
            type="button"
          >
            <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="flex-1" />
      <div aria-hidden="true" className="my-2 w-7 border-t border-hairline" />
      <button
        aria-label="Home navigation"
        className="flex w-full flex-col items-center gap-1 py-2 text-[10px] font-medium text-ink-muted transition-colors hover:text-ink"
        onClick={onHome}
        title="Return to projects"
        type="button"
      >
        <House aria-hidden="true" className="h-5 w-5" strokeWidth={1.7} />
        <span>Home</span>
      </button>
    </aside>
  );
}
