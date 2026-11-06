import { useReducer, useState } from 'react';
import type { Project } from '@domain/entities/project';
import type { ComponentType } from '@domain/entities/componentNode';
import type { TriggerEvent } from '@domain/entities/logic';
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

export function EditorWorkspace({ project, onRenameProject, onBack, onDeploy }: EditorWorkspaceProps) {
  const [state, dispatch] = useReducer(editorReducer, project.document, createEditorState);
  const [mode, setMode] = useState<EditorMode>('design');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  const activeScreen = getActiveScreen(state);
  const selectedNode = state.selectedNodeId ? findNodeInScreen(activeScreen, state.selectedNodeId) : undefined;

  const projectData = useProjectData(project.id);
  const validation = useProjectValidation(project.id, state.document);

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

  return (
    <main aria-label="Editor" className="flex min-h-0 flex-1 flex-col bg-canvas text-ink" id="main-content">
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
        <div className="flex min-h-0 flex-1">
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
              onToggleSnap={() => dispatch({ type: 'snap/toggle' })}
              onZoomChange={(zoom) => dispatch({ type: 'zoom/set', zoom })}
              screen={activeScreen}
              selectedNodeId={state.selectedNodeId}
              zoom={state.zoom}
            />
          </div>

          <aside className="flex w-72 shrink-0 flex-col border-l border-hairline bg-surface">
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
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${validation.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
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
          </aside>
        </div>
      ) : mode === 'logic' ? (
        <LogicWorkspace collections={projectData.collections} state={state} dispatch={dispatch} />
      ) : (
        <DataWorkspace data={projectData} />
      )}

      {isPreviewOpen ? (
        <PreviewOverlay
          collections={projectData.collections}
          device={state.device}
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
