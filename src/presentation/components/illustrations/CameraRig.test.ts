import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { easeInOutCubic, getOrbitPosition } from './CameraRig';

describe('easeInOutCubic', () => {
  it('starts and ends at the exact bounds', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('is slow at both ends and fastest in the middle', () => {
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 4);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
    expect(easeInOutCubic(0.5) - easeInOutCubic(0.4)).toBeGreaterThan(
      easeInOutCubic(0.1) - easeInOutCubic(0),
    );
  });
});

describe('getOrbitPosition', () => {
  const target = new Vector3(0, -0.2, 0);

  it('places the camera at the requested radius from the target', () => {
    const position = getOrbitPosition(target, 0.64, 1.12, 16);
    expect(position.distanceTo(target)).toBeCloseTo(16, 4);
  });

  it('moves the camera when the azimuth changes, enabling idle sway', () => {
    const left = getOrbitPosition(target, 0.5, 1.12, 16);
    const right = getOrbitPosition(target, 0.8, 1.12, 16);
    expect(left.distanceTo(right)).toBeGreaterThan(1);
  });

  it('moves the camera closer to the target for the focus radius', () => {
    const overview = getOrbitPosition(target, 0.64, 1.12, 16);
    const focused = getOrbitPosition(target, 0.64, 1.12, 11);
    expect(focused.distanceTo(target)).toBeLessThan(overview.distanceTo(target));
  });
});
