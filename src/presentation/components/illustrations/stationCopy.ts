export type StationId = 'build' | 'wire' | 'publish';

export type Vec3 = [number, number, number];

export interface StationCopy {
  id: StationId;
  /** Handwritten label always shown beside the station. */
  title: string;
  description: string;
  /** Station centre in world space, used as the camera focus target. */
  center: Vec3;
  /** Where the 3D-anchored label sits. */
  label: Vec3;
  /** Dashed leader line from the station to the label. */
  leader: readonly Vec3[];
}

/** Real DOM copy and 3D anchors for the three stages; nothing essential is in WebGL. */
export const STATIONS: readonly StationCopy[] = [
  {
    id: 'build',
    title: 'Build it',
    description:
      'Drag components onto the canvas and arrange them exactly how you want your app to look.',
    center: [-3.5, -0.5, 0],
    label: [-4.7, 2.6, 0.6],
    leader: [
      [-4.05, 0.1, 0.5],
      [-4.45, 1.1, 0.55],
      [-4.7, 2.45, 0.6],
    ],
  },
  {
    id: 'wire',
    title: 'Wire it',
    description:
      'Connect events, conditions, and actions in the visual logic builder — no code required.',
    center: [0, -0.5, 0],
    label: [0, -2.1, 0.8],
    leader: [
      [0, -0.9, 0.6],
      [0, -1.4, 0.7],
      [0, -1.9, 0.8],
    ],
  },
  {
    id: 'publish',
    title: 'Ship it',
    description: 'Preview the result, then deploy a live URL that anyone can open.',
    center: [3.5, -0.5, 0],
    label: [3.9, 1.7, 0.6],
    leader: [
      [4.0, 0.1, 0.5],
      [4.2, 0.8, 0.55],
      [3.9, 1.55, 0.6],
    ],
  },
];

export function findStation(id: StationId): StationCopy {
  return STATIONS.find((station) => station.id === id) ?? STATIONS[0];
}

/** Hover/focus wins over the idle attention sweep. */
export function getEmphasizedStation(
  hovered: StationId | null,
  idle: StationId | null,
): StationId | null {
  return hovered ?? idle;
}

/** Camera pose used when a station is hovered or focused. */
export function getFocusPose(id: StationId): { target: Vec3; position: Vec3 } {
  const { center } = findStation(id);
  return {
    // The station lifts while focused, so aim above its resting centre.
    target: [center[0], center[1] + 0.45, center[2] + 0.1],
    position: [center[0] + 5, center[1] + 4.5, center[2] + 7],
  };
}
