import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Screen } from '@domain/entities/screen';
import { applyTextOverrides, runClickBehavior } from '@domain/logic/runtime';
import { Modal } from '@presentation/components/system/Modal';
import { ScreenFrame } from '../renderer/ScreenFrame';
import type { EditorDevice } from '../state/geometry';
import { CANVAS_PRESETS } from '../renderer/ScreenFrame';

const PANEL_WIDTH_BY_DEVICE: Record<EditorDevice, string> = {
  mobile: 'max-w-[430px]',
  tablet: 'max-w-[810px]',
  desktop: 'max-w-[1240px]',
};

const TOAST_VISIBLE_MS = 2400;

interface PreviewOverlayProps {
  /** All screens so navigate steps can switch the preview target. */
  screens: Screen[];
  device: EditorDevice;
  projectName: string;
  onClose: () => void;
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
export function PreviewOverlay({ screens, device, projectName, onClose }: PreviewOverlayProps) {
  const bounds = CANVAS_PRESETS[device];
  const [screenId, setScreenId] = useState(() => screens[0]?.id ?? '');
  const [textOverrides, setTextOverrides] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [componentValues, setComponentValues] = useState<ReadonlyMap<string, string>>(() => new Map());
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
            setToast({
              id: Date.now() + Math.floor(Math.random() * 1000),
              message: `${effect.operation} queued for ${effect.collectionId}`,
            });
            break;
          default: {
            const exhaustive: never = effect;
            void exhaustive;
          }
        }
      }
    },
    [componentValues, screens, screen],
  );

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
      panelClassName={`p-4 ${PANEL_WIDTH_BY_DEVICE[device]}`}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-ink" id="preview-title">
          Previewing {projectName}
        </h2>
        <div className="flex items-center gap-3">
          <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {device} · {bounds.width}×{bounds.height}
          </p>
          <button
            aria-label="Close preview"
            className="rounded-tile px-2 py-1 text-lg leading-none text-ink-muted hover:bg-canvas hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
      </div>
      <div className="relative mt-3 flex justify-center overflow-auto rounded-tile border border-hairline bg-canvas p-3">
        <ScreenFrame
          mode="preview"
          onNodeAction={handleNodeAction}
          onNodeValueChange={(nodeId, value) =>
            setComponentValues((previous) => new Map([...previous, [nodeId, value]]))
          }
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
