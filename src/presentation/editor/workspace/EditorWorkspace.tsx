import { useEffect, useReducer, useState } from 'react';
import type { Project } from '@domain/entities/project';
import type { ComponentNode, ComponentType, ListViewNode } from '@domain/entities/componentNode';
import { geometryAtBreakpoint, isChildBearingNode, listViewItemExtentAtBreakpoint, resolveEdgeInsets } from '@domain/entities/componentNode';
import type { DataRecord, DataValue, ListItemContext } from '@domain/entities/appData';
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
import { ScreenRouteEditor } from './ScreenRouteEditor';
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
import { CollapsedPanelRail, PanelCollapseButton } from '../PanelCollapseControl';
import { ResizeHandle } from '../layout/ResizeHandle';
import { useResizablePane } from '../layout/useResizablePane';
import type { ListItemBindingField } from './Inspector';
import { getComponentTreeLocation } from '@domain/componentTree';

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
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const { size: inspectorWidth, isDragging: isInspectorDragging, startResize: startInspectorResize, onKeyDown: inspectorKeyDown, reset: resetInspectorWidth } = useResizablePane({
    defaultSize: 288,
    minSize: 240,
    maxSize: 520,
    orientation: 'horizontal',
    storageKey: 'novy.editor.layout.v1.inspector',
    grow: -1,
  });
  const { size: validationHeight, isDragging: isValidationDragging, startResize: startValidationResize, onKeyDown: validationKeyDown, reset: resetValidationHeight } = useResizablePane({
    defaultSize: 200,
    minSize: 120,
    maxSize: 360,
    orientation: 'vertical',
    storageKey: 'novy.editor.layout.v1.inspector-validation',
    grow: -1,
  });

  const activeScreen = getActiveScreen(state);
  const selectedNode = state.selectedNodeId ? findNodeInScreen(activeScreen, state.selectedNodeId) : undefined;

  const projectData = useProjectData(project.id);
  const itemSource = state.selectedNodeId
    ? findNearestListView(activeScreen.nodes, state.selectedNodeId)
    : null;
  const itemDataSource = itemSource?.props.dataSource;
  const screenRecordCollectionId = state.document.screens
    .flatMap((candidate) => candidate.logicGraphs)
    .flatMap((graph) => graph.nodes)
    .flatMap((node) => node.kind === 'action' && node.payload.type === 'navigate' &&
      node.payload.targetScreenId === activeScreen.id && node.payload.recordContext
      ? [node.payload.recordContext.collectionId]
      : [])[0];
  const listItemFields: readonly ListItemBindingField[] = itemDataSource?.kind === 'static'
    ? itemDataSource.fields
    : itemDataSource?.kind === 'collection'
      ? projectData.collections
          .find((collection) => collection.id === itemDataSource.collectionId)
          ?.fields.map(({ id, label, type }) => ({ id, label, type })) ?? []
      : screenRecordCollectionId
        ? projectData.collections
            .find((collection) => collection.id === screenRecordCollectionId)
            ?.fields.map(({ id, label, type }) => ({ id, label, type })) ?? []
        : [];
  const scopedListView = state.designScope.kind === 'list-item-template'
    ? findNodeInScreen(activeScreen, state.designScope.listViewId)
    : null;
  const activeTemplate = scopedListView?.type === 'listview' ? scopedListView : null;
  const deviceBounds = deviceViewport(state.device);
  const templateCanvasBounds = activeTemplate
    ? (() => {
        const geometry = geometryAtBreakpoint(activeTemplate, state.device);
        return activeTemplate.props.scrollDirection === 'vertical'
          ? { width: geometry.w, height: deviceBounds.height }
          : { width: deviceBounds.width, height: geometry.h };
      })()
    : undefined;
  const templateItemExtent = activeTemplate ? listViewItemExtentAtBreakpoint(activeTemplate, state.device) : 0;
  const designNodes = activeTemplate?.children ?? activeScreen.nodes;
  const canvasScreen = activeTemplate
    ? { ...activeScreen, id: `${activeScreen.id}__item-template`, nodes: activeTemplate.children }
    : activeScreen;
  const templateItemContext = activeTemplate
    ? resolveTemplateItemContext(
        activeTemplate,
        state.designScope.kind === 'list-item-template' ? state.designScope.sampleItemId : null,
        projectData.recordsByCollection,
      )
    : undefined;
  const validation = useProjectValidation(project.id, state.document);

  useProjectAutosave({
    projectId: project.id,
    document: state.document,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isSaving: state.isSaving,
    onBegin: () => dispatch({ type: 'autosave/begin' }),
    onSaved: (savedAt: Date, savedDocument) => dispatch({ type: 'autosave/end', savedAt, savedDocument }),
    onFailed: (message) => dispatch({ type: 'autosave/fail', message }),
  });

  useEditorShortcuts({
    dispatch,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    isActive: mode === 'design',
    isFrameSelected: state.designScope.kind === 'list-item-template' && state.selectedNodeId === state.designScope.listViewId,
    isItemDesign: state.designScope.kind === 'list-item-template',
    selectedNodeId: state.selectedNodeId,
  });

  const saving: AutosaveStatus = {
    isSaving: state.isSaving,
    hasUnsavedChanges: state.hasUnsavedChanges,
    lastSavedAt: state.lastSavedAt,
    error: state.autosaveError,
  };

  function addFromPalette(nodeType: ComponentType): void {
    const bounds = templateCanvasBounds ?? deviceBounds;
    if (activeTemplate) {
      const location = getComponentTreeLocation(activeScreen.nodes, activeTemplate.id, state.device);
      dispatch({
        type: 'canvas/dropAt',
        nodeType,
        x: (location?.absoluteX ?? activeTemplate.x) + bounds.width / 2,
        y: (location?.absoluteY ?? activeTemplate.y) + bounds.height / 2,
        parentId: activeTemplate.id,
      });
    } else {
      dispatch({ type: 'node/add', nodeType, x: bounds.width / 2, y: bounds.height / 2 });
    }
  }

  function addBehaviorFromSelection(event: TriggerEvent = 'click'): void {
    if (state.selectedNodeId) {
      dispatch({ type: 'behavior/create', targetNodeId: state.selectedNodeId, event });
    }
    setMode('logic');
  }

  function closeItemTemplate(): void {
    const ownerId = state.designScope.kind === 'list-item-template' ? state.designScope.listViewId : null;
    dispatch({ type: 'design/item-template-close' });
    if (ownerId) requestAnimationFrame(() => document.getElementById(`edit-item-template-${ownerId}`)?.focus());
  }

  useEffect(() => {
    if (state.designScope.kind !== 'list-item-template') return;
    const frameId = state.designScope.listViewId;
    function handleEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"]')) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      if (state.selectedNodeId !== frameId) {
        dispatch({ type: 'node/select', nodeId: frameId });
      } else {
        closeItemTemplate();
      }
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  });

  return (
    <main aria-label="Editor" className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-canvas text-ink" id="main-content">
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
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <EditorLeftPanel
                 frame={activeTemplate}
                 nodes={designNodes}
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
            {activeTemplate ? (
              <div aria-live="polite" className="flex min-h-12 items-center justify-between gap-3 border-b border-hairline bg-surface px-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{activeScreen.name} / {activeTemplate.name ?? 'ListView'} / Item design</p>
                  <p className="text-xs text-ink-muted">
                    Free-form item frame · {activeTemplate.props.scrollDirection === 'vertical'
                      ? 'width follows the ListView; height grows with content'
                      : 'height follows the ListView; width grows with content'}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-ink-muted">
                    Sample item
                    <select
                      className="ml-2 h-9 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
                      onChange={(event) => dispatch({ type: 'design/item-template-sample', sampleItemId: event.target.value || null })}
                      value={state.designScope.kind === 'list-item-template' ? state.designScope.sampleItemId ?? '' : ''}
                    >
                      <option value="">First available</option>
                      {templateSampleOptions(activeTemplate, projectData.recordsByCollection).map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <button className="min-h-11 rounded-tile border border-hairline bg-surface px-3 text-sm font-medium text-ink" onClick={closeItemTemplate} type="button">
                    Exit item design
                  </button>
                </div>
              </div>
            ) : <><ScreenTabs
              activeScreenId={state.activeScreenId}
              onAddScreen={() => dispatch({ type: 'screen/add' })}
              onDeleteScreen={(screenId) => dispatch({ type: 'screen/delete', screenId })}
              onRenameScreen={(screenId, name) => dispatch({ type: 'screen/rename', screenId, name })}
              onSelectScreen={(screenId) => dispatch({ type: 'screen/select', screenId })}
              screens={state.document.screens}
            />
            <ScreenRouteEditor
              onChange={(path) => dispatch({ type: 'screen/path', screenId: activeScreen.id, path })}
              path={activeScreen.path}
            /></>}
            {activeTemplate && activeTemplate.children.length === 0 ? (
              <div className="border-b border-dashed border-hairline bg-surface px-4 py-3 text-center" role="status">
                <span className="text-sm text-ink-muted">This item template is empty.</span>
              </div>
            ) : null}
            <EditorCanvas
              boundsOverride={templateCanvasBounds}
              dataContext={{ collections: projectData.collections, recordsByCollection: projectData.recordsByCollection }}
              itemFramePreview={activeTemplate ? {
                nodeId: activeTemplate.id,
                itemExtent: templateItemExtent,
                padding: resolveEdgeInsets(activeTemplate.props.padding),
                spacing: activeTemplate.props.itemSpacing,
                radius: activeTemplate.props.itemBorderRadius,
                showDividers: activeTemplate.props.showDividers,
                direction: activeTemplate.props.scrollDirection,
              } : undefined}
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
              onEditItemTemplate={(listViewId) => dispatch({ type: 'design/item-template-open', listViewId })}
              itemContext={templateItemContext}
              onDropAt={(nodeType, x, y, parentId) => {
                const owner = activeTemplate
                  ? getComponentTreeLocation(activeScreen.nodes, activeTemplate.id, state.device)
                  : null;
                dispatch({
                  type: 'canvas/dropAt',
                  nodeType,
                  x: x + (owner?.absoluteX ?? 0),
                  y: y + (owner?.absoluteY ?? 0),
                  parentId: parentId ?? activeTemplate?.id ?? null,
                });
              }}
              onDropIndicatorChange={(position) => dispatch({ type: 'canvas/dropIndicator', position })}
              onNodeMove={(nodeId, x, y) => dispatch({ type: 'node/move', nodeId, x, y })}
              onNodeResize={(nodeId, geometry) => dispatch({ type: 'node/resize', nodeId, geometry })}
              onReparentNode={(nodeId, parentId, absolutePosition) => {
                const owner = activeTemplate
                  ? getComponentTreeLocation(activeScreen.nodes, activeTemplate.id, state.device)
                  : null;
                dispatch({
                  type: 'node/reparent',
                  nodeId,
                  parentId: parentId ?? activeTemplate?.id ?? null,
                  absolutePosition: {
                    x: absolutePosition.x + (owner?.absoluteX ?? 0),
                    y: absolutePosition.y + (owner?.absoluteY ?? 0),
                  },
                });
              }}
              onSelectNode={(nodeId) => dispatch({ type: 'node/select', nodeId })}
              onDeviceChange={(nextDevice) => dispatch({ type: 'device/set', device: nextDevice })}
              onToggleSnap={() => dispatch({ type: 'snap/toggle' })}
              onZoomChange={(zoom) => dispatch({ type: 'zoom/set', zoom })}
              screen={canvasScreen}
              selectedNodeId={state.selectedNodeId}
              zoom={state.zoom}
            />
          </div>

          {isInspectorCollapsed ? (
            <CollapsedPanelRail
              controls="design-inspector-panel"
              label="inspector panel"
              onExpand={() => setIsInspectorCollapsed(false)}
              side="right"
            />
          ) : (
            <>
              <ResizeHandle
                controls="design-inspector-panel"
                isDragging={isInspectorDragging}
                label="Resize inspector panel"
                max={520}
                min={240}
                onDoubleClick={resetInspectorWidth}
                onKeyDown={inspectorKeyDown}
                onPointerDown={startInspectorResize}
                orientation="horizontal"
                value={inspectorWidth}
              />
              <aside className="flex shrink-0 flex-col overflow-hidden border-l border-hairline bg-surface" id="design-inspector-panel" style={{ width: inspectorWidth }}>
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-hairline pl-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Inspector</span>
                  <PanelCollapseButton
                    controls="design-inspector-panel"
                    isCollapsed={false}
                    label="inspector panel"
                    onToggle={() => setIsInspectorCollapsed(true)}
                    side="right"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <Inspector
                    behaviors={activeScreen.behaviors}
                    collections={projectData.collections}
                    device={state.device}
                    itemFrame={activeTemplate}
                    listItemFields={listItemFields}
                    node={selectedNode ?? null}
                    onAction={(action: EditorAction) => dispatch(action)}
                    onOpenLogic={() => setMode('logic')}
                    onEditItemTemplate={(listViewId) => dispatch({ type: 'design/item-template-open', listViewId })}
                  />
                </div>
                <div className="shrink-0 border-t border-hairline">
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
                  {isValidationOpen ? (
                    <div className="flex shrink-0 flex-col overflow-hidden border-t border-hairline" style={{ height: validationHeight }}>
                      <ResizeHandle
                        controls="design-validation-panel"
                        isDragging={isValidationDragging}
                        label="Resize validation panel"
                        max={360}
                        min={120}
                        onDoubleClick={resetValidationHeight}
                        onKeyDown={validationKeyDown}
                        onPointerDown={startValidationResize}
                        orientation="vertical"
                        value={validationHeight}
                      />
                      <div className="min-h-0 flex-1 overflow-y-auto" id="design-validation-panel">
                        <ValidationPanel onIssueSelect={(issue) => {
                          if (issue.screenId) dispatch({ type: 'screen/select', screenId: issue.screenId });
                          if (issue.componentId) dispatch({ type: 'node/select', nodeId: issue.componentId });
                        }} report={validation} />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 border-t border-hairline">
                  <LayersPanel
                    frame={activeTemplate}
                    isEmbedded
                    device={state.device}
                    nodes={designNodes}
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
            </>
          )}
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
          persistence={{
            createRecord: projectData.createRecord,
            deleteRecord: projectData.deleteRecord,
            updateRecord: projectData.updateRecord,
          }}
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

function findNearestListView(
  nodes: readonly ComponentNode[],
  targetId: string,
  nearest: ListViewNode | null = null,
): ListViewNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return nearest;
    if (!isChildBearingNode(node)) continue;
    const found = findNearestListView(
      node.children,
      targetId,
      node.type === 'listview' ? node : nearest,
    );
    if (found) return found;
  }
  return null;
}

function templateSampleOptions(
  listView: ListViewNode,
  recordsByCollection: ReadonlyMap<string, readonly DataRecord[]>,
): Array<{ id: string; label: string }> {
  if (listView.props.dataSource.kind === 'static') {
    const primaryField = listView.props.dataSource.fields[0]?.id;
    return listView.props.dataSource.items.map((item, index) => ({
      id: item.id,
      label: String((primaryField ? item.values[primaryField] : undefined) ?? `Item ${index + 1}`),
    }));
  }
  const source = listView.props.dataSource;
  const primaryField = source.displayFieldIds[0];
  return (recordsByCollection.get(source.collectionId) ?? []).map((record, index) => ({
    id: record.id,
    label: String((primaryField ? record.values[primaryField] : undefined) ?? `Record ${index + 1}`),
  }));
}

function resolveTemplateItemContext(
  listView: ListViewNode,
  sampleItemId: string | null,
  recordsByCollection: ReadonlyMap<string, readonly DataRecord[]>,
): ListItemContext {
  if (listView.props.dataSource.kind === 'static') {
    const source = listView.props.dataSource;
    const item = source.items.find((candidate) => candidate.id === sampleItemId) ?? source.items[0];
    return {
      listViewId: listView.id,
      itemId: item?.id ?? 'listview-template',
      values: item?.values ?? Object.fromEntries(source.fields.map((field) => [field.id, sampleValue(field.type, field.label)])),
    };
  }
  const source = listView.props.dataSource;
  const records = recordsByCollection.get(source.collectionId) ?? [];
  const record = records.find((candidate) => candidate.id === sampleItemId) ?? records[0];
  return {
    listViewId: listView.id,
    itemId: record?.id ?? 'listview-template',
    values: record?.values ?? Object.fromEntries(source.displayFieldIds.map((fieldId) => [fieldId, fieldId])),
  };
}

function sampleValue(type: 'text' | 'number' | 'boolean' | 'date', label: string): DataValue {
  if (type === 'number') return 42;
  if (type === 'boolean') return true;
  if (type === 'date') return '2026-11-07';
  return label || 'Sample value';
}
