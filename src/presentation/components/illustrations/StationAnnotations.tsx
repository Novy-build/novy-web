import type { RefObject } from 'react';
import { Html, Line } from '@react-three/drei';
import { STATIONS, type StationId } from './stationCopy';

interface StationAnnotationsProps {
  hovered: StationId | null;
  onHover: (id: StationId) => void;
  onRelease: () => void;
  portal: RefObject<HTMLElement>;
}

/** 3D-anchored dashed leader lines and handwritten labels for each stage. */
export function StationAnnotations({ hovered, onHover, onRelease, portal }: StationAnnotationsProps) {
  return (
    <group>
      {STATIONS.map((station) => {
        const active = hovered === station.id;
        return (
          <group key={station.id}>
            <Line
              points={station.leader}
              color="#eef0ff"
              lineWidth={1.6}
              dashed
              dashSize={0.12}
              gapSize={0.09}
              transparent
              opacity={0.8}
            />
            <Html center position={station.label} portal={portal} zIndexRange={[1000, 900]}>
              <div
                aria-describedby={`novy-stage-${station.id}-description`}
                className="w-28 cursor-pointer select-none text-center outline-none focus-visible:rounded-tile focus-visible:ring-2 focus-visible:ring-brand-200"
                onBlur={onRelease}
                onFocus={() => onHover(station.id)}
                onPointerEnter={() => onHover(station.id)}
                style={{ pointerEvents: 'auto' }}
                tabIndex={0}
              >
                <p className="font-hand text-2xl leading-none text-white drop-shadow-[0_2px_6px_rgba(24,14,80,0.95)]">
                  {station.title}
                </p>
                <p
                  className={`overflow-hidden text-left text-[11px] leading-snug text-brand-100 transition-all duration-300 ${
                    active ? 'mt-2 max-h-24 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  id={`novy-stage-${station.id}-description`}
                >
                  {station.description}
                </p>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
