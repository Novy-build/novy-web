import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Screen } from '@domain/entities/screen';
import type { DataCollection, DataRecord, DataValue } from '@domain/entities/appData';
import { generateId } from '@domain/ids';
import type { ComponentNode } from '@domain/entities/componentNode';
import type { ActionPayload } from '@domain/entities/logic';
import { applyTextOverrides, runClickBehavior } from '@domain/logic/runtime';
import { Modal } from '@presentation/components/system/Modal';
import { ScreenFrame } from '../renderer/ScreenFrame';
import { DeviceToggle } from './DeviceToggle';import type { EditorDevice } from '../state/geometry';
import { DEFAULT_EDITOR_DEVICE } from '../state/geometry';
import { CANVAS_PRESETS } from '../renderer/ScreenFrame';

const PANEL_WIDTH_BY_DEVICE: Record<EditorDevice, string> = {
  mobile: 'max-w-[430px]',
  tablet: 'max-w-[810px]',
  desktop: 'max-w-[1360px]',
};

const TOAST_VISIBLE_MS = 2400;

interface PreviewOverlayProps {
  /** All screens so navigate steps can switch the preview target. */
  screens: Screen[];
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
  initialDevice = DEFAULT_EDITOR_DEVICE,
  projectName,
  onClose,
  collections = [],
  recordsByCollection = new Map(),
}: PreviewOverlayProps) {
  const [previewDevice, setPreviewDevice] = useState<EditorDevice>(initialDevice);
  const bounds = CANVAS_PRESETS[previewDevice];
  const [screenId, setScreenId] = useState(() => screens[0]?.id ?? '');
  const [textOverrides, setTextOverrides] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [componentValues, setComponentValues] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [previewRecords, setPreviewRecords] = useState<ReadonlyMap<string, readonly DataRecord[]>>(
    () => new Map(recordsByCollection),
  );
  const [toast, setToast] = useState<Toast | null>(null);

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

  return (
    <Modal
      labelledBy="preview-title"
      onClose={onClose}
      panelClassName={`p-4 ${PANEL_WIDTH_BY_DEVICE[previewDevice]}`}
    >
      <div className="flex flex-col gap-3">
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
          <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {previewDevice} · {bounds.width}×{bounds.height}
          </p>
        </div>
      </div>
      <div className="relative mt-3 flex justify-center overflow-auto rounded-tile border border-hairline bg-canvas p-3">
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
        />
      </div>
      <p aria-live="polite" className="mt-2 text-center text-xs text-ink-muted">
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
