import { Component, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { usePrefersReducedMotion } from '@presentation/hooks/usePrefersReducedMotion';
import { useSceneIdle } from '@presentation/hooks/useSceneIdle';
import { CameraRig } from './CameraRig';
import { FlowStations } from './FlowStations';
import { ScenePoster } from './ScenePoster';
import { StationAnnotations } from './StationAnnotations';
import { getEmphasizedStation, STATIONS, type StationId } from './stationCopy';

const IDLE_SWEEP_MS = 2600;
const RETURN_MS = 1400;
const HOVER_RELEASE_MS = 180;
const MAX_SCENE_RETRIES = 2;

interface BoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError: () => void;
}

interface BoundaryState {
  failed: boolean;
}

/** Keeps a lost WebGL context from taking down the whole login page. */
class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Probes WebGL support once per mount and releases the probe context. Leaving
 * probe contexts alive exhausted the browser's context limit, which made the
 * real canvas fail after a few re-renders.
 */
function probeWebGL(): boolean {
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const supported = Boolean(gl);
    try {
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // Losing the probe context is best-effort; support is already known.
    }
    return supported;
  } catch {
    return false;
  }
}

/**
 * Isometric Novy flow with 3D-anchored labels. Hovering or focusing a stage
 * focuses the camera on it and reveals its description beside the title.
 */
export function NovyFlowScene() {
  const reducedMotion = usePrefersReducedMotion();
  const { isIdle, markActive } = useSceneIdle();
  const [hovered, setHovered] = useState<StationId | null>(null);
  const [idleStation, setIdleStation] = useState<StationId | null>(null);
  const [returning, setReturning] = useState(false);
  const [supportsWebGL] = useState(probeWebGL);
  const [attempt, setAttempt] = useState(0);
  const previousHovered = useRef<StationId | null>(null);
  const labelPortal = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const [, setPortalReady] = useState(false);

  /**
   * Hover is latched: moving the camera slides the mesh and its label out from
   * under a stationary cursor, so pointerout events are ignored. Hover only
   * releases when the pointer actually leaves the scene or focus is lost.
   */
  const setHoveredStation = useCallback((id: StationId) => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHovered(id);
  }, []);

  const releaseHover = useCallback(() => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHovered(null);
      hoverTimer.current = null;
    }, HOVER_RELEASE_MS);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  // drei Html reads the portal during render, so force one re-render once the
  // outer wrapper exists. Without this the labels mount inside R3F's
  // overflow-hidden canvas container and the outer labels get clipped.
  const attachPortal = useCallback((node: HTMLDivElement | null) => {
    labelPortal.current = node;
    setPortalReady(true);
  }, []);

  const retryScene = useCallback(() => {
    setAttempt((current) => (current < MAX_SCENE_RETRIES ? current + 1 : current));
  }, []);

  // Give the camera a moment to glide back when hover/focus leaves a station.
  useEffect(() => {
    if (previousHovered.current && !hovered) {
      setReturning(true);
      const timer = window.setTimeout(() => setReturning(false), RETURN_MS);
      previousHovered.current = hovered;
      return () => window.clearTimeout(timer);
    }
    previousHovered.current = hovered;
    return undefined;
  }, [hovered]);

  // Quietly spotlight one stage at a time while the scene is left alone.
  useEffect(() => {
    if (!isIdle || reducedMotion || hovered) {
      setIdleStation(null);
      return;
    }
    let index = 0;
    setIdleStation(STATIONS[0].id);
    const timer = window.setInterval(() => {
      index = (index + 1) % STATIONS.length;
      setIdleStation(STATIONS[index].id);
    }, IDLE_SWEEP_MS);
    return () => window.clearInterval(timer);
  }, [isIdle, reducedMotion, hovered]);

  const emphasized = getEmphasizedStation(hovered, reducedMotion ? null : idleStation);
  // Direct manipulation must keep working even when the OS requests reduced
  // motion; only automatic animation is gated inside CameraRig and FlowStations.
  const rigActive = true;

  if (!supportsWebGL) {
    return (
      <div aria-hidden="true" className="absolute inset-0">
        <ScenePoster />
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 ${hovered ? 'cursor-pointer' : ''}`}
      onPointerLeave={releaseHover}
      ref={attachPortal}
    >
      <SceneErrorBoundary key={attempt} fallback={<ScenePoster />} onError={retryScene}>
        <Canvas
          key={attempt}
          orthographic
          shadows
          dpr={[1, 2]}
          camera={{ position: [9, 7, 12], zoom: 55, near: 0.1, far: 100 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            // Only the WebGL surface is decorative; the anchored labels stay accessible.
            gl.domElement.setAttribute('aria-hidden', 'true');
          }}
          fallback={<ScenePoster />}
        >
          <CameraRig
            focused={hovered}
            rigActive={rigActive}
            isIdle={isIdle}
            reducedMotion={reducedMotion}
            suppressSway={returning}
            onInteract={markActive}
            onPointerFar={releaseHover}
          />
          <ambientLight intensity={0.9} />
          <directionalLight position={[6, 10, 8]} intensity={1.8} color="#eef0ff" castShadow />
          <pointLight position={[-5, 3, 5]} intensity={35} distance={18} color="#8a86ff" />
          <pointLight position={[5, 4, -4]} intensity={28} distance={18} color="#c2c8ff" />
          <FlowStations
            reducedMotion={reducedMotion}
            emphasized={emphasized}
            onHover={setHoveredStation}
          />
          <StationAnnotations
            hovered={hovered}
            onHover={setHoveredStation}
            onRelease={releaseHover}
            portal={labelPortal as RefObject<HTMLElement>}
          />
          <ContactShadows
            position={[0, -1.6, 0]}
            scale={12}
            opacity={0.45}
            blur={2.4}
            far={4}
            resolution={256}
            color="#1b1160"
            frames={reducedMotion ? 1 : Infinity}
          />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
