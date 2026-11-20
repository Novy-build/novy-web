import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { Group, MathUtils, Mesh, Quaternion, Vector3 } from 'three';
import type { StationId } from './stationCopy';

/** Hex values mirror the brand ramp declared in src/presentation/styles.css. */
const COLOR = {
  deep: '#2a2181',
  mid: '#5551f2',
  bright: '#8a86ff',
  light: '#c2c8ff',
  glow: '#eef0ff',
} as const;

type Vec3 = [number, number, number];

interface MotionProps {
  reducedMotion: boolean;
}

interface StationProps extends MotionProps {
  emphasized: boolean;
  onHover: (id: StationId) => void;
}

interface StationGroupProps extends StationProps {
  id: StationId;
  position: Vec3;
  children: ReactNode;
}

interface SegmentProps {
  from: Vec3;
  to: Vec3;
  radius?: number;
  color?: string;
}

const NODE_LEFT: Vec3 = [-0.72, 0.42, 0.4];
const NODE_RIGHT: Vec3 = [0.72, 0.42, 0.4];
const NODE_TOP: Vec3 = [0, 0.42, -0.5];

const FLOW_LEFT: Vec3 = [-2.28, -0.18, 0.15];
const FLOW_MID_LEFT: Vec3 = [-1.2, -0.18, 0.15];
const FLOW_MID_RIGHT: Vec3 = [1.2, -0.18, 0.15];
const FLOW_RIGHT: Vec3 = [2.28, -0.18, 0.15];

const FOCUS_SCALE = 1.14;
const FOCUS_LIFT_Y = 0.34;
const FOCUS_LIFT_Z = 0.18;

export function getStationFocusTransform(emphasized: boolean): {
  scale: number;
  liftY: number;
  liftZ: number;
} {
  return emphasized
    ? { scale: FOCUS_SCALE, liftY: FOCUS_LIFT_Y, liftZ: FOCUS_LIFT_Z }
    : { scale: 1, liftY: 0, liftZ: 0 };
}

function Platform({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh receiveShadow>
        <boxGeometry args={[2.4, 0.22, 1.9]} />
        <meshStandardMaterial color={COLOR.deep} metalness={0.2} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.13, 0]} receiveShadow>
        <boxGeometry args={[2.24, 0.04, 1.74]} />
        <meshStandardMaterial
          color={COLOR.mid}
          emissive={COLOR.mid}
          emissiveIntensity={0.18}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

function ComponentBlock({
  position,
  color,
  width = 0.9,
  height = 0.34,
  depth = 0.7,
}: {
  position: Vec3;
  color: string;
  width?: number;
  height?: number;
  depth?: number;
}) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} metalness={0.15} roughness={0.35} />
    </mesh>
  );
}

/** Makes a whole station hoverable and smoothly grows it while emphasized. */
function StationGroup({
  id,
  position,
  emphasized,
  reducedMotion,
  onHover,
  children,
}: StationGroupProps) {
  const ref = useRef<Group>(null);
  const focus = getStationFocusTransform(emphasized);

  useFrame((_, delta) => {
    if (!ref.current || reducedMotion) return;
    const nextScale = MathUtils.damp(ref.current.scale.x, focus.scale, 6, delta);
    ref.current.scale.setScalar(nextScale);
    ref.current.position.y = MathUtils.damp(
      ref.current.position.y,
      position[1] + focus.liftY,
      6,
      delta,
    );
    ref.current.position.z = MathUtils.damp(
      ref.current.position.z,
      position[2] + focus.liftZ,
      6,
      delta,
    );
  });

  const renderedPosition: Vec3 = reducedMotion
    ? [position[0], position[1] + focus.liftY, position[2] + focus.liftZ]
    : position;

  return (
    <group
      ref={ref}
      position={renderedPosition}
      scale={reducedMotion ? focus.scale : undefined}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(id);
      }}
    >
      {children}
    </group>
  );
}

function BuildStation({ reducedMotion, emphasized, onHover }: StationProps) {
  return (
    <StationGroup
      id="build"
      position={[-3.5, -0.5, 0]}
      emphasized={emphasized}
      reducedMotion={reducedMotion}
      onHover={onHover}
    >
      <Platform position={[0, 0, 0]} />
      <ComponentBlock position={[-0.65, 0.45, 0.35]} color={COLOR.light} />
      <mesh position={[-0.65, 0.46, 0.72]}>
        <boxGeometry args={[0.55, 0.035, 0.02]} />
        <meshBasicMaterial color={COLOR.deep} toneMapped={false} />
      </mesh>
      <ComponentBlock
        position={[0.05, 0.4, -0.4]}
        color={COLOR.bright}
        width={0.7}
        height={0.28}
      />
      <Float
        speed={reducedMotion ? 0 : 1.4}
        rotationIntensity={reducedMotion ? 0 : 0.18}
        floatIntensity={reducedMotion ? 0 : 0.5}
        floatingRange={[-0.04, 0.16]}
      >
        <group position={[0.6, 0.95, 0.15]} rotation={[0, -0.25, 0]}>
          <ComponentBlock
            position={[0, 0, 0]}
            color={COLOR.glow}
            width={0.85}
            height={0.3}
            depth={0.65}
          />
          <mesh position={[0.12, 0.42, 0.28]} rotation={[0.15, 0.3, Math.PI]}>
            <coneGeometry args={[0.11, 0.34, 4]} />
            <meshBasicMaterial color={COLOR.glow} toneMapped={false} />
          </mesh>
        </group>
      </Float>
    </StationGroup>
  );
}

