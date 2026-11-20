import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  webGL: true,
  throwOnCanvas: false,
  shadowProps: {} as Record<string, unknown>,
  flowProps: {} as Record<string, unknown>,
  rigProps: {} as Record<string, unknown>,
  dashedLines: [] as Array<Record<string, unknown>>,
  htmlProps: [] as Array<Record<string, unknown>>,
  canvasAriaHidden: '' as string,
  getContextCalls: 0,
  loseCalls: 0,
  canvasRenders: 0,
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    children,
    fallback,
    onCreated,
  }: {
    children: ReactNode;
    fallback: ReactNode;
    onCreated?: (value: {
      gl: {
        setClearColor: (color: number, alpha: number) => void;
        domElement: { setAttribute: (name: string, value: string) => void };
      };
    }) => void;
  }) => {
    state.canvasRenders += 1;
    if (state.throwOnCanvas) throw new Error('WebGL context lost');
    onCreated?.({
      gl: {
        setClearColor: () => undefined,
        domElement: {
          setAttribute: (name: string, value: string) => {
            if (name === 'aria-hidden') state.canvasAriaHidden = value;
          },
        },
      },
    });
    return <div data-testid="r3f-canvas">{state.webGL ? children : fallback}</div>;
  },
  useFrame: () => undefined,
  useThree: (selector: (value: unknown) => unknown) =>
    selector({ camera: {}, controls: null, size: { width: 520, height: 340 } }),
}));

vi.mock('@react-three/drei', () => ({
  ContactShadows: (props: Record<string, unknown>) => {
    state.shadowProps = props;
    return <div data-testid="contact-shadows" />;
  },
  Float: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Html: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
    state.htmlProps.push(props);
    return <div>{children}</div>;
  },
  Line: (props: Record<string, unknown>) => {
    state.dashedLines.push(props);
    return <div data-testid="dashed-line" />;
  },
}));

vi.mock('./FlowStations', () => ({
  FlowStations: (props: Record<string, unknown>) => {
    state.flowProps = props;
    return null;
  },
}));

vi.mock('./CameraRig', () => ({
  CameraRig: (props: Record<string, unknown>) => {
    state.rigProps = props;
    return null;
  },
}));

import { NovyFlowScene } from './NovyFlowScene';

