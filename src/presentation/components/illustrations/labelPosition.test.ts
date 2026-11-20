import { describe, expect, it } from 'vitest';
import { Object3D, OrthographicCamera } from 'three';
import { clampLabelToPanel, LABEL_HALF_HEIGHT, LABEL_HALF_WIDTH } from './labelPosition';

const SIZE = { width: 520, height: 340 };

function cameraFor(size = SIZE): OrthographicCamera {
  const camera = new OrthographicCamera(
    -size.width / 2,
    size.width / 2,
    size.height / 2,
    -size.height / 2,
    0.1,
    100,
  );
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

function labelAt(x: number, y: number): Object3D {
  const label = new Object3D();
  label.position.set(x, y, 0);
  label.updateMatrixWorld(true);
  return label;
}

describe('clampLabelToPanel', () => {
  it('leaves a centred label where the camera projects it', () => {
    const [x, y] = clampLabelToPanel(labelAt(0, 0), cameraFor(), SIZE);
    expect(x).toBeCloseTo(SIZE.width / 2, 3);
    expect(y).toBeCloseTo(SIZE.height / 2, 3);
  });

  it('pulls a label that projects past the right edge back inside', () => {
    const [x] = clampLabelToPanel(labelAt(SIZE.width, 0), cameraFor(), SIZE);
    expect(x).toBeCloseTo(SIZE.width - LABEL_HALF_WIDTH, 3);
  });

  it('pulls a label that projects past the left edge back inside', () => {
    const [x] = clampLabelToPanel(labelAt(-SIZE.width, 0), cameraFor(), SIZE);
    expect(x).toBeCloseTo(LABEL_HALF_WIDTH, 3);
  });

  it('keeps labels above or below the canvas fully visible', () => {
    const [topX, topY] = clampLabelToPanel(labelAt(0, SIZE.height), cameraFor(), SIZE);
    expect(topX).toBeCloseTo(SIZE.width / 2, 3);
    expect(topY).toBeCloseTo(LABEL_HALF_HEIGHT, 3);

    const [, bottomY] = clampLabelToPanel(labelAt(0, -SIZE.height), cameraFor(), SIZE);
    expect(bottomY).toBeCloseTo(SIZE.height - LABEL_HALF_HEIGHT, 3);
  });

  it('does not invert bounds on an unusually small canvas', () => {
    const tiny = { width: 40, height: 30 };
    const [x, y] = clampLabelToPanel(labelAt(1000, -1000), cameraFor(tiny), tiny);
    expect(x).toBeCloseTo(tiny.width / 2, 3);
    expect(y).toBeCloseTo(tiny.height / 2, 3);
  });
});
