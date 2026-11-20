import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  frame: null as null | ((value: unknown, delta: number) => void),
  canvas: null as HTMLCanvasElement | null,
  camera: null as null | {
    position: {
      x: number;
      y: number;
      z: number;
      set: (x: number, y: number, z: number) => void;
      copy: (other: { x: number; y: number; z: number }) => void;
      clone: () => { x: number; y: number; z: number };
      lerpVectors: (
        a: { x: number; y: number; z: number },
        b: { x: number; y: number; z: number },
        t: number,
      ) => void;
    };
    zoom: number;
    lookAt: () => void;
    updateProjectionMatrix: () => void;
    matrixWorldInverse: { elements: number[] };
    projectionMatrix: { elements: number[] };
  },
}));

vi.mock('@react-three/fiber', () => {
  const identity = () => ({ elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] });
  const camera = {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
      copy(other: { x: number; y: number; z: number }) {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
      },
      clone() {
        return {
          x: this.x,
          y: this.y,
          z: this.z,
          clone: this.clone,
          lerpVectors: this.lerpVectors,
        };
      },
      lerpVectors(
        a: { x: number; y: number; z: number },
        b: { x: number; y: number; z: number },
        t: number,
      ) {
        this.x = a.x + (b.x - a.x) * t;
        this.y = a.y + (b.y - a.y) * t;
        this.z = a.z + (b.z - a.z) * t;
      },
    },
    zoom: 1,
    lookAt: () => undefined,
    updateProjectionMatrix: () => undefined,
    matrixWorldInverse: identity(),
    projectionMatrix: identity(),
  };
  state.camera = camera;
  const canvas = document.createElement('canvas');
  state.canvas = canvas;

  return {
    useThree: (selector: (value: unknown) => unknown) =>
      selector({
        camera,
        gl: { domElement: canvas },
        size: { width: 520, height: 340 },
      }),
    useFrame: (callback: (value: unknown, delta: number) => void) => {
      state.frame = callback;
    },
  };
});

import { CameraRig } from './CameraRig';

function renderRig(reducedMotion: boolean, onInteract = () => undefined) {
  return render(
    <CameraRig
      focused={null}
      rigActive
      isIdle
      reducedMotion={reducedMotion}
      suppressSway={false}
      onInteract={onInteract}
      onPointerFar={() => undefined}
    />,
  );
}

function dragCanvas(fromX: number, toX: number): void {
  const canvas = state.canvas as HTMLCanvasElement;
  fireEvent.pointerDown(canvas, { clientX: fromX, clientY: 100 });
  fireEvent.pointerMove(window, { clientX: toX, clientY: 100 });
  act(() => state.frame?.({ clock: { elapsedTime: 1 } }, 0.016));
}

describe('CameraRig interaction', () => {
  it('moves the camera when the user drags the canvas', () => {
    const onInteract = vi.fn();
    renderRig(false, onInteract);

    expect(state.frame).not.toBeNull();
    expect(state.camera?.position.x).toBe(9);

    dragCanvas(100, 260);

    expect(onInteract).toHaveBeenCalled();
    expect(state.camera?.position.x).not.toBe(9);
  });

  it('still moves the camera on drag when reduced motion is requested', () => {
    renderRig(true);

    dragCanvas(100, 240);

    expect(state.camera?.position.x).not.toBe(9);
  });

  it('eases the zoom over several frames instead of snapping', () => {
    const { rerender } = renderRig(false);
    const startZoom = state.camera?.zoom ?? 0;

    rerender(
      <CameraRig
        focused="wire"
        rigActive
        isIdle={false}
        reducedMotion={false}
        suppressSway={false}
        onInteract={() => undefined}
        onPointerFar={() => undefined}
      />,
    );

    act(() => state.frame?.({ clock: { elapsedTime: 1 } }, 0.1));
    const partialZoom = state.camera?.zoom ?? 0;
    expect(partialZoom).toBeGreaterThan(startZoom);
    expect(partialZoom).toBeLessThan(startZoom * 1.18);

    act(() => state.frame?.({ clock: { elapsedTime: 2 } }, 1));
    expect(state.camera?.zoom).toBeCloseTo(startZoom * 1.18, 3);
  });

  it('releases focus when the pointer moves clearly away from the station', () => {
    const onPointerFar = vi.fn();
    render(
      <CameraRig
        focused="wire"
        rigActive
        isIdle={false}
        reducedMotion={false}
        suppressSway={false}
        onInteract={() => undefined}
        onPointerFar={onPointerFar}
      />,
    );

    fireEvent.pointerMove(window, { clientX: 1000, clientY: 100 });
    act(() => state.frame?.({ clock: { elapsedTime: 1 } }, 0.016));

    expect(onPointerFar).toHaveBeenCalledTimes(1);
  });
});
