import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { assessFaceCapture } from './guidedFaceCapture';

function frontalFace(overrides: Partial<Record<number, NormalizedLandmark>> = {}): NormalizedLandmark[] {
  const points: NormalizedLandmark[] = Array.from({ length: 478 }, (_, index) => ({
    x: 0.32 + (index % 20) / 19 * 0.36,
    y: 0.28 + (index % 24) / 23 * 0.44,
    z: 0,
    visibility: 1,
  }));
  points[1] = { x: 0.5, y: 0.52, z: 0, visibility: 1 };
  points[10] = { x: 0.5, y: 0.28, z: 0, visibility: 1 };
  points[33] = { x: 0.41, y: 0.43, z: 0, visibility: 1 };
  points[152] = { x: 0.5, y: 0.72, z: 0, visibility: 1 };
  points[234] = { x: 0.32, y: 0.51, z: 0, visibility: 1 };
  points[263] = { x: 0.59, y: 0.43, z: 0, visibility: 1 };
  points[454] = { x: 0.68, y: 0.51, z: 0, visibility: 1 };
  for (const [index, point] of Object.entries(overrides)) {
    if (point) points[Number(index)] = point;
  }
  return points;
}

const clearFrame = { brightness: 128, contrast: 35, sharpness: 90 };

describe('guided face capture quality', () => {
  it('accepts one centered, frontal, clear face', () => {
    expect(assessFaceCapture([frontalFace()], clearFrame)).toMatchObject({
      ready: true,
      message: 'Hold still—capturing automatically.',
    });
  });

  it('rejects missing and multiple faces', () => {
    expect(assessFaceCapture([], clearFrame).message).toBe('Position one face inside the oval.');
    expect(assessFaceCapture([frontalFace(), frontalFace()], clearFrame).message)
      .toBe('Only one person should be visible.');
  });

  it('rejects an off-angle or unclear frame', () => {
    expect(assessFaceCapture([frontalFace({
      1: { x: 0.37, y: 0.52, z: 0, visibility: 1 },
    })], clearFrame).message)
      .toBe('Look straight at the camera.');
    expect(assessFaceCapture([frontalFace()], { ...clearFrame, sharpness: 10 }).message)
      .toBe('Hold still so your face is clear.');
  });
});
