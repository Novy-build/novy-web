import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CameraNodeView } from './CameraNodeView';

describe('CameraNodeView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
