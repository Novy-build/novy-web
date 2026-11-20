import { MathUtils, Object3D, Vector3, type Camera } from 'three';

/**
 * drei's <Html center> positions a DOM box centred on a projected 3D point.
 * At the outer stations that point can sit close enough to the canvas edge
 * for the box (and its expanded description) to be cut off. Clamping the
 * anchor by half the box size keeps every label fully visible.
 */
export const LABEL_HALF_WIDTH = 64;
export const LABEL_HALF_HEIGHT = 76;

const projected = new Vector3();

export function clampLabelToPanel(
  el: Object3D,
  camera: Camera,
  size: { width: number; height: number },
): number[] {
  projected.setFromMatrixPosition(el.matrixWorld).project(camera);

  // On an unusually small canvas, keep the bounds valid instead of inverting.
  const halfWidth = Math.min(LABEL_HALF_WIDTH, size.width / 2);
  const halfHeight = Math.min(LABEL_HALF_HEIGHT, size.height / 2);

  return [
    MathUtils.clamp((projected.x * 0.5 + 0.5) * size.width, halfWidth, size.width - halfWidth),
    MathUtils.clamp((-projected.y * 0.5 + 0.5) * size.height, halfHeight, size.height - halfHeight),
  ];
}
