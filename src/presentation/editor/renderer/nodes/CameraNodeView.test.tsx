import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CameraNodeView } from './CameraNodeView';

const guidedMocks = vi.hoisted(() => ({
  detectForVideo: vi.fn(() => ({ faceLandmarks: [[]] })),
  loadFaceLandmarker: vi.fn(),
}));

vi.mock('./guidedFaceCapture', () => ({
  FACE_ANALYSIS_INTERVAL_MS: 180,
  FACE_STABLE_DURATION_MS: 1_200,
  loadFaceLandmarker: guidedMocks.loadFaceLandmarker,
  measureFrameQuality: vi.fn(() => ({ brightness: 128, contrast: 35, sharpness: 90 })),
  assessFaceCapture: vi.fn(() => ({
    ready: true,
    message: 'Hold still—capturing automatically.',
    centerX: 0.5,
    centerY: 0.5,
    faceWidth: 0.4,
  })),
}));

describe('CameraNodeView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    guidedMocks.detectForVideo.mockClear();
    guidedMocks.loadFaceLandmarker.mockReset();
  });

  it('automatically captures after a clear face remains stable', async () => {
    const callbacks: FrameRequestCallback[] = [];
    let currentTime = 0;
    const stop = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    Object.defineProperties(HTMLVideoElement.prototype, {
      videoWidth: { configurable: true, value: 640 },
      videoHeight: { configurable: true, value: 480 },
      readyState: { configurable: true, value: 4 },
      currentTime: { configurable: true, get: () => ++currentTime },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:auto-camera-preview'),
      revokeObjectURL: vi.fn(),
    });
    guidedMocks.loadFaceLandmarker.mockResolvedValue({
      detectForVideo: guidedMocks.detectForVideo,
    });
    const onCapture = vi.fn();

    render(
      <CameraNodeView
        isPreview
        onCapture={onCapture}
        props={{
          label: 'Face camera',
          facingMode: 'user',
          captureLabel: 'Capture now',
          captureMode: 'guided-face',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    expect(await screen.findByText('Loading private on-device face guidance…')).toBeInTheDocument();
    await waitFor(() => expect(callbacks).toHaveLength(1));
    callbacks.shift()!(200);
    callbacks.shift()!(1_500);

    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Retake' })).toBeInTheDocument();
    expect(stop).toHaveBeenCalled();
  });

  it('keeps a captured JPEG transient and returns it as a File', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      configurable: true,
      value: 480,
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:camera-preview'),
      revokeObjectURL: vi.fn(),
    });
    const onCapture = vi.fn();

    render(
      <CameraNodeView
        isPreview
        onCapture={onCapture}
        props={{ label: 'Identity camera', facingMode: 'user', captureLabel: 'Take photo' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Take photo' }));

    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    const [reference, file] = onCapture.mock.calls[0] as [string, File];
    expect(reference).toMatch(/^media:camera-\d+\.jpg$/);
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/jpeg');
    expect(stop).toHaveBeenCalled();
  });
});
