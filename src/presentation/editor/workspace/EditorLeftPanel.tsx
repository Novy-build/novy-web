import { useState } from 'react';
import type { ComponentNode, ComponentType, ListViewNode } from '@domain/entities/componentNode';
import type { LayerDropPosition } from '@domain/componentTree';
import { ComponentsPalette } from './ComponentsPalette';
import { LayersPanel } from './LayersPanel';
import { CollapsedPanelRail, PanelCollapseButton } from '../PanelCollapseControl';
import { ResizeHandle } from '../layout/ResizeHandle';
import { useResizablePane } from '../layout/useResizablePane';

type LeftPanelTab = 'layers' | 'assets';

interface EditorLeftPanelProps {
  nodes: readonly ComponentNode[];
  frame?: ListViewNode | null;
  selectedNodeId: string | null;
  onAddByType: (type: ComponentType) => void;
  onSelect: (nodeId: string) => void;
  onOrder: (nodeId: string, direction: 'forward' | 'backward' | 'front' | 'back') => void;
  onRename: (nodeId: string, name: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onMove: (nodeId: string, targetId: string, position: LayerDropPosition) => void;
}

/** Figma-like left rail: Layers and Assets share one focused workspace panel. */
export function EditorLeftPanel({
  nodes,
  frame = null,
  selectedNodeId,
  onAddByType,
  onSelect,
  onOrder,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onMove,
}: EditorLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>('layers');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { size, isDragging, startResize, onKeyDown, reset } = useResizablePane({
    defaultSize: 256,
    minSize: 200,
    maxSize: 480,
    orientation: 'horizontal',
    storageKey: 'novy.editor.layout.v1.design-left',
    grow: 1,
  });

  if (isCollapsed) {
    return (
      <CollapsedPanelRail
        controls="editor-sidebar-content"
        label="editor sidebar"
        onExpand={() => setIsCollapsed(false)}
        side="left"
      />
    );
  }

  return (
    <>
      <aside
        aria-label="Editor sidebar"
        className="flex shrink-0 flex-col overflow-hidden border-r border-hairline bg-surface"
        id="editor-sidebar-content"
        style={{ width: size }}
      >
        <div className="flex border-b border-hairline">
          <div aria-label="Editor sidebar views" className="grid min-w-0 flex-1 grid-cols-2 p-1" role="tablist">
            {(['layers', 'assets'] as const).map((tab) => (
              <button
                aria-controls={`editor-${tab}-panel`}
                aria-selected={activeTab === tab}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  activeTab === tab ? 'bg-canvas text-ink' : 'text-ink-muted hover:text-ink'
                }`}
                id={`editor-${tab}-tab`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
          <PanelCollapseButton
            controls="editor-sidebar-content"
            isCollapsed={false}
            label="editor sidebar"
            onToggle={() => setIsCollapsed(true)}
            side="left"
          />
        </div>

        <div
          aria-labelledby={`editor-${activeTab}-tab`}
          className="flex min-h-0 flex-1 flex-col"
          id={`editor-${activeTab}-panel`}
          role="tabpanel"
        >
          {activeTab === 'layers' ? (
            <LayersPanel
              frame={frame}
              isEmbedded
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
