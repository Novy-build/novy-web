import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Project } from '@domain/entities/project';
import type { ComponentType } from '@domain/entities/componentNode';
import type { TriggerEvent } from '@domain/entities/logic';
import { useDialogFocus } from '@presentation/hooks/useDialogFocus';
import { deviceViewport, usesCompactEditorChrome } from '../state/geometry';
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
import { EditorLeftPanel } from './EditorLeftPanel';
import { EditorCanvas } from './EditorCanvas';
import { ScreenTabs } from './ScreenTabs';
import { PreviewOverlay } from './PreviewOverlay';
import { Inspector } from './Inspector';
import { LayersPanel } from './LayersPanel';
import { AssistantChip } from '../assistant/AssistantChip';
import { AssistantSheet } from '../assistant/AssistantSheet';
import { LogicWorkspace } from '../logic/LogicWorkspace';
import { DataWorkspace } from '../data/DataWorkspace';
import { useProjectData } from '../data/useProjectData';
import { useProjectValidation } from '../validation/useProjectValidation';
import { ValidationPanel } from '../validation/ValidationPanel';

interface EditorWorkspaceProps {
  project: Project;
  onRenameProject: (name: string) => Promise<void>;
  onBack: () => void;
  onDeploy: () => void;
}

type CompactPanel = 'layers' | 'inspector';

/**
 * Compact-preset drawer. Mounted only while open so the shared dialog focus
 * hook can trap focus, close on Escape, and restore the opener on unmount.
 */
