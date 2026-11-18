import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

const MEDIAPIPE_VERSION = '1.2.3';
const WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export const FACE_ANALYSIS_INTERVAL_MS = 180;
export const FACE_STABLE_DURATION_MS = 1_200;

export interface FrameQuality {
  brightness: number;
  contrast: number;
  sharpness: number;
}

export interface FaceCaptureAssessment {
  ready: boolean;
  message: string;
  centerX?: number;
  centerY?: number;
  faceWidth?: number;
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/** Loads one shared, browser-only face landmark model. Camera frames never leave the page. */
export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= import('@mediapipe/tasks-vision').then(async ({
    FaceLandmarker: FaceLandmarkerApi,
    FilesetResolver,
  }) => {
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
    const options = {
      runningMode: 'VIDEO' as const,
      numFaces: 2,
      minFaceDetectionConfidence: 0.65,
      minFacePresenceConfidence: 0.65,
      minTrackingConfidence: 0.65,
    };
    try {
      return await FaceLandmarkerApi.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      });
    } catch {
      return FaceLandmarkerApi.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      });
    }
  });
  return landmarkerPromise;
}

export function assessFaceCapture(
  faces: readonly (readonly NormalizedLandmark[])[],
  quality: FrameQuality,
): FaceCaptureAssessment {
  if (faces.length === 0) return { ready: false, message: 'Position one face inside the oval.' };
  if (faces.length > 1) return { ready: false, message: 'Only one person should be visible.' };
  const face = faces[0];
  if (!face || face.length < 455) return { ready: false, message: 'Keep your full face visible.' };

  const xs = face.map((point) => point.x);
  const ys = face.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const result = { centerX, centerY, faceWidth };

  if (faceWidth < 0.24 || faceHeight < 0.32) {
    return { ready: false, message: 'Move closer to the camera.', ...result };
  }
  if (faceWidth > 0.72 || faceHeight > 0.9) {
    return { ready: false, message: 'Move slightly farther away.', ...result };
  }
  if (Math.abs(centerX - 0.5) > 0.11 || Math.abs(centerY - 0.5) > 0.14) {
    return { ready: false, message: 'Center your face inside the oval.', ...result };
  }

  const leftEye = face[33]!;
  const rightEye = face[263]!;
  const rollDegrees = Math.abs(
    Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI,
  );
  const leftCheek = face[234]!;
  const rightCheek = face[454]!;
  const nose = face[1]!;
  const cheekSpan = Math.max(0.001, rightCheek.x - leftCheek.x);
  const horizontalNoseRatio = (nose.x - leftCheek.x) / cheekSpan;
  const forehead = face[10]!;
  const chin = face[152]!;
  const verticalSpan = Math.max(0.001, chin.y - forehead.y);
  const verticalNoseRatio = (nose.y - forehead.y) / verticalSpan;
  if (rollDegrees > 10 || horizontalNoseRatio < 0.38 || horizontalNoseRatio > 0.62
    || verticalNoseRatio < 0.42 || verticalNoseRatio > 0.68) {
    return { ready: false, message: 'Look straight at the camera.', ...result };
  }
  if (quality.brightness < 52) {
    return { ready: false, message: 'Move to a brighter area.', ...result };
  }
  if (quality.brightness > 215) {
    return { ready: false, message: 'Reduce the light on your face.', ...result };
  }
  if (quality.contrast < 18 || quality.sharpness < 42) {
    return { ready: false, message: 'Hold still so your face is clear.', ...result };
  }
  return { ready: true, message: 'Hold still—capturing automatically.', ...result };
}

export function measureFrameQuality(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  face?: readonly NormalizedLandmark[],
): FrameQuality {
  const width = 96;
  const height = 96;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { brightness: 0, contrast: 0, sharpness: 0 };
  const crop = face && face.length > 0
    ? faceCrop(face, video.videoWidth, video.videoHeight)
    : { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const luminance = new Float32Array(width * height);
  let sum = 0;
  for (let pixel = 0; pixel < luminance.length; pixel += 1) {
    const offset = pixel * 4;
    const value = 0.2126 * data[offset]! + 0.7152 * data[offset + 1]! + 0.0722 * data[offset + 2]!;
    luminance[pixel] = value;
    sum += value;
  }
  const brightness = sum / luminance.length;
  let squaredDifference = 0;
  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const difference = luminance[index]! - brightness;
      squaredDifference += difference * difference;
      const laplacian = 4 * luminance[index]!
        - luminance[index - 1]!
        - luminance[index + 1]!
        - luminance[index - width]!
        - luminance[index + width]!;
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;
      laplacianCount += 1;
    }
  }
  const contrast = Math.sqrt(squaredDifference / Math.max(1, laplacianCount));
  const laplacianMean = laplacianSum / Math.max(1, laplacianCount);
  const sharpness = laplacianSquaredSum / Math.max(1, laplacianCount) - laplacianMean ** 2;
  return { brightness, contrast, sharpness };
}

function faceCrop(
  face: readonly NormalizedLandmark[],
  videoWidth: number,
  videoHeight: number,
): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(...face.map((point) => point.x));
  const maxX = Math.max(...face.map((point) => point.x));
  const minY = Math.min(...face.map((point) => point.y));
  const maxY = Math.max(...face.map((point) => point.y));
  const paddingX = (maxX - minX) * 0.12;
  const paddingY = (maxY - minY) * 0.12;
  const x = Math.max(0, (minX - paddingX) * videoWidth);
  const y = Math.max(0, (minY - paddingY) * videoHeight);
  const right = Math.min(videoWidth, (maxX + paddingX) * videoWidth);
  const bottom = Math.min(videoHeight, (maxY + paddingY) * videoHeight);
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}
