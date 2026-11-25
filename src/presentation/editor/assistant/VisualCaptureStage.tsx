import { useEffect, useRef } from 'react';
import type {
  AssistantCaptureRequest,
} from '@domain/entities/assistant';
import type { AppDesignSystem } from '@domain/entities/designSystem';
import type { Screen } from '@domain/entities/screen';
import { CANVAS_PRESETS, ScreenFrame } from '../renderer/ScreenFrame';
import { captureKey, waitForRenderReady } from './visualCapture';

interface VisualCaptureStageProps {
  screens: Screen[];
  designSystem?: AppDesignSystem;
  requests: AssistantCaptureRequest[];
  onReady: (container: HTMLElement) => void;
  onError: (message: string) => void;
}

/**
 * Offscreen production-renderer frames used only for visual capture. The
 * container is removed as soon as capture orchestration finishes.
 */
export function VisualCaptureStage({
  screens,
  designSystem,
  requests,
  onReady,
  onError,
}: VisualCaptureStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const screensById = new Map(screens.map((screen) => [screen.id, screen]));

  useEffect(() => {
    let active = true;
    const container = containerRef.current;
    if (!container) return;
    void waitForRenderReady().then(() => {
      if (active) onReady(container);
    }).catch(() => {
      if (active) onError('The render did not finish loading. Try the visual review again.');
    });
    return () => { active = false; };
  }, [onReady, onError]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-200vw] top-0"
      data-testid="assistant-visual-capture-stage"
      ref={containerRef}
    >
      {requests.map((request) => {
        const screen = screensById.get(request.screenKey);
        const preset = CANVAS_PRESETS[request.viewport];
        return (
          <div
            data-capture-key={captureKey(request)}
            key={captureKey(request)}
            style={{ height: preset.height, width: preset.width }}
          >
            <ScreenFrame
              appTheme={designSystem?.defaultTheme === 'dark' ? 'dark' : 'light'}
              designSystem={designSystem}
              mode="preview"
              screen={screen ?? null}
              size={preset}
            />
          </div>
        );
      })}
    </div>
  );
}