function CompactPanelDrawer({
  id,
  side,
  widthClassName,
  onClose,
  children,
}: {
  id: string;
  side: 'left' | 'right';
  widthClassName: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ containerRef: panelRef, onClose });

  return (
    <div className="absolute inset-0 z-40 flex">
      <button
        aria-label="Close editor panel"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        type="button"
      />
      <div
        aria-label="Editor panel"
        aria-modal="true"
        className={`relative z-10 flex h-full flex-col overflow-hidden bg-surface shadow-lg ${
          side === 'left' ? 'mr-auto border-r' : 'ml-auto border-l'
        } border-hairline ${widthClassName}`}
        id={id}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

export function EditorWorkspace({ project, onRenameProject, onBack, onDeploy }: EditorWorkspaceProps) {
  const [state, dispatch] = useReducer(editorReducer, project.document, createEditorState);
  const [mode, setMode] = useState<EditorMode>('design');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [compactPanel, setCompactPanel] = useState<CompactPanel | null>(null);

  const activeScreen = getActiveScreen(state);
  const selectedNode = state.selectedNodeId ? findNodeInScreen(activeScreen, state.selectedNodeId) : undefined;

  const projectData = useProjectData(project.id);
  const validation = useProjectValidation(project.id, state.document);

  // Desktop is the only preset with room for both rails inline. Mobile and
  // tablet collapse them into drawers so the canvas keeps the full width —
  // the preset drives the chrome, not the browser window size.
  const isCompactChrome = usesCompactEditorChrome(state.device);

  useEffect(() => {
    if (!isCompactChrome) {
      setCompactPanel(null);
    }
  }, [isCompactChrome]);

  useEffect(() => {
    setCompactPanel(null);
  }, [mode]);

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

  function addBehaviorFromSelection(event: TriggerEvent = 'click'): void {
    if (state.selectedNodeId) {
      dispatch({ type: 'behavior/create', targetNodeId: state.selectedNodeId, event });
    }
    setMode('logic');
  }

  function toggleCompactPanel(panel: CompactPanel): void {
    setCompactPanel((current) => (current === panel ? null : panel));
  }

  const leftPanel = (
    <EditorLeftPanel
      nodes={activeScreen.nodes}
      onAddByType={addFromPalette}
      onMove={(nodeId, targetId, position) => dispatch({ type: 'node/layer-move', nodeId, targetId, position })}
      onOrder={(nodeId, direction) => dispatch({ type: 'node/order', nodeId, direction })}
      onRename={(nodeId, name) => dispatch({ type: 'node/layer-rename', nodeId, name })}
      onSelect={(nodeId) => dispatch({ type: 'node/select', nodeId })}
      onToggleLock={(nodeId) => dispatch({ type: 'node/layer-lock', nodeId })}
      onToggleVisibility={(nodeId) => dispatch({ type: 'node/layer-visibility', nodeId })}
      selectedNodeId={state.selectedNodeId}
    />
  );

  const inspectorContent = (
    <>
      <Inspector
        behaviors={activeScreen.behaviors}
        collections={projectData.collections}
        node={selectedNode ?? null}
        onAction={(action: EditorAction) => dispatch(action)}
        onOpenLogic={() => setMode('logic')}
      />
      <div className="border-t border-hairline">
        <button
          aria-expanded={isValidationOpen}
          className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted"
          onClick={() => setIsValidationOpen((current) => !current)}
          type="button"
        >
          Validation
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${validation.isValid ? 'bg-signal-valid/10 text-signal-valid' : 'bg-signal-invalid/10 text-signal-invalid'}`}>
            {validation.isValid ? 'Valid' : validation.issues.filter((issue) => issue.severity === 'error').length}
          </span>
        </button>
        {isValidationOpen ? <ValidationPanel onIssueSelect={(issue) => {
          if (issue.screenId) dispatch({ type: 'screen/select', screenId: issue.screenId });
          if (issue.componentId) dispatch({ type: 'node/select', nodeId: issue.componentId });
        }} report={validation} /> : null}
      </div>
      <div className="border-t border-hairline">
        <LayersPanel
          isEmbedded
          nodes={activeScreen.nodes}
          onMove={(nodeId, targetId, position) => dispatch({ type: 'node/layer-move', nodeId, targetId, position })}
          onOrder={(nodeId, direction) => dispatch({ type: 'node/order', nodeId, direction })}
          onRename={(nodeId, name) => dispatch({ type: 'node/layer-rename', nodeId, name })}
          onSelect={(nodeId) => dispatch({ type: 'node/select', nodeId })}
          onToggleLock={(nodeId) => dispatch({ type: 'node/layer-lock', nodeId })}
          onToggleVisibility={(nodeId) => dispatch({ type: 'node/layer-visibility', nodeId })}
          selectedNodeId={state.selectedNodeId}
        />
      </div>
    </>
  );

  return (
    <main
      aria-label="Editor"
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-ink"
      data-editor-preset={state.device}
      id="main-content"
    >
      <EditorTopBar
        canRedo={state.future.length > 0}
        canUndo={state.past.length > 0}
        mode={mode}
        onBack={onBack}
        onDeploy={() => {
          if (!validation.isValid) {
            setIsValidationOpen(true);
            return;
          }
          onDeploy();
        }}
        onModeChange={setMode}
        onPreview={() => {
          if (!validation.isValid) {
            setIsValidationOpen(true);
            return;
          }
          setIsPreviewOpen(true);
        }}
        onRedo={() => dispatch({ type: 'history/redo' })}
        onRenameProject={onRenameProject}
        onUndo={() => dispatch({ type: 'history/undo' })}
        projectName={project.name}
        saving={saving}
        validation={validation}
      />

      {mode === 'design' ? (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {isCompactChrome ? null : leftPanel}

          <div className="flex min-w-0 flex-1 flex-col">
            {isCompactChrome ? (
              <div
                aria-label="Canvas panels"
                className="flex items-center gap-1 border-b border-hairline bg-surface px-2 py-1"
                data-testid="preset-panel-bar"
                role="toolbar"
              >
                <span className="px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  {state.device} preset
                </span>
                <button
                  aria-controls="editor-compact-panel"
                  aria-expanded={compactPanel === 'layers'}
                  aria-label="Toggle layers panel"
                  className={`rounded-tile px-2.5 py-1 text-xs font-medium transition-colors ${
                    compactPanel === 'layers' ? 'bg-canvas text-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink'
                  }`}
                  onClick={() => toggleCompactPanel('layers')}
                  type="button"
                >
                  Layers
                </button>
                <button
                  aria-controls="editor-compact-panel"
                  aria-expanded={compactPanel === 'inspector'}
                  aria-label="Toggle inspector panel"
                  className={`rounded-tile px-2.5 py-1 text-xs font-medium transition-colors ${
                    compactPanel === 'inspector' ? 'bg-canvas text-ink' : 'text-ink-muted hover:bg-canvas hover:text-ink'
                  }`}
                  onClick={() => toggleCompactPanel('inspector')}
                  type="button"
                >
                  Inspector
                </button>
              </div>
            ) : null}

            <ScreenTabs
              activeScreenId={state.activeScreenId}
              onAddScreen={() => dispatch({ type: 'screen/add' })}
              onDeleteScreen={(screenId) => dispatch({ type: 'screen/delete', screenId })}
              onRenameScreen={(screenId, name) => dispatch({ type: 'screen/rename', screenId, name })}
              onSelectScreen={(screenId) => dispatch({ type: 'screen/select', screenId })}
              screens={state.document.screens}
            />
            <EditorCanvas
              dataContext={{ collections: projectData.collections, recordsByCollection: projectData.recordsByCollection }}
              device={state.device}
              dropIndicator={state.dropIndicator}
              isSnapEnabled={state.isSnapEnabled}
              onAddBehavior={() => addBehaviorFromSelection('click')}
              onDeleteSelected={() => {
                if (state.selectedNodeId) {
                  dispatch({ type: 'node/delete', nodeId: state.selectedNodeId });
                }
              }}
              onDuplicateSelected={() => {
                if (state.selectedNodeId) {
                  dispatch({ type: 'node/duplicate', nodeId: state.selectedNodeId });
                }
              }}
              onDragStart={() => dispatch({ type: 'node/dragStart' })}
              onDropAt={(nodeType, x, y, parentId) => dispatch({ type: 'canvas/dropAt', nodeType, x, y, parentId })}
              onDropIndicatorChange={(position) => dispatch({ type: 'canvas/dropIndicator', position })}
              onNodeMove={(nodeId, x, y) => dispatch({ type: 'node/move', nodeId, x, y })}
              onNodeResize={(nodeId, geometry) => dispatch({ type: 'node/resize', nodeId, geometry })}
              onReparentNode={(nodeId, parentId, absolutePosition) =>
                dispatch({ type: 'node/reparent', nodeId, parentId, absolutePosition })
              }
              onSelectNode={(nodeId) => dispatch({ type: 'node/select', nodeId })}
              onDeviceChange={(nextDevice) => dispatch({ type: 'device/set', device: nextDevice })}
              onToggleSnap={() => dispatch({ type: 'snap/toggle' })}
              onZoomChange={(zoom) => dispatch({ type: 'zoom/set', zoom })}
              screen={activeScreen}
              selectedNodeId={state.selectedNodeId}
              zoom={state.zoom}
            />
          </div>

          {isCompactChrome ? null : (
            <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-hairline bg-surface">
              {inspectorContent}
            </aside>
          )}

          {isCompactChrome && compactPanel === 'layers' ? (
            <CompactPanelDrawer
              id="editor-compact-panel"
              onClose={() => setCompactPanel(null)}
              side="left"
              widthClassName="w-64"
            >
              {leftPanel}
            </CompactPanelDrawer>
          ) : null}

          {isCompactChrome && compactPanel === 'inspector' ? (
            <CompactPanelDrawer
              id="editor-compact-panel"
              onClose={() => setCompactPanel(null)}
              side="right"
              widthClassName="w-72"
            >
              <aside className="flex h-full w-full flex-col overflow-hidden bg-surface">
                {inspectorContent}
              </aside>
            </CompactPanelDrawer>
          ) : null}
        </div>
      ) : mode === 'logic' ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LogicWorkspace collections={projectData.collections} state={state} dispatch={dispatch} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <DataWorkspace data={projectData} />
        </div>
      )}

      {isPreviewOpen ? (
        <PreviewOverlay
          collections={projectData.collections}
          initialDevice={state.device}
          initialScreenId={state.activeScreenId}
          onClose={() => setIsPreviewOpen(false)}
          projectName={project.name}
          recordsByCollection={projectData.recordsByCollection}
          screens={state.document.screens}
        />
      ) : null}

      <AssistantChip isHidden={isAssistantOpen} onOpen={() => setIsAssistantOpen(true)} />
      {isAssistantOpen ? (
        <AssistantSheet
          dispatch={dispatch}
          onClose={() => setIsAssistantOpen(false)}
          state={state}
        />
      ) : null}
    </main>
  );
}
