import { useState } from 'react';
import type { SliderProps } from '@domain/entities/componentNode';

export function SliderNodeView({
  props,
  renderStatic = false,
  isPreview = false,
  onValueChange,
}: {
  props: SliderProps;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(props.value);
  const percent = ((value - props.min) / (props.max - props.min || 1)) * 100;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {props.label ? <span className="novy-widget-text-muted text-xs font-medium">{props.label}: {value}</span> : null}
      {renderStatic ? (
        <div className="relative h-2 w-full rounded-full bg-hairline">
          <div className="absolute left-0 top-0 h-2 rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <input
          aria-label={props.label.trim() || 'Slider'}
          className="w-full accent-brand-600"
          max={props.max}
          min={props.min}
          onChange={(event) => {
            const next = Number(event.target.value);
            setValue(next);
            onValueChange?.(String(next));
          }}
          readOnly={!isPreview}
          step={props.step}
          tabIndex={isPreview ? 0 : -1}
          type="range"
          value={value}
        />
      )}
    </div>
  );
}
