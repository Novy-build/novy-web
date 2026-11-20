import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  frames: [] as Array<(value: unknown) => void>,
  floatProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: (value: unknown) => void) => {
    state.frames.push(callback);
  },
}));

vi.mock('@react-three/drei', () => ({
  Float: (props: Record<string, unknown> & { children?: ReactNode }) => {
    state.floatProps.push(props);
    return <div>{props.children}</div>;
  },
}));

import { FlowStations, getStationFocusTransform } from './FlowStations';

const baseProps = {
  emphasized: null,
  onHover: () => undefined,
};

beforeEach(() => {
  state.frames = [];
  state.floatProps = [];
  // three.js tags render as unknown DOM elements in jsdom; the notices are expected.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FlowStations', () => {
  it('lifts focused stations toward the viewer and scales them up', () => {
    expect(getStationFocusTransform(false)).toEqual({ scale: 1, liftY: 0, liftZ: 0 });
    expect(getStationFocusTransform(true)).toEqual({ scale: 1.14, liftY: 0.34, liftZ: 0.18 });
  });

  it('uses gentle float and four pulse animations when motion is allowed', () => {
    render(<FlowStations reducedMotion={false} {...baseProps} />);

    expect(state.floatProps).toHaveLength(2);
    for (const props of state.floatProps) {
      expect(props.speed).toBeGreaterThan(0);
      expect(props.floatIntensity).toBeGreaterThan(0);
    }
    // Four pulses, three station-emphasis tweens and the ambient world sway.
    expect(state.frames).toHaveLength(8);
  });

  it('stops floating and makes every pulse callback inert for reduced motion', () => {
    render(<FlowStations reducedMotion {...baseProps} />);

    for (const props of state.floatProps) {
      expect(props.speed).toBe(0);
      expect(props.rotationIntensity).toBe(0);
      expect(props.floatIntensity).toBe(0);
    }
    for (const frame of state.frames) {
      expect(() => frame({ clock: { elapsedTime: 2 } })).not.toThrow();
    }
  });
});
