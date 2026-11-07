import { useEffect, useRef, useState } from 'react';
import type { CameraProps } from '@domain/entities/componentNode';

type CameraStatus = 'idle' | 'requesting' | 'ready' | 'captured' | 'error';

export function CameraNodeView({
  props,
  isPreview = false,
  renderStatic = false,
  onCapture,
}: {
  props: CameraProps;
  isPreview?: boolean;
  renderStatic?: boolean;
  onCapture?: (mediaReference: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => () => stopStream(streamRef.current), []);

  async function enableCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable in this browser.');
      setStatus('error');
      return;
    }
    setStatus('requesting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: props.facingMode },
        audio: false,
      });
      stopStream(streamRef.current);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
    } catch {
      setError('Camera permission was denied or the camera is unavailable.');
      setStatus('error');
    }
  }

  function capture(): void {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const reference = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(reference);
    setStatus('captured');
    stopStream(streamRef.current);
    streamRef.current = null;
    onCapture?.(reference);
  }

  function retake(): void {
    setCapturedImage(null);
    setStatus('idle');
  }

  if (renderStatic || !isPreview) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-tile border border-dashed border-hairline bg-canvas text-sm text-ink-muted">
        <span aria-hidden="true" className="text-2xl">◉</span>
        <span>{props.label || 'Camera'}</span>
        <span className="text-xs">Camera activates only in Preview.</span>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-tile border border-hairline bg-ink text-surface"
      onClick={(event) => event.stopPropagation()}
    >
      {capturedImage ? (
        <img alt="Captured camera preview" className="absolute inset-0 h-full w-full object-cover" src={capturedImage} />
      ) : (
        <video
          aria-label={props.label || 'Camera preview'}
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover ${status === 'ready' ? '' : 'hidden'}`}
          muted
          playsInline
          ref={videoRef}
        />
      )}
      <div className="relative z-10 mt-auto flex w-full items-center justify-center gap-2 bg-ink/70 p-2">
        {status === 'idle' || status === 'error' ? (
          <button className="rounded-tile bg-brand-600 px-3 py-1.5 text-xs font-medium text-white" onClick={() => void enableCamera()} type="button">
            Enable camera
          </button>
        ) : null}
        {status === 'requesting' ? <span className="text-xs" role="status">Requesting camera…</span> : null}
        {status === 'ready' ? (
          <button className="rounded-tile bg-brand-600 px-3 py-1.5 text-xs font-medium text-white" onClick={capture} type="button">
            {props.captureLabel || 'Capture'}
          </button>
        ) : null}
        {status === 'captured' ? (
          <button className="rounded-tile bg-surface px-3 py-1.5 text-xs font-medium text-ink" onClick={retake} type="button">
            Retake
          </button>
        ) : null}
      </div>
      {error ? <p className="absolute inset-x-2 top-2 rounded bg-signal-invalid/90 p-2 text-xs text-white" role="alert">{error}</p> : null}
    </div>
  );
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
