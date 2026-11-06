import { useState } from 'react';
import type { SwitchProps } from '@domain/entities/componentNode';

export function SwitchNodeView({
  props,
  renderStatic = false,
  isPreview = false,
  onValueChange,
}: {
  props: SwitchProps;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [checked, setChecked] = useState(props.checked);
  const toggle = () => {
    const next = !checked;
    setChecked(next);
    onValueChange?.(String(next));
  };

  return (
    <div className="flex h-full w-full items-center justify-between gap-3">
      <span className="text-sm text-ink">{props.label}</span>
      {renderStatic ? (
        <span className={`relative inline-flex h-6 w-11 items-center rounded-full ${checked ? 'bg-brand-600' : 'bg-hairline'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </span>
      ) : (
        <button
          aria-checked={checked}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-hairline'}`}
          onClick={isPreview ? toggle : undefined}
          role="switch"
          tabIndex={isPreview ? 0 : -1}
          type="button"
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )}
    </div>
  );
}