function LogicNode({ position, primary = false }: { position: Vec3; primary?: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.26, 6]} />
        <meshStandardMaterial
          color={primary ? COLOR.bright : COLOR.light}
          emissive={COLOR.mid}
          emissiveIntensity={0.35}
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.02, 6, 24]} />
        <meshBasicMaterial color={COLOR.glow} toneMapped={false} />
      </mesh>
    </group>
  );
}

function useSegment(from: Vec3, to: Vec3) {
  return useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const direction = end.clone().sub(start);
    return {
      start,
      end,
      midpoint: start.clone().add(end).multiplyScalar(0.5).toArray() as Vec3,
      length: direction.length(),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    };
  }, [from, to]);
}

function Wire({ from, to, radius = 0.04, color = COLOR.bright }: SegmentProps) {
  const { midpoint, length, quaternion } = useSegment(from, to);
  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        toneMapped={false}
      />
    </mesh>
  );
}

function Pulse({
  from,
  to,
  offset,
  reducedMotion,
  radius = 0.09,
  color = COLOR.glow,
}: SegmentProps & { offset: number; reducedMotion: boolean }) {
  const ref = useRef<Mesh>(null);
  const { start, end, midpoint } = useSegment(from, to);

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const progress = (clock.elapsedTime * 0.55 + offset) % 1;
    ref.current.position.copy(start).lerp(end, progress);
  });

  return (
    <mesh ref={ref} position={reducedMotion ? midpoint : start}>
      <sphereGeometry args={[radius, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function WireStation({ reducedMotion, emphasized, onHover }: StationProps) {
  return (
    <StationGroup
      id="wire"
      position={[0, -0.5, 0]}
      emphasized={emphasized}
      reducedMotion={reducedMotion}
      onHover={onHover}
    >
      <Platform position={[0, 0, 0]} />
      <LogicNode position={NODE_LEFT} />
      <LogicNode position={NODE_RIGHT} primary />
      <LogicNode position={NODE_TOP} />
      <Wire from={NODE_LEFT} to={NODE_TOP} />
      <Wire from={NODE_TOP} to={NODE_RIGHT} />
      <Pulse from={NODE_LEFT} to={NODE_TOP} offset={0} reducedMotion={reducedMotion} />
      <Pulse from={NODE_TOP} to={NODE_RIGHT} offset={0.5} reducedMotion={reducedMotion} />
    </StationGroup>
  );
}

function PublishStation({ reducedMotion, emphasized, onHover }: StationProps) {
  return (
    <StationGroup
      id="publish"
      position={[3.5, -0.5, 0]}
      emphasized={emphasized}
      reducedMotion={reducedMotion}
      onHover={onHover}
    >
      <Platform position={[0, 0, 0]} />
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.025, 8, 32]} />
        <meshStandardMaterial
          color={COLOR.light}
          emissive={COLOR.bright}
          emissiveIntensity={1.1}
          toneMapped={false}
        />
      </mesh>
      <Float
        speed={reducedMotion ? 0 : 1}
        rotationIntensity={reducedMotion ? 0 : 0.25}
        floatIntensity={reducedMotion ? 0 : 0.7}
        floatingRange={[-0.05, 0.2]}
      >
        <mesh position={[0, 0.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color={COLOR.bright}
            emissive={COLOR.mid}
            emissiveIntensity={0.8}
            metalness={0.35}
            roughness={0.25}
            flatShading
          />
        </mesh>
      </Float>
    </StationGroup>
  );
}

interface FlowStationsProps extends MotionProps {
  emphasized: StationId | null;
  onHover: (id: StationId) => void;
}

/** Build -> wire -> publish, connected by glowing tubes with travelling pulses. */
export function FlowStations({ reducedMotion, emphasized, onHover }: FlowStationsProps) {
  const stationProps = { reducedMotion, onHover };
  const worldRef = useRef<Group>(null);

  // Continuous ambient motion so the scene feels alive even when untouched.
  useFrame(({ clock }) => {
    // Freeze the sway while a stage is emphasized so geometry does not drift
    // under a stationary cursor and retrigger hover events.
    if (!worldRef.current || reducedMotion || emphasized !== null) return;
    worldRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.09;
    worldRef.current.position.y = Math.sin(clock.elapsedTime * 0.55) * 0.05;
  });

  return (
    <group ref={worldRef}>
      <BuildStation {...stationProps} emphasized={emphasized === 'build'} />
      <WireStation {...stationProps} emphasized={emphasized === 'wire'} />
      <PublishStation {...stationProps} emphasized={emphasized === 'publish'} />
      <Wire from={FLOW_LEFT} to={FLOW_MID_LEFT} radius={0.06} color={COLOR.light} />
      <Wire from={FLOW_MID_RIGHT} to={FLOW_RIGHT} radius={0.06} color={COLOR.light} />
      <Pulse
        from={FLOW_LEFT}
        to={FLOW_MID_LEFT}
        offset={0.25}
        radius={0.13}
        reducedMotion={reducedMotion}
      />
      <Pulse
        from={FLOW_MID_RIGHT}
        to={FLOW_RIGHT}
        offset={0.75}
        radius={0.13}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
