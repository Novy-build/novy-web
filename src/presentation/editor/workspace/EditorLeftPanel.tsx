import { useState } from 'react';
import type { ComponentNode, ComponentType } from '@domain/entities/componentNode';
import type { LayerDropPosition } from '@domain/componentTree';
import { ComponentsPalette } from './ComponentsPalette';
import { LayersPanel } from './LayersPanel';

type LeftPanelTab = 'layers' | 'assets';

interface EditorLeftPanelProps {
  nodes: readonly ComponentNode[];
  selectedNodeId: string | null;
  onAddByType: (type: ComponentType) => void;
  onSelect: (nodeId: string) => void;
  onOrder: (nodeId: string, direction: 'forward' | 'backward') => void;
  onRename: (nodeId: string, name: string) => void;
  onToggleVisibility: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onMove: (nodeId: string, targetId: string, position: LayerDropPosition) => void;
}

/** Figma-like left rail: Layers and Assets share one focused workspace panel. */
export function EditorLeftPanel({
  nodes,
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

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-hairline bg-surface" aria-label="Editor sidebar">
      <div aria-label="Editor sidebar views" className="grid grid-cols-2 border-b border-hairline p-1" role="tablist">
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

      <div
        aria-labelledby={`editor-${activeTab}-tab`}
        className="flex min-h-0 flex-1 flex-col"
        id={`editor-${activeTab}-panel`}
        role="tabpanel"
      >
        {activeTab === 'layers' ? (
          <LayersPanel
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
  );
}
