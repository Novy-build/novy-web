import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Screen } from '@domain/entities/screen';
import type { DataCollection, DataRecord, DataValue, LocalListItemAddition } from '@domain/entities/appData';
import { validateRecordValues } from '@domain/appData/validation';
import { generateId } from '@domain/ids';
import type { TriggerEvent } from '@domain/entities/logic';
import {
  applyTextOverrides,
  runBehaviorAsync,
  type AsyncPreviewEffect,
  type DataOperationPayload,
} from '@domain/logic/runtime';
import { Modal } from '@presentation/components/system/Modal';
import { ScreenFrame } from '../renderer/ScreenFrame';
import { DeviceToggle } from './DeviceToggle';
import { PreviewZoomControls } from './PreviewZoomControls';
import { DEFAULT_EDITOR_DEVICE } from '../state/geometry';
import type { EditorDevice } from '../state/geometry';
import { computeFitWidthZoom, computeFitZoom } from '../state/geometry';
import { CANVAS_PRESETS } from '../renderer/ScreenFrame';
import type { RendererEventContext } from '../renderer/renderer';
import type { AppTheme } from '../renderer/AppThemeContext';
import { readDocumentAppTheme } from '../renderer/useDocumentAppTheme';
import { findNodeInScreen } from '../state/editorState';
import type { ProjectType } from '@domain/entities/project';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import { websitePageHeight } from '@domain/sections/sectionLayout';
import type { ActionPayload } from '@domain/entities/logic';
import type { RuntimePreviewRepository } from '@domain/repositories/runtimePreview.repository';
import {
  RuntimePreviewError,
  type RuntimePreviewUser,
} from '@domain/repositories/runtimePreview.repository';
import { RuntimePreviewAuthPanel } from './RuntimePreviewAuthPanel';

const TOAST_VISIBLE_MS = 2400;
const PREVIEW_ZOOM_LIMITS = { min: 0.25, max: 2, step: 0.25 } as const;

interface PreviewOverlayProps {
  /** All screens so navigate steps can switch the preview target. */
  screens: Screen[];
  /** Screen that should be previewed first. */
  initialScreenId?: string;
  initialDevice?: EditorDevice;
  projectName: string;
  projectType?: ProjectType;
  onClose: () => void;
  collections?: readonly DataCollection[];
  recordsByCollection?: ReadonlyMap<string, readonly DataRecord[]>;
  persistence?: PreviewPersistenceActions;
  /** Current generated-app manifest used to start a real immutable runtime version. */
  runtimeManifest?: unknown;
  runtimePreview?: RuntimePreviewRepository;
  designSystem?: AppDesignSystem;
}

export interface PreviewPersistenceActions {
  createRecord: (collectionId: string, values: Record<string, DataValue>) => Promise<DataRecord>;
  updateRecord: (collectionId: string, recordId: string, values: Record<string, DataValue>) => Promise<DataRecord>;
  deleteRecord: (collectionId: string, recordId: string) => Promise<void>;
}

interface Toast {
  id: number;
  message: string;
  kind?: 'error';
}

/**
 * Reactive preview of the published experience: component click behaviors
 * (chains of change-text / show-message / navigate) execute through the
 * domain runtime, and effects render through the same ScreenFrame.
 */
