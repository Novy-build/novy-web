import { describe, expect, it } from 'vitest';
import { findStation, getEmphasizedStation, getFocusPose, STATIONS } from './stationCopy';

describe('stationCopy', () => {
  it('describes all three stages with labels, descriptions and anchors', () => {
    expect(STATIONS.map((station) => station.id)).toEqual(['build', 'wire', 'publish']);
    for (const station of STATIONS) {
      expect(station.title.length).toBeGreaterThan(0);
      expect(station.description.length).toBeGreaterThan(20);
      expect(station.label).toHaveLength(3);
      expect(station.leader.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('falls back to the first stage for an unknown id', () => {
    expect(findStation('build')).toBe(STATIONS[0]);
  });

  it('prioritizes hover over the idle sweep', () => {
    expect(getEmphasizedStation('wire', 'build')).toBe('wire');
    expect(getEmphasizedStation(null, 'build')).toBe('build');
    expect(getEmphasizedStation(null, null)).toBeNull();
  });

  it('focuses the camera on the selected station with a slight offset', () => {
    const pose = getFocusPose('publish');
    expect(pose.target[0]).toBe(3.5);
    expect(pose.target[1]).toBeCloseTo(-0.05, 4);
    expect(pose.target[2]).toBe(0.1);
    expect(pose.position[0]).toBeGreaterThan(pose.target[0]);
    expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
  });
});
