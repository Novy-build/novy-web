import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Screen } from '@domain/entities/screen';
import type { DataCollection, DataRecord, DataValue } from '@domain/entities/appData';
import { generateId } from '@domain/ids';
import type { ComponentNode } from '@domain/entities/componentNode';
import type { ActionPayload } from '@domain/entities/logic';
import { applyTextOverrides, runClickBehavior } from '@domain/logic/runtime';
import { Modal } from '@presentation/components/system/Modal';
import { ScreenFrame } from '../renderer/ScreenFrame';
import { DeviceToggle } from './DeviceToggle';
import { PreviewZoomControls } from './PreviewZoomControls';
import { DEFAULT_EDITOR_DEVICE } from '../state/geometry';
import type { EditorDevice } from '../state/geometry';
import { computeFitZoom } from '../state/geometry';
import { CANVAS_PRESETS } from '../renderer/ScreenFrame';

const TOAST_VISIBLE_MS = 2400;
const PREVIEW_ZOOM_LIMITS = { min: 0.25, max: 2, step: 0.25 } as const;

interface PreviewOverlayProps {
  /** All screens so navigate steps can switch the preview target. */
  screens: Screen[];
  /** Screen that should be previewed first. */
  initialScreenId?: string;
  initialDevice?: EditorDevice;
  projectName: string;
  onClose: () => void;
  collections?: readonly DataCollection[];
  recordsByCollection?: ReadonlyMap<string, readonly DataRecord[]>;
}

interface Toast {
  id: number;
  message: string;
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
  onClose,
  collections = [],
  recordsByCollection = new Map(),
}: PreviewOverlayProps) {
  const [previewDevice, setPreviewDevice] = useState<EditorDevice>(initialDevice);
  const bounds = CANVAS_PRESETS[previewDevice];
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
  const [previewRecords, setPreviewRecords] = useState<ReadonlyMap<string, readonly DataRecord[]>>(
    () => new Map(recordsByCollection),
  );
  const [toast, setToast] = useState<Toast | null>(null);
  const [zoom, setZoom] = useState(1);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const screen: Screen | null = screens.find((candidate) => candidate.id === screenId) ?? screens[0] ?? null;

  const handleNodeAction = useCallback(
    (nodeId: string): void => {
      if (!screen) {
        return;
      }
      const effects = runClickBehavior(
        { screens },
        screen,
        nodeId,
        { componentValues },
      );
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
            setScreenId(effect.screenId);
            break;
          case 'data-operation':
            applyDataOperation(effect.payload);
            break;
          default: {
            const exhaustive: never = effect;
            void exhaustive;
          }
        }
      }
    },
    [componentValues, previewRecords, screens, screen],
  );

  function applyDataOperation(
    payload: Extract<ActionPayload, { type: 'get-records' | 'insert-record' | 'update-record' | 'delete-record' }>,
  ): void {
    const current = previewRecords.get(payload.collectionId) ?? [];
    if (payload.type === 'get-records') {
      setToast({ id: Date.now(), message: `${current.length} records loaded.` });
      return;
    }
    if (payload.type === 'insert-record') {
      const now = new Date();
      const record: DataRecord = {
        id: generateId('preview-record'),
        projectId: 'preview',
        collectionId: payload.collectionId,
        values: { ...payload.values },
        createdAt: now,
        updatedAt: now,
      };
      setPreviewRecords((previous) => new Map([...previous, [payload.collectionId, [...current, record]]]));
      setToast({ id: Date.now(), message: 'Preview record inserted.' });
      return;
    }
    if (payload.type === 'update-record') {
      setPreviewRecords((previous) => new Map([
        ...previous,
        [payload.collectionId, current.map((record) => record.id === payload.recordId
          ? { ...record, values: { ...record.values, ...payload.values }, updatedAt: new Date() }
          : record)],
      ]));
      setToast({ id: Date.now(), message: 'Preview record updated.' });
      return;
    }
    setPreviewRecords((previous) => new Map([
      ...previous,
      [payload.collectionId, current.filter((record) => record.id !== payload.recordId)],
    ]));
    setToast({ id: Date.now(), message: 'Preview record deleted.' });
  }

  function submitBoundForm(nodeId: string, values: string[]): void {
    const node = screens.flatMap((candidate) => flattenNodes(candidate.nodes)).find((candidate) => candidate.id === nodeId);
    if (!node || node.type !== 'form' || !node.props.dataBinding) return;
    const mapped: Record<string, DataValue> = {};
    for (const binding of node.props.dataBinding.fields) {
      mapped[binding.dataFieldId] = values[binding.formFieldIndex] ?? '';
    }
    const now = new Date();
    const record: DataRecord = {
      id: generateId('preview-record'),
      projectId: 'preview',
      collectionId: node.props.dataBinding.collectionId,
      values: mapped,
      createdAt: now,
      updatedAt: now,
    };
    setPreviewRecords((previous) => new Map([
      ...previous,
      [record.collectionId, [...(previous.get(record.collectionId) ?? []), record]],
    ]));
    setToast({ id: Date.now(), message: 'Form created a preview record.' });
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
    return computeFitZoom(
      { clientWidth: availableWidth, clientHeight: availableHeight },
      bounds,
      0,
      PREVIEW_ZOOM_LIMITS,
    );
  }, [bounds]);

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
        style={{ height: bounds.height * zoom + 24 }}
      >
        <div className="m-auto shrink-0">
          <ScreenFrame
            dataContext={{ collections, recordsByCollection: previewRecords }}
            mode="preview"
            onNodeAction={handleNodeAction}
            onNodeValueChange={(nodeId, value) =>
              setComponentValues((previous) => new Map([...previous, [nodeId, value]]))
            }
            onFormSubmit={submitBoundForm}
            screen={effectiveScreen}
            size={bounds}
            scale={zoom}
          />
        </div>
      </div>
      <p aria-live="polite" className="mt-2 shrink-0 text-center text-xs text-ink-muted" ref={footerRef}>
        Behaviors run on click. Screen load and change triggers arrive with the backend phase.
      </p>
      {toast ? (
        <div
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-tile bg-ink px-4 py-2 text-sm text-surface shadow-lg"
          data-testid="preview-toast"
          key={toast.id}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </Modal>
  );
}

function flattenNodes(nodes: readonly ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((node) =>
    node.type === 'container' ? [node, ...flattenNodes(node.children)] : [node],
  );
}