import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, OrthographicCamera, Vector3 } from 'three';
import { getFocusPose, type StationId } from './stationCopy';

const OVERVIEW_TARGET = new Vector3(0, -0.2, 0);
const BASE_AZIMUTH = Math.atan2(9, 12);
const BASE_POLAR = Math.acos(7.2 / Math.hypot(9, 7.2, 12));
const ORBIT_RADIUS = 16;
const FOCUS_RADIUS = 13;
const FOCUS_ZOOM_FACTOR = 1.12;
const DRAG_DAMPING = 4;
const SWAY_DAMPING = 1.4;
const FOCUS_DURATION = 0.9;
const RETURN_DURATION = 1.1;
const REDUCED_DURATION = 0.25;
const POINTER_RELEASE_DISTANCE = 240;

/** Symmetric ease-in/out curve so focus glides accelerate and settle. */
export function easeInOutCubic(t: number): number {
  const clamped = MathUtils.clamp(t, 0, 1);
  return clamped < 0.5 ? 4 * clamped ** 3 : 1 - (-2 * clamped + 2) ** 3 / 2;
}

/** Position on the orbit sphere around a target, used by both sway and focus. */
export function getOrbitPosition(
  target: Vector3,
  azimuth: number,
  polar: number,
  radius: number,
): Vector3 {
  const sinPolar = Math.sin(polar);
  return new Vector3(
    target.x + radius * sinPolar * Math.sin(azimuth),
    target.y + radius * Math.cos(polar),
    target.z + radius * sinPolar * Math.cos(azimuth),
  );
}

interface CameraRigProps {
  focused: StationId | null;
  rigActive: boolean;
  isIdle: boolean;
  reducedMotion: boolean;
  suppressSway: boolean;
  onInteract: () => void;
  onPointerFar: () => void;
}

interface OrbitState {
  azimuth: number;
  polar: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
}

interface FocusTransition {
  fromPosition: Vector3;
  fromTarget: Vector3;
  fromZoom: number;
  elapsed: number;
  duration: number;
}

