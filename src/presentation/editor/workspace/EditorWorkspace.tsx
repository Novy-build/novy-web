import { useEffect, useReducer, useState } from 'react';
import type { Project } from '@domain/entities/project';
import type { ComponentType } from '@domain/entities/componentNode';
import { deviceViewport } from '../state/geometry';
import {
  type EditorMode,
  createEditorState,
  findNodeInScreen,
  getActiveScreen,
  type EditorAction,
} from '../state/editorState';
import { editorReducer } from '../state/editorReducer';
import { useProjectAutosave } from '../hooks/useProjectAutosave';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { EditorTopBar, type AutosaveStatus } from './EditorTopBar';
import { ComponentsPalette } from './ComponentsPalette';
import { ScreenTabs } from './ScreenTabs';
import { EditorCanvas } from './EditorCanvas';
import { PreviewOverlay } from './PreviewOverlay';
import { Inspector } from './Inspector';
import { LayersPanel } from './LayersPanel';

interface EditorWorkspaceProps {
  project: Project;
  onRenameProject: (name: string) => Promise<void>;
  onBack: () => void;
  onDeploy: () => void;
}

/**
 * Orchestrates the editor: owns the reducer (document + history + canvas
 * chrome), wires autosave and keyboard shortcuts, and lays out top bar,
 * palette, canvas, inspector, and layers. The Logic mode placeholder clears
 * the way for Phase 5 without blocking the design workspace.
 */
export function EditorWorkspace({ project, onRenameProject, onBack, onDeploy }: EditorWorkspaceProps) {
  const [state, dispatch] = useReducer(editorReducer, project.document, createEditorState);
  const [mode, setMode] = useState<EditorMode>('design');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const activeScreen = getActiveScreen(state);
  const selectedNode = state.selectedNodeId ? findNodeInScreen(activeScreen, state.selectedNodeId) : undefined;

  useEffect(() => {
    if (project.document !== state.document) {
      dispatch({ type: 'document/set', document: project.document });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.document, state.document]);

  useProjectAutosave({
    projectId: project.id,
    document: state.document,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving: state.isSaving,
    onBegin: () => dispatch({ type: 'autosave/begin' }),
    onSaved: (savedAt: Date) => dispatch({ type: 'autosave/end', savedAt }),
  });

  useEditorShortcuts({
    dispatch,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    selectedNodeId: state.selectedNodeId,
  });

  const saving: AutosaveStatus = {
    isSaving: state.isSaving,
    hasUnsavedChanges: state.hasUnsavedChanges,
    lastSavedAt: state.lastSavedAt,
  };

  function addFromPalette(nodeType: ComponentType): void {
    const bounds = deviceViewport(state.device);
    dispatch({ type: 'node/add', nodeType, x: bounds.width / 2, y: bounds.height / 2 });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas text-ink">
      <EditorTopBar
        canRedo={state.future.length > 0}
        canUndo={state.past.length > 0}
        mode={mode}
        onBack={onBack}
        onDeploy={onDeploy}
        onModeChange={setMode}
        onPreview={() => setIsPreviewOpen(true)}
        onRedo={() => dispatch({ type: 'history/redo' })}
        onRenameProject={onRenameProject}
        onUndo={() => dispatch({ type: 'history/undo' })}
        projectName={project.name}
        saving={saving}
      />

      {mode === 'design' ? (
        <div className="flex min-h-0 flex-1">
          <ComponentsPalette onAddByType={addFromPalette} />

          <div className="flex min-w-0 flex-1 flex-col">
            <ScreenTabs
              activeScreenId={state.activeScreenId}
              onAddScreen={() => dispatch({ type: 'screen/add' })}
              onDeleteScreen={(screenId) => dispatch({ type: 'screen/delete', screenId })}
              onRenameScreen={(screenId, name) => dispatch({ type: 'screen/rename', screenId, name })}
              onSelectScreen={(screenId) => dispatch({ type: 'screen/select', screenId })}
              screens={state.document.screens}
            />
            <EditorCanvas
              device={state.device}
              dropIndicator={state.dropIndicator}
              isSnapEnabled={state.isSnapEnabled}
              onAddBehavior={() => setMode('logic')}
              onDeleteSelected={() => {
                if (state.selectedNodeId) {
                  dispatch({ type: 'node/delete', nodeId: state.selectedNodeId });
                }
              }}
              onDragStart={() => dispatch({ type: 'node/dragStart' })}
              onDuplicateSelected={() => {
                if (state.selectedNodeId) {
                  dispatch({ type: 'node/duplicate', nodeId: state.selectedNodeId });
                }
              }}
              onDropAt={(nodeType, x, y) => dispatch({ type: 'canvas/dropAt', nodeType, x, y })}
              onDropIndicatorChange={(position) => dispatch({ type: 'canvas/dropIndicator', position })}
              onNodeMove={(nodeId, x, y) => dispatch({ type: 'node/move', nodeId, x, y })}
              onNodeResize={(nodeId, geometry) => dispatch({ type: 'node/resize', nodeId, geometry })}
              onSelectNode={(nodeId) => dispatch({ type: 'node/select', nodeId })}
              onToggleSnap={() => dispatch({ type: 'snap/toggle' })}
              onZoomChange={(zoom) => dispatch({ type: 'zoom/set', zoom })}
              screen={activeScreen}
              selectedNodeId={state.selectedNodeId}
              zoom={state.zoom}
            />
          </div>

          <aside className="flex w-72 shrink-0 flex-col border-l border-hairline bg-surface">
            <Inspector
              node={selectedNode ?? null}
              onAction={(action: EditorAction) => dispatch(action)}
              onOpenLogic={() => setMode('logic')}
            />
            <LayersPanel
              nodes={activeScreen.nodes}
              onOrder={(nodeId, direction) => dispatch({ type: 'node/order', nodeId, direction })}
              onSelect={(nodeId) => dispatch({ type: 'node/select', nodeId })}
              selectedNodeId={state.selectedNodeId}
            />
          </aside>
        </div>
      ) : (
        <section aria-label="Logic workspace" className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="rounded-panel border border-hairline bg-surface p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Logic</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Connect triggers to actions visually — button taps, form changes, screen navigation.
              The Logic workspace arrives in Phase 5.
            </p>
            <button
              className="mt-4 rounded-tile px-4 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-canvas"
              onClick={() => setMode('design')}
              type="button"
            >
              Back to design
            </button>
          </div>
        </section>
      )}

      {isPreviewOpen ? (
        <PreviewOverlay
          device={state.device}
          onClose={() => setIsPreviewOpen(false)}
          projectName={project.name}
          screen={activeScreen}
        />
      ) : null}
    </div>
  );
}
