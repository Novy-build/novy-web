import type { Screen } from '@domain/entities/screen';
import { Modal } from '@presentation/components/system/Modal';
import { ScreenFrame } from '../renderer/ScreenFrame';
import type { EditorDevice } from '../state/geometry';
import { CANVAS_PRESETS } from '../renderer/ScreenFrame';

const PANEL_WIDTH_BY_DEVICE: Record<EditorDevice, string> = {
  mobile: 'max-w-[430px]',
  tablet: 'max-w-[810px]',
  desktop: 'max-w-[1240px]',
};

interface PreviewOverlayProps {
  screen: Screen;
  device: EditorDevice;
  projectName: string;
  onClose: () => void;
}

/**
 * Full-size, non-interactive preview of the active screen, rendered by the
 * same ScreenFrame the canvas and dashboard thumbnails use.
 */
export function PreviewOverlay({ screen, device, projectName, onClose }: PreviewOverlayProps) {
  const bounds = CANVAS_PRESETS[device];

  return (
    <Modal
      labelledBy="preview-title"
      onClose={onClose}
      panelClassName={`p-4 ${PANEL_WIDTH_BY_DEVICE[device]}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-ink" id="preview-title">
          Previewing {projectName}
        </h2>
        <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {device} · {bounds.width}×{bounds.height}
        </p>
      </div>
      <div className="mt-3 flex justify-center overflow-auto rounded-tile border border-hairline bg-canvas p-3">
        <ScreenFrame mode="preview" screen={screen} size={bounds} />
      </div>
    </Modal>
  );
}