/** Single owner of the camera: drag orbit, idle sway and eased hover focus. */
export function CameraRig({
  focused,
  rigActive,
  isIdle,
  reducedMotion,
  suppressSway,
  onInteract,
  onPointerFar,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const gl = useThree((state) => state.gl);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const baseZoom = Math.min(width / 10.5, height / 5.2);
  const orbit = useRef<OrbitState>({
    azimuth: BASE_AZIMUTH,
    polar: BASE_POLAR,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const transition = useRef<FocusTransition | null>(null);
  const lastFocused = useRef<StationId | null>(null);
  const currentLook = useRef(OVERVIEW_TARGET.clone());
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const farNotified = useRef(false);

  const focusTarget = useMemo(
    () => (focused ? new Vector3(...getFocusPose(focused).target) : OVERVIEW_TARGET),
    [focused],
  );

  // Lightweight drag-to-orbit directly on the canvas. No OrbitControls update
  // loop competing with the rig, so nothing snaps or gets overwritten.
  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerDown = (event: PointerEvent) => {
      transition.current = null;
      orbit.current.dragging = true;
      orbit.current.lastX = event.clientX;
      orbit.current.lastY = event.clientY;
      onInteract();
    };
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (!orbit.current.dragging) return;
      const dx = event.clientX - orbit.current.lastX;
      const dy = event.clientY - orbit.current.lastY;
      orbit.current.lastX = event.clientX;
      orbit.current.lastY = event.clientY;
      orbit.current.azimuth = MathUtils.clamp(
        orbit.current.azimuth + dx * 0.005,
        BASE_AZIMUTH - 0.5,
        BASE_AZIMUTH + 0.5,
      );
      orbit.current.polar = MathUtils.clamp(
        orbit.current.polar + dy * 0.004,
        BASE_POLAR - 0.3,
        BASE_POLAR + 0.3,
      );
      onInteract();
    };
    const onPointerUp = () => {
      orbit.current.dragging = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, onInteract]);

  useEffect(() => {
    camera.position.set(9, 7, 12);
    camera.zoom = baseZoom;
    camera.updateProjectionMatrix();
    camera.lookAt(OVERVIEW_TARGET);
  }, [camera, baseZoom]);

  useFrame((state, delta) => {
    if (!rigActive) return;

    const elapsed = state.clock.elapsedTime;
    const swaying =
      !reducedMotion && !focused && isIdle && !suppressSway && !orbit.current.dragging;
    const azimuth = orbit.current.azimuth + (swaying ? Math.sin(elapsed * 0.28) * 0.14 : 0);
    const polar = orbit.current.polar + (swaying ? Math.sin(elapsed * 0.21 + 1) * 0.035 : 0);
    const radius = focused ? FOCUS_RADIUS : ORBIT_RADIUS;
    const desiredPosition = getOrbitPosition(focusTarget, azimuth, polar, radius);
    const desiredZoom = baseZoom * (focused ? FOCUS_ZOOM_FACTOR : 1);

    // Release focus when the cursor is genuinely far from the station on
    // screen, while ignoring brief raycast dropouts caused by camera movement.
    if (focused && !orbit.current.dragging && pointer.current) {
      const screenPoint = focusTarget.clone().project(camera);
      const stationX = (screenPoint.x + 1) * 0.5 * width;
      const stationY = (1 - screenPoint.y) * 0.5 * height;
      const distance = Math.hypot(pointer.current.x - stationX, pointer.current.y - stationY);
      if (distance > POINTER_RELEASE_DISTANCE && !farNotified.current) {
        farNotified.current = true;
        onPointerFar();
      } else if (distance <= POINTER_RELEASE_DISTANCE) {
        farNotified.current = false;
      }
    }

    // Starting/ending a focus is a real tween, not a per-frame exponential.
    if (lastFocused.current !== focused) {
      farNotified.current = false;
      transition.current = {
        fromPosition: camera.position.clone(),
        fromTarget: currentLook.current.clone(),
        fromZoom: camera.zoom,
        elapsed: 0,
        duration: reducedMotion
          ? REDUCED_DURATION
          : focused
            ? FOCUS_DURATION
            : RETURN_DURATION,
      };
      lastFocused.current = focused;
    }

    if (transition.current) {
      const active = transition.current;
      active.elapsed += delta;
      const progress = easeInOutCubic(active.elapsed / active.duration);
      camera.position.lerpVectors(active.fromPosition, desiredPosition, progress);
      currentLook.current.lerpVectors(active.fromTarget, focusTarget, progress);
      camera.zoom = MathUtils.lerp(active.fromZoom, desiredZoom, progress);
      if (active.elapsed >= active.duration) transition.current = null;
    } else if (orbit.current.dragging) {
      camera.position.x = MathUtils.damp(camera.position.x, desiredPosition.x, DRAG_DAMPING, delta);
      camera.position.y = MathUtils.damp(camera.position.y, desiredPosition.y, DRAG_DAMPING, delta);
      camera.position.z = MathUtils.damp(camera.position.z, desiredPosition.z, DRAG_DAMPING, delta);
      camera.zoom = MathUtils.damp(camera.zoom, desiredZoom, DRAG_DAMPING, delta);
    } else {
      const damping = swaying ? SWAY_DAMPING : DRAG_DAMPING;
      camera.position.x = MathUtils.damp(camera.position.x, desiredPosition.x, damping, delta);
      camera.position.y = MathUtils.damp(camera.position.y, desiredPosition.y, damping, delta);
      camera.position.z = MathUtils.damp(camera.position.z, desiredPosition.z, damping, delta);
      camera.zoom = MathUtils.damp(camera.zoom, desiredZoom, damping, delta);
      currentLook.current.copy(focusTarget);
    }

    camera.lookAt(currentLook.current);
    camera.updateProjectionMatrix();
  });

  return null;
}