export function PreviewOverlay({
  screens,
  initialScreenId,
  initialDevice = DEFAULT_EDITOR_DEVICE,
  projectName,
  projectType = 'app',
  onClose,
  collections = [],
  recordsByCollection = new Map(),
  persistence,
  runtimeManifest,
  runtimePreview,
  designSystem,
}: PreviewOverlayProps) {
  const [previewDevice, setPreviewDevice] = useState<EditorDevice>(initialDevice);
  const viewportBounds = CANVAS_PRESETS[previewDevice];
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);
  const isAutoFitRef = useRef(true);
  const [screenId, setScreenId] = useState(() => {
    if (initialScreenId && screens.some((candidate) => candidate.id === initialScreenId)) {
      return initialScreenId;
    }
    return screens[0]?.id ?? '';
  });
  const [textOverrides, setTextOverrides] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [componentValues, setComponentValues] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [variables, setVariables] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [routeRecordContext, setRouteRecordContext] = useState<{ collectionId: string; recordId: string } | null>(null);
  const [previewRecords, setPreviewRecords] = useState<ReadonlyMap<string, readonly DataRecord[]>>(
    () => new Map(recordsByCollection),
  );
  const previewRecordsRef = useRef(previewRecords);
  previewRecordsRef.current = previewRecords;
  const [persistDataChanges, setPersistDataChanges] = useState(false);
  const sandboxDirtyRef = useRef(false);
  const activeClicksRef = useRef(new Set<string>());
  const [pendingClicks, setPendingClicks] = useState(0);
  const activeOperationsRef = useRef(0);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [appTheme, setAppTheme] = useState<AppTheme>(readDocumentAppTheme);
  const [localItemsByListView, setLocalItemsByListView] = useState<
    ReadonlyMap<string, readonly LocalListItemAddition[]>
  >(() => new Map());
  const optimisticChatMessagesRef = useRef(new Map<string, string>());
  const [pendingChatNodeIds, setPendingChatNodeIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const knowledgeRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const memoryRef = useRef<Map<string, unknown[]>>(new Map());
  const mediaRef = useRef<Map<string, File>>(new Map());
  const [runtimeAppId, setRuntimeAppId] = useState<string | null>(null);
  const [runtimeUser, setRuntimeUser] = useState<RuntimePreviewUser | null>(null);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<'simulated' | 'starting' | 'live' | 'stale' | 'error'>('simulated');
  const startedManifestRef = useRef<unknown>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [zoom, setZoom] = useState(1);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const screen: Screen | null = screens.find((candidate) => candidate.id === screenId) ?? screens[0] ?? null;
  const bounds = useMemo(
    () => projectType === 'website'
      ? { ...viewportBounds, height: websitePageHeight(screen, previewDevice) }
      : viewportBounds,
    [previewDevice, projectType, screen, viewportBounds],
  );
  const routeRecord = routeRecordContext
    ? (previewRecords.get(routeRecordContext.collectionId) ?? [])
        .find((record) => record.id === routeRecordContext.recordId) ?? null
    : null;
  const routeItemContext = routeRecord
    ? { listViewId: 'route-record', itemId: routeRecord.id, values: routeRecord.values }
    : undefined;

  function previewRuntimeData() {
    return {
      getRecord: (collectionId: string, recordId: string) =>
        (previewRecordsRef.current.get(collectionId) ?? []).find((record) => record.id === recordId) ?? null,
      loadCollectionDocuments: (
        collectionId: string,
        contentFieldId: string,
        titleFieldId?: string,
        documentIdFieldId?: string,
      ) => (previewRecordsRef.current.get(collectionId) ?? []).map((record) => ({
        id: String(documentIdFieldId ? record.values[documentIdFieldId] ?? record.id : record.id),
        title: String(titleFieldId ? record.values[titleFieldId] ?? '' : ''),
        text: String(record.values[contentFieldId] ?? ''),
        metadata: { recordId: record.id, collectionId },
      })),
      vectorUpsert: (chunks: readonly unknown[]) => {
        let insertedCount = 0;
        let updatedCount = 0;
        for (const chunk of chunks) {
          if (typeof chunk !== 'object' || chunk === null) continue;
          const record = chunk as Record<string, unknown>;
          const id = String(record.id ?? `chunk-${knowledgeRef.current.size + 1}`);
          if (knowledgeRef.current.has(id)) updatedCount += 1;
          else insertedCount += 1;
          knowledgeRef.current.set(id, record);
        }
        return { insertedCount, updatedCount };
      },
      vectorDelete: (documentId: string) => {
        let removedCount = 0;
        for (const [id, chunk] of knowledgeRef.current) {
          if (String(chunk.documentId ?? '') !== documentId) continue;
          knowledgeRef.current.delete(id);
          removedCount += 1;
        }
        return { removedCount };
      },
      vectorRetrieve: (question: string, topK: number, minimumScore: number) => {
        const terms = question.toLowerCase().split(/\W+/).filter(Boolean);
        return [...knowledgeRef.current.values()]
          .map((chunk) => {
            const text = String(chunk.text ?? '');
            const haystack = text.toLowerCase();
            const hits = terms.filter((term) => haystack.includes(term)).length;
            const score = terms.length === 0 ? 0 : hits / terms.length;
            return { ...chunk, score };
          })
          .filter((chunk) => Number(chunk.score) >= minimumScore)
          .sort((left, right) => Number(right.score) - Number(left.score))
          .slice(0, topK);
      },
      memoryLoad: (conversationId: string, windowSize: number) =>
        (memoryRef.current.get(conversationId) ?? []).slice(-windowSize),
      memoryAppend: (conversationId: string, messages: readonly unknown[]) => {
        memoryRef.current.set(conversationId, [...messages]);
        return messages.length;
      },
      memoryClear: (conversationId: string) => {
        memoryRef.current.delete(conversationId);
      },
    };
  }

  async function startRealRuntime(): Promise<void> {
    if (!runtimeManifest || !runtimePreview?.isAvailable || runtimeStatus === 'starting') return;
    setRuntimeStatus('starting');
    setToast(null);
    try {
      const session = await runtimePreview.prepare(runtimeManifest);
      startedManifestRef.current = runtimeManifest;
      setRuntimeAppId(session.appId);
      setRuntimeStatus('live');
      const user = await runtimePreview.getSession(session.appId).catch(() => null);
      setRuntimeUser(user);
      knowledgeRef.current.clear();
      memoryRef.current.clear();
      setToast({ id: Date.now(), message: 'Real runtime is connected.' });
    } catch (error: unknown) {
      setRuntimeAppId(null);
      setRuntimeStatus('error');
      setToast({
        id: Date.now(),
        message: error instanceof Error ? error.message : 'The real runtime could not be started.',
        kind: 'error',
      });
    }
  }

  function stopRealRuntime(): void {
    setRuntimeAppId(null);
    setRuntimeUser(null);
    setAuthPrompt(null);
    setRuntimeStatus('simulated');
    startedManifestRef.current = null;
    mediaRef.current.clear();
    setToast({ id: Date.now(), message: 'Returned to isolated simulation.' });
  }

  useEffect(() => {
    if (runtimeStatus === 'live' && startedManifestRef.current !== runtimeManifest) {
      setRuntimeStatus('stale');
    }
  }, [runtimeManifest, runtimeStatus]);

  async function executeRealServerAction(
    actionId: string,
    payload: ActionPayload,
    inputs: Readonly<Record<string, unknown>>,
  ): Promise<unknown> {
    if (!runtimeAppId || !runtimePreview) throw new Error('Start the real runtime before running server actions.');
    activeOperationsRef.current += 1;
    setPendingOperations((current) => current + 1);
    try {
      if (payload.type === 'document-upload') {
        const reference = typeof inputs.mediaReference === 'string'
          ? inputs.mediaReference
          : payload.mediaReference;
        const file = mediaRef.current.get(reference);
        if (!file) throw new Error('Choose a document before running Document Upload.');
        const output = await runtimePreview.uploadDocument(runtimeAppId, actionId, inputs, file);
        mediaRef.current.delete(reference);
        return output;
      }
      if (payload.type.startsWith('cv-')) {
        const reference = typeof inputs.mediaReference === 'string'
          ? inputs.mediaReference
          : String((payload as { mediaReference?: unknown }).mediaReference ?? '');
        const file = mediaRef.current.get(reference);
        if (!file) throw new Error('Choose or capture media before running Computer Vision.');
        const output = await runtimePreview.executeVision(runtimeAppId, actionId, inputs, file);
        if (payload.type === 'cv-verify' && output.verified === true) {
          setRuntimeUser(await runtimePreview.getSession(runtimeAppId));
        }
        return output;
      }
      const output = await runtimePreview.execute(runtimeAppId, actionId, payload, inputs);
      reconcileRuntimeRecords(payload, output);
      return output;
    } catch (error: unknown) {
      if (error instanceof RuntimePreviewError
        && (error.code === 'runtime_auth_required' || error.code === 'rag_memory_auth_required')) {
        setAuthPrompt('This action needs a generated-app user session.');
      }
      throw error;
    } finally {
      activeOperationsRef.current -= 1;
      setPendingOperations((current) => Math.max(0, current - 1));
    }
  }

  function reconcileRuntimeRecords(
    payload: ActionPayload,
    output: Readonly<Record<string, unknown>>,
  ): void {
    if (!('collectionId' in payload) || typeof payload.collectionId !== 'string') return;
    const collectionId = payload.collectionId;
    if (payload.type === 'get-records' && Array.isArray(output.records)) {
      replacePreviewCollection(
        collectionId,
        output.records.map(readRuntimeRecord).filter((record): record is DataRecord => record !== null),
      );
      return;
    }
    const record = readRuntimeRecord(output.record);
    const current = previewRecordsRef.current.get(collectionId) ?? [];
    if (payload.type === 'insert-record' && record) {
      replacePreviewCollection(collectionId, [...current, record]);
    } else if (payload.type === 'update-record' && record) {
      replacePreviewCollection(
        collectionId,
        current.map((candidate) => candidate.id === record.id ? record : candidate),
      );
    } else if (payload.type === 'get-record' && record) {
      replacePreviewCollection(
        collectionId,
        current.some((candidate) => candidate.id === record.id)
          ? current.map((candidate) => candidate.id === record.id ? record : candidate)
          : [...current, record],
      );
    } else if (payload.type === 'delete-record' && typeof output.deletedRecordId === 'string') {
      replacePreviewCollection(
        collectionId,
        current.filter((candidate) => candidate.id !== output.deletedRecordId),
      );
    }
  }

  async function resetRuntimeData(): Promise<void> {
    if (!runtimePreview || !runtimeManifest || runtimeStatus === 'starting') return;
    const projectId = projectIdFromManifest(runtimeManifest);
    if (!projectId) {
      setToast({ id: Date.now(), message: 'The preview project ID is unavailable.', kind: 'error' });
      return;
    }
    setRuntimeStatus('starting');
    try {
      const cleared = await runtimePreview.resetData(projectId);
      const session = await runtimePreview.prepare(runtimeManifest);
      setRuntimeAppId(session.appId);
      startedManifestRef.current = runtimeManifest;
      setRuntimeStatus('live');
      setToast({
        id: Date.now(),
        message: `Preview data reset${cleared ? ` (${cleared} records cleared)` : ''}.`,
      });
    } catch (error: unknown) {
      setRuntimeStatus('error');
      setToast({
        id: Date.now(),
        message: error instanceof Error ? error.message : 'Preview data could not be reset.',
        kind: 'error',
      });
    }
  }

  const handleNodeEvent = useCallback(
    (nodeId: string, event: TriggerEvent, value?: string, eventContext?: RendererEventContext): void => {
      if (!screen) {
        return;
      }
      const clickKey = `${screen.id}:${nodeId}:${eventContext?.listItem?.itemId ?? ''}`;
      const sourceNode = findNodeInScreen(screen, nodeId);
      const isMenuChoice = event === 'change' && sourceNode?.type === 'dropdown' && sourceNode.props.presentation === 'menu';
      const isChatSubmit = event === 'change' && sourceNode?.type === 'chat' && Boolean(value?.trim());
      const lockEvent = event === 'click' || isMenuChoice || isChatSubmit;
      if (lockEvent && activeClicksRef.current.has(clickKey)) return;
      if (lockEvent) {
        activeClicksRef.current.add(clickKey);
        setPendingClicks((current) => current + 1);
      }
      if (isChatSubmit) {
        const message = value!.trim();
        optimisticChatMessagesRef.current.set(nodeId, message);
        setLocalItemsByListView((previous) => {
          const current = previous.get(nodeId) ?? [];
          return new Map([
            ...previous,
            [nodeId, [...current, {
              itemId: generateId('chat-message'),
              placement: 'append' as const,
              values: { role: 'user', text: message, citations: '' },
            }]],
          ]);
        });
        setPendingChatNodeIds((current) => new Set([...current, nodeId]));
      }
      const nextValues = value === undefined
        ? componentValues
        : new Map([...componentValues, [nodeId, value]]);
      if (value !== undefined) setComponentValues(nextValues);
      void runBehaviorAsync(
        { screens },
        screen,
        nodeId,
        event,
        {
          componentValues: nextValues,
          listItem: eventContext?.listItem,
          variables,
          createLocalListItemId: () => generateId('preview-list-item'),
          data: previewRuntimeData(),
          executeDataOperation: applyDataOperation,
          ...((runtimeStatus === 'live' || runtimeStatus === 'stale') && runtimeAppId
            ? { executeServerAction: executeRealServerAction }
            : {}),
          session: runtimeStatus === 'live' || runtimeStatus === 'stale'
            ? { user: runtimeUser ? {
              ...runtimeUser,
              name: runtimeUser.isAnonymous ? 'Face user' : runtimeUser.email.split('@')[0],
            } : undefined }
            : { user: { id: 'preview-user', name: 'Preview User', email: 'preview@novy.app' } },
        },
      ).then(applyPreviewEffects).catch((error: unknown) => {
        setToast({ id: Date.now(), message: error instanceof Error ? error.message : 'Workflow failed.', kind: 'error' });
      }).finally(() => {
        if (isChatSubmit) {
          optimisticChatMessagesRef.current.delete(nodeId);
          setPendingChatNodeIds((current) => {
            const next = new Set(current);
            next.delete(nodeId);
            return next;
          });
        }
        if (lockEvent) {
          activeClicksRef.current.delete(clickKey);
          setPendingClicks((current) => Math.max(0, current - 1));
        }
      });
    },
    [componentValues, persistDataChanges, persistence, runtimeAppId, runtimeStatus, runtimeUser, screens, screen, variables],
  );

  function applyPreviewEffects(effects: readonly AsyncPreviewEffect[]): void {
      for (const effect of effects) {
        switch (effect.kind) {
          case 'change-text':
            setTextOverrides((previous) => new Map([...previous, [effect.nodeId, effect.text]]));
            break;
          case 'show-message':
            setToast({ id: Date.now() + Math.floor(Math.random() * 1000), message: effect.message });
            break;
          case 'navigate':
            setTextOverrides(new Map()); // entering a screen resets its runtime state
            setComponentValues(new Map());
            setLocalItemsByListView(new Map());
            if (effect.recordContext) {
              setRouteRecordContext(effect.recordContext);
              setVariables((previous) => new Map([
                ...previous,
                ['route.recordId', effect.recordContext!.recordId],
                ['route.collectionId', effect.recordContext!.collectionId],
              ]));
            } else setRouteRecordContext(null);
            setScreenId(effect.screenId);
            break;
          case 'data-operation':
            void applyDataOperation(effect.payload);
            break;
          case 'data-operation-error':
            setToast({ id: Date.now(), message: effect.message, kind: 'error' });
            break;
          case 'refresh-collection':
            setToast({ id: Date.now(), message: `Refreshed collection ${effect.collectionId}.` });
            break;
          case 'email-simulated':
            setToast({ id: Date.now(), message: `Preview email to ${effect.to} was simulated.` });
            break;
          case 'server-action-complete':
            setToast({ id: Date.now(), message: 'Email sent by the real runtime.' });
            break;
          case 'set-variable':
            setVariables((previous) => new Map([...previous, [effect.name, effect.value]]));
            break;
          case 'set-component-value':
            setComponentValues((previous) => new Map([...previous, [effect.nodeId, effect.value]]));
            break;
          case 'add-local-list-item':
            setLocalItemsByListView((previous) => {
              const current = previous.get(effect.listViewId) ?? [];
              return new Map([
                ...previous,
                [effect.listViewId, [...current, { ...effect.item, placement: effect.placement }]],
              ]);
            });
            setToast({ id: Date.now(), message: 'Local list item added for this preview session.' });
            break;
          case 'vector-indexed':
            setToast({
              id: Date.now(),
              message: `Indexed ${effect.insertedCount} chunks${runtimeStatus === 'live' || runtimeStatus === 'stale' ? ' using the real runtime' : ' (simulated)'}.`,
            });
            break;
          case 'vector-deleted':
            setToast({ id: Date.now(), message: `Removed ${effect.documentId} from the knowledge base (simulated).` });
            break;
          case 'chat-response':
            setTextOverrides((previous) => new Map([...previous, [effect.nodeId, effect.answer]]));
            if (effect.citationsNodeId) {
              setComponentValues((previous) => new Map([
                ...previous,
                [effect.citationsNodeId!, JSON.stringify(effect.citations)],
              ]));
            }
            setToast({ id: Date.now(), message: effect.answer || 'No answer was generated.' });
            break;
          case 'chat-message':
            if (effect.role === 'user'
              && optimisticChatMessagesRef.current.get(effect.chatId) === effect.text) {
              optimisticChatMessagesRef.current.delete(effect.chatId);
              break;
            }
            setLocalItemsByListView((previous) => {
              const current = previous.get(effect.chatId) ?? [];
              return new Map([
                ...previous,
                [effect.chatId, [...current, {
                  itemId: `chat_${Date.now()}_${current.length + 1}`,
                  placement: 'append' as const,
                  values: {
                    role: effect.role,
                    text: effect.text,
                    citations: effect.citations.map((citation) => citation.title).filter(Boolean).join(', '),
                  },
                }]],
              ]);
            });
            break;
          case 'cv-result': {
            const real = runtimeStatus === 'live' || runtimeStatus === 'stale';
            const message = effect.operation === 'liveness'
              ? effect.isLive ? `Live face detected${real ? '.' : ' (simulated).'}` : 'Live face was not detected.'
              : effect.operation === 'enroll'
                ? `Biometric credential ${effect.credentialId ?? ''} enrolled${real ? '.' : ' (simulated).'}`
                : effect.verified
                  ? `Biometric verification succeeded${real ? '.' : ' (simulated).'}`
                  : 'Biometric verification was rejected.';
            setToast({ id: Date.now(), message });
            break;
          }
          default: {
            const exhaustive: never = effect;
            void exhaustive;
          }
        }
      }
  }

  const loadedScreenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!screen || loadedScreenRef.current === screen.id) return;
    loadedScreenRef.current = screen.id;
    for (const behavior of screen.behaviors.filter((candidate) => candidate.event === 'load')) {
      void runBehaviorAsync(
        { screens },
        screen,
        behavior.targetNodeId,
        'load',
        {
          componentValues,
          variables,
          createLocalListItemId: () => generateId('preview-list-item'),
          data: previewRuntimeData(),
          executeDataOperation: applyDataOperation,
          ...((runtimeStatus === 'live' || runtimeStatus === 'stale') && runtimeAppId
            ? { executeServerAction: executeRealServerAction }
            : {}),
          session: runtimeStatus === 'live' || runtimeStatus === 'stale'
            ? { user: runtimeUser ? {
              ...runtimeUser,
              name: runtimeUser.isAnonymous ? 'Face user' : runtimeUser.email.split('@')[0],
            } : undefined }
            : { user: { id: 'preview-user', name: 'Preview User', email: 'preview@novy.app' } },
        },
      ).then(applyPreviewEffects).catch((error: unknown) => {
        setToast({ id: Date.now(), message: error instanceof Error ? error.message : 'Workflow failed.', kind: 'error' });
      });
    }
    // Execute once when a screen is entered; runtime state changes must not retrigger On Load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen?.id]);

  async function applyDataOperation(payload: DataOperationPayload): Promise<unknown> {
    activeOperationsRef.current += 1;
    setPendingOperations((current) => current + 1);
    try {
      return await performDataOperation(payload);
    } finally {
      activeOperationsRef.current -= 1;
      setPendingOperations((current) => Math.max(0, current - 1));
    }
  }

  async function performDataOperation(payload: DataOperationPayload): Promise<unknown> {
    const collection = collections.find((candidate) => candidate.id === payload.collectionId);
    if (!collection) throw new Error('Collection not found.');
    const current = previewRecordsRef.current.get(payload.collectionId) ?? [];
    if (payload.type === 'get-records') {
      setToast({ id: Date.now(), message: `${current.length} records loaded.` });
      return { records: current };
    }
    if (payload.type === 'get-record') {
      const record = current.find((candidate) => candidate.id === payload.recordId);
      if (!record) throw new Error('Record not found.');
      return { record };
    }
    if (payload.type === 'insert-record') {
      const error = validateRecordValues(collection, payload.values);
      if (error) throw new Error(error);
      const now = new Date();
      const record = persistDataChanges && persistence
        ? await persistence.createRecord(payload.collectionId, payload.values)
        : {
            id: generateId('preview-record'),
            projectId: 'preview',
            collectionId: payload.collectionId,
            values: { ...payload.values },
            createdAt: now,
            updatedAt: now,
          };
      const latest = previewRecordsRef.current.get(payload.collectionId) ?? [];
      replacePreviewCollection(payload.collectionId, [...latest, record]);
      if (!persistDataChanges) sandboxDirtyRef.current = true;
      setToast({ id: Date.now(), message: persistDataChanges ? 'Record saved to project data.' : 'Preview record inserted.' });
      return { record };
    }
    if (payload.type === 'update-record') {
      const existing = current.find((record) => record.id === payload.recordId);
      if (!existing) throw new Error('Record not found.');
      const values = { ...existing.values, ...payload.values };
      const error = validateRecordValues(collection, values);
      if (error) throw new Error(error);
      const updated = persistDataChanges && persistence
        ? await persistence.updateRecord(payload.collectionId, payload.recordId, values)
        : { ...existing, values, updatedAt: new Date() };
      replacePreviewCollection(
        payload.collectionId,
        (previewRecordsRef.current.get(payload.collectionId) ?? []).map((record) => record.id === payload.recordId ? updated : record),
      );
      if (!persistDataChanges) sandboxDirtyRef.current = true;
      setToast({ id: Date.now(), message: persistDataChanges ? 'Record update saved to project data.' : 'Preview record updated.' });
      return { record: updated };
    }
    if (!current.some((record) => record.id === payload.recordId)) throw new Error('Record not found.');
    if (payload.confirm && !window.confirm('Delete this record? This cannot be undone.')) {
      throw new Error('Deletion cancelled.');
    }
    if (persistDataChanges && persistence) {
      await persistence.deleteRecord(payload.collectionId, payload.recordId);
    }
    replacePreviewCollection(
      payload.collectionId,
      (previewRecordsRef.current.get(payload.collectionId) ?? []).filter((record) => record.id !== payload.recordId),
    );
    if (!persistDataChanges) sandboxDirtyRef.current = true;
    setToast({ id: Date.now(), message: persistDataChanges ? 'Record deleted from project data.' : 'Preview record deleted.' });
    return { deletedRecordId: payload.recordId, collectionId: payload.collectionId };
  }

  function replacePreviewCollection(collectionId: string, records: readonly DataRecord[]): void {
    const next = new Map([...previewRecordsRef.current, [collectionId, records]]);
    previewRecordsRef.current = next;
    setPreviewRecords(next);
  }

  function changePersistence(enabled: boolean): void {
    if (activeOperationsRef.current > 0 || activeClicksRef.current.size > 0) return;
    if (enabled && sandboxDirtyRef.current && !window.confirm(
      'Switching to project data discards temporary preview record changes. Continue?',
    )) return;
    const next = new Map(recordsByCollection);
    previewRecordsRef.current = next;
    setPreviewRecords(next);
    sandboxDirtyRef.current = false;
    setPersistDataChanges(enabled);
  }

  useEffect(() => {
    if (!toast) {
      return;
    }
    const handle = window.setTimeout(() => setToast(null), TOAST_VISIBLE_MS);
    return () => window.clearTimeout(handle);
  }, [toast]);

  const effectiveScreen = useMemo<Screen | null>(
    () => (screen ? applyTextOverrides(screen, textOverrides) : null),
    [screen, textOverrides],
  );

  const computeFittedZoom = useCallback(() => {
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const footerHeight = footerRef.current?.offsetHeight ?? 0;
    // Chrome accounted for: the overlay's p-4 (16px per side), the panel's
    // base p-6 (24px per side) plus 1px border per side, the stage's mt-3,
    // the stage's p-3 (12px per side), and the footer's mt-2. Headroom
    // absorbs computeFitZoom's two-decimal rounding.
    const availableWidth = window.innerWidth - 32 - 48 - 2 - 24 - 8;
    const availableHeight =
      window.innerHeight - 32 - 48 - 2 - 12 - 24 - 8 - 8 - headerHeight - footerHeight;
    if (availableWidth <= 0 || availableHeight <= 0) {
      return null;
    }
    return projectType === 'website'
      ? computeFitWidthZoom(
          { clientWidth: availableWidth },
          bounds,
          0,
          PREVIEW_ZOOM_LIMITS,
        )
      : computeFitZoom(
          { clientWidth: availableWidth, clientHeight: availableHeight },
          bounds,
          0,
          PREVIEW_ZOOM_LIMITS,
        );
  }, [bounds, projectType]);

  const fitToStage = useCallback(() => {
    const fitted = computeFittedZoom();
    if (fitted !== null && Math.abs(fitted - zoomRef.current) >= 0.01) {
      setZoom(fitted);
    }
  }, [computeFittedZoom]);

  useEffect(() => {
    const handleResize = () => {
      if (isAutoFitRef.current) {
        fitToStage();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToStage]);

  useEffect(() => {
    isAutoFitRef.current = true;
    fitToStage();
  }, [previewDevice, fitToStage]);

  const handleZoomIn = useCallback(() => {
    isAutoFitRef.current = false;
    setZoom((current) => Math.min(
      PREVIEW_ZOOM_LIMITS.max,
      Math.round((current + PREVIEW_ZOOM_LIMITS.step) * 100) / 100,
    ));
  }, []);

  const handleZoomOut = useCallback(() => {
    isAutoFitRef.current = false;
    setZoom((current) => Math.max(
      PREVIEW_ZOOM_LIMITS.min,
      Math.round((current - PREVIEW_ZOOM_LIMITS.step) * 100) / 100,
    ));
  }, []);

  const handleFit = useCallback(() => {
    isAutoFitRef.current = true;
    fitToStage();
  }, [fitToStage]);

  return (
    <Modal
      labelledBy="preview-title"
      onClose={onClose}
      panelClassName="relative flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] min-w-72 flex-col overflow-hidden"
      panelFitContent
      panelScrollable={false}
    >
      <div className="flex flex-col gap-3" ref={headerRef}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink" id="preview-title">
            Previewing {projectName}
          </h2>
          <button
            aria-label="Close preview"
            className="rounded-tile px-2 py-1 text-lg leading-none text-ink-muted hover:bg-canvas hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DeviceToggle
            label="Preview device"
            onChange={setPreviewDevice}
            testId="preview-device-toggle"
            value={previewDevice}
          />
          <div className="flex flex-wrap items-center gap-2">
            {runtimePreview?.isAvailable && runtimeManifest ? (
              runtimeStatus === 'live' || runtimeStatus === 'stale' ? (
                <>
                   <span className={`rounded-full px-3 py-1 text-xs font-semibold ${runtimeStatus === 'stale' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                     {runtimeStatus === 'stale' ? 'Changes pending' : 'Real runtime'}
                   </span>
                   <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                     Sandbox CRUD · Backend services
                   </span>
                   {runtimeUser ? (
                      <span className="max-w-56 truncate rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900" title={runtimeUser.isAnonymous ? 'Unlocked with face' : runtimeUser.email}>
                        {runtimeUser.isAnonymous ? 'Unlocked with face' : `Signed in: ${runtimeUser.email}`}
                     </span>
                   ) : (
                     <button
                       className="min-h-11 rounded-tile border border-hairline bg-surface px-3 text-xs font-semibold text-ink hover:bg-canvas"
                        onClick={() => setAuthPrompt('Sign in to test user-scoped workflows.')}
                       type="button"
                     >
                       Sign in to app
                     </button>
                   )}
                  {runtimeStatus === 'stale' ? (
                    <button
                      className="min-h-11 rounded-tile bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      disabled={pendingClicks > 0 || pendingOperations > 0}
                      onClick={() => void startRealRuntime()}
                      type="button"
                    >
                      Apply changes
                    </button>
                  ) : null}
                   <button
                     className="min-h-11 rounded-tile border border-hairline bg-surface px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-60"
                     disabled={pendingClicks > 0 || pendingOperations > 0}
                     onClick={() => void resetRuntimeData()}
                     type="button"
                   >
                     Reset preview data
                   </button>
                   {runtimeUser ? (
                     <button
                       className="min-h-11 rounded-tile border border-hairline bg-surface px-3 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-60"
                       disabled={pendingClicks > 0 || pendingOperations > 0}
                       onClick={() => {
                         if (!runtimeAppId || !runtimePreview) return;
                         void runtimePreview.logout(runtimeAppId)
                           .then(() => setRuntimeUser(null))
                           .catch((error: unknown) => setToast({
                             id: Date.now(),
                             message: error instanceof Error ? error.message : 'Sign out failed.',
                             kind: 'error',
                           }));
                       }}
                       type="button"
                     >
                       Sign out
                     </button>
                   ) : null}
                   <button
                     className="min-h-11 rounded-tile border border-hairline bg-surface px-3 text-xs font-semibold text-ink hover:bg-canvas"
                    disabled={pendingClicks > 0 || pendingOperations > 0}
                    onClick={stopRealRuntime}
                    type="button"
                  >
                    Stop
                  </button>
                </>
              ) : (
                <button
                  className="min-h-11 rounded-tile bg-brand-600 px-4 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  disabled={runtimeStatus === 'starting' || pendingClicks > 0 || pendingOperations > 0}
                  onClick={() => void startRealRuntime()}
                  type="button"
                >
                  {runtimeStatus === 'starting' ? 'Starting…' : runtimeStatus === 'error' ? 'Retry Run App' : 'Run App'}
                </button>
              )
            ) : null}
            {runtimeStatus !== 'live' && runtimeStatus !== 'stale' ? (
            <label className="flex min-h-11 items-center gap-2 rounded-tile border border-hairline bg-surface px-3 text-xs font-medium text-ink">
              <input
                checked={persistDataChanges}
                aria-describedby="preview-data-mode-hint"
                disabled={!persistence || pendingClicks > 0 || pendingOperations > 0}
                onChange={(event) => changePersistence(event.target.checked)}
                type="checkbox"
              />
              Save data changes
            </label>
            ) : null}
            <PreviewZoomControls
              max={PREVIEW_ZOOM_LIMITS.max}
              min={PREVIEW_ZOOM_LIMITS.min}
              onFit={handleFit}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              zoom={zoom}
            />
            <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {previewDevice} · {bounds.width}×{bounds.height} · {Math.round(zoom * 100)}%
            </p>
          </div>
        </div>
      </div>
      <div
        className="relative mt-3 flex min-h-0 overflow-auto rounded-tile border border-hairline bg-canvas p-3"
        style={{ height: Math.min(bounds.height * zoom + 24, 720) }}
      >
        <div className="m-auto shrink-0">
          <ScreenFrame
            appTheme={appTheme}
            breakpoint={previewDevice}
            componentValues={componentValues}
            dataContext={{
              collections,
              localItemsByListView,
              pendingChatNodeIds,
              recordsByCollection: previewRecords,
            }}
            designSystem={designSystem}
            itemContext={routeItemContext}
            mode="preview"
            onNodeEvent={handleNodeEvent}
            onNodeMediaChange={(_nodeId, media) => {
              if (!media) return;
              mediaRef.current.set(`media:${media.name}`, media);
            }}
            onAppThemeChange={setAppTheme}
            screen={effectiveScreen}
            size={bounds}
            scale={zoom}
          />
        </div>
      </div>
      <p aria-live="polite" className="mt-2 shrink-0 text-center text-xs text-ink-muted" id="preview-data-mode-hint" ref={footerRef}>
         {runtimeStatus === 'live' || runtimeStatus === 'stale'
          ? `Run App mode: CRUD uses a resettable preview-data sandbox; email, Computer Vision, RAG, and AI execute through the configured backend providers.${runtimeStatus === 'stale' ? ' Apply changes to run the latest editor state.' : ''}`
          : persistDataChanges
          ? 'Database actions create, update, and delete this project’s records. Other preview state remains isolated.'
          : 'Click, change, and screen-load behaviors run against isolated preview state. Enabling Save data changes allows database actions to create, update, and delete project records.'}
      </p>
      {toast ? (
        <div
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-tile bg-ink px-4 py-2 text-sm text-surface shadow-lg"
          data-testid="preview-toast"
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          {toast.message}
        </div>
      ) : null}
      {authPrompt && runtimeAppId && runtimePreview ? (
        <RuntimePreviewAuthPanel
          appId={runtimeAppId}
          onClose={() => setAuthPrompt(null)}
          onSignedIn={(user) => { setRuntimeUser(user); setAuthPrompt(null); }}
          reason={authPrompt}
          repository={runtimePreview}
        />
      ) : null}
    </Modal>
  );
}

function readRuntimeRecord(value: unknown): DataRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string'
    || typeof record.projectId !== 'string'
    || typeof record.collectionId !== 'string'
    || typeof record.values !== 'object'
    || record.values === null
    || Array.isArray(record.values)) return null;
  const values: Record<string, DataValue> = {};
  for (const [key, candidate] of Object.entries(record.values)) {
    if (candidate === null || ['string', 'number', 'boolean'].includes(typeof candidate)) {
      values[key] = candidate as DataValue;
    }
  }
  return {
    id: record.id,
    projectId: record.projectId,
    collectionId: record.collectionId,
    values,
    createdAt: typeof record.createdAt === 'string' ? new Date(record.createdAt) : new Date(),
    updatedAt: typeof record.updatedAt === 'string' ? new Date(record.updatedAt) : new Date(),
  };
}

function projectIdFromManifest(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const project = (value as Record<string, unknown>).project;
  if (typeof project !== 'object' || project === null || Array.isArray(project)) return null;
  const id = (project as Record<string, unknown>).id;
  return typeof id === 'string' && id ? id : null;
}
