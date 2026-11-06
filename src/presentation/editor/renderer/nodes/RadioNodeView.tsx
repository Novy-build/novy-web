import { useState } from 'react';
import type { RadioProps } from '@domain/entities/componentNode';

export function RadioNodeView({
  props,
  renderStatic = false,
  isPreview = false,
  onValueChange,
}: {
  props: RadioProps;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [selected, setSelected] = useState(props.selectedIndex);
  const options = props.options.length > 0 ? props.options : ['Option'];

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {props.label ? <span className="text-xs font-medium text-ink-muted">{props.label}</span> : null}
      <div className="flex flex-col gap-1">
        {options.map((option, index) => (
          <label className="flex items-center gap-2 text-sm text-ink" key={`${option}-${index}`}>
            {renderStatic ? (
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${selected === index ? 'border-brand-600' : 'border-hairline'}`}>
                {selected === index ? <span className="h-2 w-2 rounded-full bg-brand-600" /> : null}
              </span>
            ) : (
              <input
                checked={selected === index}
                className="h-4 w-4 accent-brand-600"
                name={props.label || 'radio'}
                onChange={() => {
                  setSelected(index);
                  onValueChange?.(option);
                }}
                readOnly={!isPreview}
                tabIndex={isPreview ? 0 : -1}
                type="radio"
              />
            )}
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}