function setReducedMotion(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes('reduced-motion') ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  state.webGL = true;
  state.throwOnCanvas = false;
  state.flowProps = {};
  state.rigProps = {};
  state.dashedLines = [];
  state.htmlProps = [];
  state.canvasAriaHidden = '';
  state.getContextCalls = 0;
  state.loseCalls = 0;
  state.canvasRenders = 0;
  setReducedMotion(false);
  Object.defineProperty(window, 'WebGLRenderingContext', {
    configurable: true,
    writable: true,
    value: class WebGLRenderingContext {},
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    state.getContextCalls += 1;
    return {
      getExtension: () => ({
        loseContext: () => {
          state.loseCalls += 1;
        },
      }),
    } as unknown as WebGLRenderingContext;
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NovyFlowScene', () => {
  it('marks only the WebGL surface as decorative', () => {
    render(<NovyFlowScene />);
    expect(state.canvasAriaHidden).toBe('true');
    expect(screen.getByTestId('r3f-canvas').closest('[aria-hidden="true"]')).toBeNull();
  });

  it('lets the camera rig own idle motion and drag interaction', () => {
    render(<NovyFlowScene />);
    expect(state.rigProps.isIdle).toBe(true);
    expect(state.rigProps.rigActive).toBe(true);
    expect(state.rigProps.suppressSway).toBe(false);
    expect(typeof state.rigProps.onInteract).toBe('function');
  });

  it('shows the branded poster when WebGL is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    state.webGL = false;
    render(<NovyFlowScene />);
    expect(screen.getByTestId('scene-poster')).toBeInTheDocument();
    expect(screen.queryByTestId('r3f-canvas')).not.toBeInTheDocument();
  });

  it('probes WebGL only once per mount and releases the probe context', () => {
    const { rerender } = render(<NovyFlowScene />);
    rerender(<NovyFlowScene />);
    rerender(<NovyFlowScene />);
    expect(state.getContextCalls).toBe(1);
    expect(state.loseCalls).toBe(1);
  });

  it('retries a failed WebGL context before settling on the poster', () => {
    state.throwOnCanvas = true;
    render(<NovyFlowScene />);
    expect(screen.getByTestId('scene-poster')).toBeInTheDocument();
    expect(state.canvasRenders).toBeGreaterThan(1);
  });

  it('freezes rotation, shadows and camera focus for reduced motion', () => {
    setReducedMotion(true);
    render(<NovyFlowScene />);
    expect(state.shadowProps.frames).toBe(1);
    expect(state.flowProps.emphasized).toBeNull();
    // Direct manipulation stays available; only automatic animation is disabled.
    expect(state.rigProps.rigActive).toBe(true);
    expect(state.rigProps.isIdle).toBe(true);
  });

  it('spotlights each stage while idle and clears the sweep on interaction', () => {
    vi.useFakeTimers();
    render(<NovyFlowScene />);

    expect(state.flowProps.emphasized).toBe('build');
    act(() => vi.advanceTimersByTime(2600));
    expect(state.flowProps.emphasized).toBe('wire');

    const onInteract = state.rigProps.onInteract as () => void;
    act(() => onInteract());
    expect(state.rigProps.isIdle).toBe(false);
    expect(state.flowProps.emphasized).toBeNull();

    act(() => vi.advanceTimersByTime(3500));
    expect(state.rigProps.isIdle).toBe(true);
    expect(state.flowProps.emphasized).toBe('build');
  });

  it('draws three dashed leader lines for the stage labels', () => {
    render(<NovyFlowScene />);
    expect(screen.getAllByTestId('dashed-line')).toHaveLength(3);
    for (const line of state.dashedLines) {
      expect(line.dashed).toBe(true);
      expect(line.lineWidth).toBe(1.6);
    }
    for (const label of state.htmlProps) {
      expect(label.zIndexRange).toEqual([1000, 900]);
    }
    expect(screen.getByText('Build it')).toBeInTheDocument();
    expect(screen.getByText('Wire it')).toBeInTheDocument();
    expect(screen.getByText('Ship it')).toBeInTheDocument();
  });

  it('latches hover until the pointer leaves the scene', () => {
    vi.useFakeTimers();
    render(<NovyFlowScene />);
    const description = screen.getByText(/Connect events, conditions, and actions/);
    const scene = screen.getByTestId('r3f-canvas').parentElement as HTMLElement;
    expect(description).toHaveClass('opacity-0');

    fireEvent.pointerEnter(screen.getByText('Wire it'));
    expect(state.rigProps.focused).toBe('wire');
    expect(description).toHaveClass('opacity-100');

    // Raycast dropouts while the camera moves must not clear the latch.
    fireEvent.pointerLeave(screen.getByText('Wire it'));
    fireEvent.pointerEnter(screen.getByText('Wire it'));
    expect(state.rigProps.focused).toBe('wire');
    expect(description).toHaveClass('opacity-100');

    fireEvent.pointerLeave(scene);
    expect(state.rigProps.focused).toBe('wire');
    act(() => vi.advanceTimersByTime(180));
    expect(state.rigProps.focused).toBeNull();
    expect(description).toHaveClass('opacity-0');
  });

  it('supports keyboard focus as an equivalent to hovering', () => {
    render(<NovyFlowScene />);
    const label = screen.getByText('Wire it').closest('[tabindex="0"]');
    expect(label).not.toBeNull();
    fireEvent.focus(label as Element);
    expect(state.rigProps.focused).toBe('wire');
    expect(screen.getByText(/Connect events, conditions, and actions/)).toHaveClass('opacity-100');
  });

  it('keeps the rig on idle sway after the hover ends', () => {
    vi.useFakeTimers();
    render(<NovyFlowScene />);
    fireEvent.pointerEnter(screen.getByText('Wire it'));
    fireEvent.pointerLeave(screen.getByTestId('r3f-canvas').parentElement as HTMLElement);

    act(() => vi.advanceTimersByTime(1400));
    expect(state.rigProps.focused).toBeNull();
    expect(state.rigProps.isIdle).toBe(true);
    expect(state.rigProps.rigActive).toBe(true);
  });
});
