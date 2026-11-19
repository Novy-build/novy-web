import { useEffect, useRef, useState } from 'react';
import type { CameraProps } from '@domain/entities/componentNode';
import {
  assessFaceCapture,
  FACE_ANALYSIS_INTERVAL_MS,
  FACE_STABLE_DURATION_MS,
  loadFaceLandmarker,
  measureFrameQuality,
  type FaceCaptureAssessment,
} from './guidedFaceCapture';

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
  onCapture?: (mediaReference: string, media: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const qualityCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureStartedRef = useRef(false);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [guidance, setGuidance] = useState('Position one face inside the oval.');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [faceReady, setFaceReady] = useState(false);

  useEffect(() => () => {
    stopGuidance(animationFrameRef);
    stopStream(streamRef.current);
  }, []);
  useEffect(() => () => {
    if (capturedImage?.startsWith('blob:')) URL.revokeObjectURL(capturedImage);
  }, [capturedImage]);

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
      captureStartedRef.current = false;
      if (props.captureMode === 'guided-face' && videoRef.current) {
        void startGuidedCapture(videoRef.current);
      }
    } catch {
      setError('Camera permission was denied or the camera is unavailable.');
      setStatus('error');
    }
  }

  async function capture(): Promise<void> {
    if (captureStartedRef.current) return;
    captureStartedRef.current = true;
    stopGuidance(animationFrameRef);
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      captureStartedRef.current = false;
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      captureStartedRef.current = false;
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) {
      setError('The camera image could not be prepared.');
      setStatus('error');
      captureStartedRef.current = false;
      return;
    }
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const reference = `media:${file.name}`;
    const previewUrl = URL.createObjectURL(blob);
    setCapturedImage(previewUrl);
    setStatus('captured');
    stopStream(streamRef.current);
    streamRef.current = null;
    onCapture?.(reference, file);
  }

  function retake(): void {
    setCapturedImage(null);
    setCaptureProgress(0);
    setFaceReady(false);
    setGuidance('Position one face inside the oval.');
    void enableCamera();
  }

  async function startGuidedCapture(video: HTMLVideoElement): Promise<void> {
    setGuidance('Loading private on-device face guidance…');
    setCaptureProgress(0);
    setFaceReady(false);
    qualityCanvasRef.current ??= document.createElement('canvas');
    try {
      const landmarker = await loadFaceLandmarker();
      if (streamRef.current === null || captureStartedRef.current) return;
      let lastAnalysis = 0;
      let lastVideoTime = -1;
      let stableSince: number | null = null;
      let previous: FaceCaptureAssessment | null = null;
      const analyze = (now: number): void => {
        if (streamRef.current === null || captureStartedRef.current) return;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime
          && now - lastAnalysis >= FACE_ANALYSIS_INTERVAL_MS) {
          lastAnalysis = now;
          lastVideoTime = video.currentTime;
          try {
            const result = landmarker.detectForVideo(video, now);
            const assessment = assessFaceCapture(
              result.faceLandmarks,
              measureFrameQuality(video, qualityCanvasRef.current!, result.faceLandmarks[0]),
            );
            const moved = assessment.ready && previous?.ready
              && (Math.abs((assessment.centerX ?? 0) - (previous.centerX ?? 0)) > 0.018
                || Math.abs((assessment.centerY ?? 0) - (previous.centerY ?? 0)) > 0.018
                || Math.abs((assessment.faceWidth ?? 0) - (previous.faceWidth ?? 0)) > 0.025);
            setGuidance(assessment.message);
            setFaceReady(assessment.ready);
            if (!assessment.ready || moved) {
              stableSince = null;
              setCaptureProgress(0);
            } else {
              stableSince ??= now;
              const elapsed = now - stableSince;
              setCaptureProgress(Math.min(100, elapsed / FACE_STABLE_DURATION_MS * 100));
              if (elapsed >= FACE_STABLE_DURATION_MS) {
                void capture();
                return;
              }
            }
            previous = assessment;
          } catch {
            setFaceReady(false);
            setGuidance('Automatic checks are unavailable. Use Capture now.');
            setCaptureProgress(0);
            return;
          }
        }
        animationFrameRef.current = requestAnimationFrame(analyze);
      };
      animationFrameRef.current = requestAnimationFrame(analyze);
    } catch {
      setFaceReady(false);
      setGuidance('Automatic checks are unavailable. Use Capture now.');
    }
  }

  if (renderStatic || !isPreview) {
    return (
      <div className="novy-widget-text-muted flex h-full w-full flex-col items-center justify-center gap-2 rounded-tile border border-dashed border-hairline bg-canvas text-sm">
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
          className={`absolute inset-0 h-full w-full object-cover ${props.facingMode === 'user' ? '-scale-x-100' : ''} ${status === 'ready' ? '' : 'hidden'}`}
          muted
          playsInline
          ref={videoRef}
        />
      )}
      {status === 'ready' && props.captureMode === 'guided-face' ? (
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          <div className={`absolute left-1/2 top-1/2 h-[78%] w-[38%] min-w-24 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] shadow-[0_0_0_999px_rgb(0_0_0/0.38)] transition-colors ${faceReady ? 'border-emerald-400' : 'border-white/90'}`} />
          <div className="absolute inset-x-3 bottom-12 h-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${captureProgress}%` }} />
          </div>
        </div>
      ) : null}
      {status === 'ready' && props.captureMode === 'guided-face' ? (
        <p className="novy-widget-text-contrast absolute inset-x-2 top-2 z-20 rounded bg-ink/80 px-2 py-1.5 text-center text-xs font-medium" aria-live="polite" role="status">
          {guidance}
        </p>
      ) : null}
      <div className="relative z-10 mt-auto flex w-full items-center justify-center gap-2 bg-ink/70 p-2">
        {status === 'idle' || status === 'error' ? (
          <button className="novy-widget-text-contrast min-h-11 rounded-tile bg-brand-600 px-3 py-1.5 text-xs font-medium" onClick={() => void enableCamera()} type="button">
            Enable camera
          </button>
        ) : null}
        {status === 'requesting' ? <span className="text-xs" role="status">Requesting camera…</span> : null}
        {status === 'ready' ? (
          <button className="novy-widget-text-contrast min-h-11 rounded-tile border border-white/70 bg-ink/70 px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => void capture()} type="button">
            {props.captureLabel || 'Capture'}
          </button>
        ) : null}
        {status === 'captured' ? (
          <button className="novy-widget-text min-h-11 rounded-tile bg-surface px-3 py-1.5 text-xs font-medium" onClick={retake} type="button">
            Retake
          </button>
        ) : null}
      </div>
      {error ? <p className="novy-widget-text-contrast absolute inset-x-2 top-2 rounded bg-signal-invalid/90 p-2 text-xs" role="alert">{error}</p> : null}
    </div>
  );
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function stopGuidance(animationFrameRef: { current: number | null }): void {
  if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  animationFrameRef.current = null;
}
