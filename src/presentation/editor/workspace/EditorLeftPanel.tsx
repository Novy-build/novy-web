import type { ComponentNode, ComponentType, ListViewNode } from '@domain/entities/componentNode';
import type { LayerDropPosition } from '@domain/componentTree';
import type { Screen } from '@domain/entities/screen';
import { ComponentsPalette } from './ComponentsPalette';
import { LayersPanel } from './LayersPanel';
import { ScreensPanel } from './ScreensPanel';
import { PanelCollapseButton } from '../PanelCollapseControl';
import { ResizeHandle } from '../layout/ResizeHandle';
import { useResizablePane } from '../layout/useResizablePane';

export type LeftPanelSection = 'screens' | 'layers' | 'assets';

interface EditorLeftPanelProps {
  nodes: readonly ComponentNode[];
  frame?: ListViewNode | null;
  selectedNodeId: string | null;
  onAddByType: (type: ComponentType) => void;
  isWebsite?: boolean;
  onSelect: (nodeId: string) => void;
  onOrder: (nodeId: string, direction: 'forward' | 'backward' | 'front' | 'back') => void;
  onRename: (nodeId: string, name: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onMove: (nodeId: string, targetId: string, position: LayerDropPosition) => void;
  screens?: readonly Screen[];
  activeScreenId?: string;
  onSelectScreen?: (screenId: string) => void;
  onAddScreen?: () => void;
  onRenameScreen?: (screenId: string, name: string) => void;
  onDeleteScreen?: (screenId: string) => void;
  /** The activity rail is the single control for choosing sidebar content. */
  activeSection?: LeftPanelSection;
  onCollapse?: () => void;
}

/**
 * One focused sidebar view at a time. Screens, Layers, and Assets are selected
 * exclusively from the activity rail, avoiding nested duplicate navigation.
 */
export function EditorLeftPanel({
  nodes,
  frame = null,
  selectedNodeId,
  onAddByType,
  isWebsite = false,
  onSelect,
  onOrder,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onMove,
  screens = [],
  activeScreenId = '',
  onSelectScreen = () => {},
  onAddScreen = () => {},
  onRenameScreen = () => {},
  onDeleteScreen = () => {},
  activeSection = 'layers',
  onCollapse = () => {},
}: EditorLeftPanelProps) {
  const { size, isDragging, startResize, onKeyDown, reset } = useResizablePane({
    defaultSize: 256,
    minSize: 200,
    maxSize: 480,
    orientation: 'horizontal',
    storageKey: 'novy.editor.layout.v1.design-left',
    grow: 1,
  });

  const title = activeSection === 'screens' ? 'Screens' : activeSection === 'layers' ? 'Layers' : 'Assets';

  return (
    <>
      <aside
        aria-label="Editor sidebar"
        className="flex shrink-0 flex-col overflow-hidden border-r border-hairline bg-surface"
        id="editor-sidebar-content"
        style={{ width: size }}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-hairline pl-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
          <PanelCollapseButton
            controls="editor-sidebar-content"
            isCollapsed={false}
            label="editor sidebar"
            onToggle={onCollapse}
            side="left"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {activeSection === 'screens' ? (
            <ScreensPanel
              activeScreenId={activeScreenId}
              onAddScreen={onAddScreen}
              onDeleteScreen={onDeleteScreen}
              onRenameScreen={onRenameScreen}
              onSelectScreen={onSelectScreen}
              screens={screens}
            />
          ) : activeSection === 'layers' ? (
            <LayersPanel
              frame={frame}
              isEmbedded
              isRootMainAxis={isWebsite}
              nodes={nodes}
              onMove={onMove}
              onOrder={onOrder}
              onRename={onRename}
              onSelect={onSelect}
              onToggleLock={onToggleLock}
              onToggleVisibility={onToggleVisibility}
              selectedNodeId={selectedNodeId}
            />
          ) : (
            <ComponentsPalette isEmbedded onAddByType={onAddByType} />
          )}
        </div>
      </aside>
      <ResizeHandle
        controls="editor-sidebar-content"
        isDragging={isDragging}
        label="Resize editor sidebar"
        max={480}
        min={200}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
        onPointerDown={startResize}
        orientation="horizontal"
        value={size}
      />
    </>
  );
}
