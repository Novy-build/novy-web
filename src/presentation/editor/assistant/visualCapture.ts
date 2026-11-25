import { domToPng } from 'modern-screenshot';
import type {
  AssistantCaptureRequest,
  AssistantRenderCapture,
} from '@domain/entities/assistant';
import type { ProjectDocument, Screen } from '@domain/entities/screen';
import { CANVAS_PRESETS } from '../renderer/ScreenFrame';

/** Maximum Base64 payload accepted for one render capture (3 MiB). */
const MAX_CAPTURE_BASE64_LENGTH = 4 * 1024 * 1024;

export type CaptureFunction = (node: HTMLElement, width: number, height: number) => Promise<string>;

const DEFAULT_CAPTURE: CaptureFunction = (node, width, height) => domToPng(node, {
  width,
  height,
  scale: 1,
  backgroundColor: '#ffffff',
  timeout: 10_000,
});

/** Same bounded plan the backend derives from the reviewed blueprint. */
export function buildCapturePlan(
  document: ProjectDocument,
  maxScreens = 2,
): AssistantCaptureRequest[] {
  return document.screens.slice(0, maxScreens).flatMap((screen) => (
    (['mobile', 'tablet', 'desktop'] as const).map((viewport) => ({
      screenKey: screen.id,
      viewport,
    }))
  ));
}

export function captureKey(request: AssistantCaptureRequest): string {
  return `${request.screenKey}:${request.viewport}`;
}

/** Wait until fonts and layout are stable before capturing. */
export async function waitForRenderReady(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }
  await nextFrame();
  await nextFrame();
}

function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Capture offscreen screen frames in memory only. Never writes data URLs to
 * storage, logs, URLs, or analytics.
 */
export async function captureScreenFrames(
  container: HTMLElement,
  requests: AssistantCaptureRequest[],
  capture: CaptureFunction = DEFAULT_CAPTURE,
): Promise<AssistantRenderCapture[]> {
  await waitForRenderReady();
  const captures: AssistantRenderCapture[] = [];
  for (const request of requests) {
    const node = container.querySelector<HTMLElement>(
      `[data-capture-key="${captureKey(request)}"]`,
    );
    if (!node) {
      throw new Error(`The ${request.viewport} render of ${request.screenKey} was not ready.`);
    }
    const preset = CANVAS_PRESETS[request.viewport];
    const dataUrl = await capture(node, preset.width, preset.height);
    const base64 = dataUrlToBase64(dataUrl);
    if (!base64 || base64.length > MAX_CAPTURE_BASE64_LENGTH) {
      throw new Error(`The ${request.viewport} render of ${request.screenKey} was too large.`);
    }
    captures.push({
      screenKey: request.screenKey,
      viewport: request.viewport,
      name: `${request.screenKey}_${request.viewport}.png`,
      mimeType: 'image/png',
      contentBase64: base64,
      order: captures.length,
    });
  }
  return captures;
}

export function dataUrlToBase64(dataUrl: string): string {
  const separator = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || separator < 0) {
    throw new Error('Render capture did not return a data URL.');
  }
  const base64 = dataUrl.slice(separator + 1);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Render capture returned invalid image data.');
  }
  return base64;
}

export function screensForCapture(document: ProjectDocument, requests: AssistantCaptureRequest[]): Screen[] {
  const wanted = new Set(requests.map((request) => request.screenKey));
  return document.screens.filter((screen) => wanted.has(screen.id)).slice(0, 2);
}
