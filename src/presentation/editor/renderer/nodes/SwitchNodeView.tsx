import { useState } from 'react';
import type { SwitchProps } from '@domain/entities/componentNode';

export function SwitchNodeView({
  props,
  renderStatic = false,
  isPreview = false,
  onValueChange,
  checked: controlledChecked,
}: {
  props: SwitchProps;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
  checked?: boolean;
}) {
  const [checked, setChecked] = useState(props.checked);
  const effectiveChecked = controlledChecked ?? checked;
  const toggle = () => {
    const next = !effectiveChecked;
    setChecked(next);
    onValueChange?.(String(next));
  };

  return (
    <div className="flex h-full w-full items-center justify-between gap-3">
      <span className="novy-widget-text text-sm">{props.label}</span>
      {renderStatic ? (
        <span className={`relative inline-flex h-6 w-11 items-center rounded-full ${effectiveChecked ? 'bg-brand-600' : 'bg-hairline'}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform ${effectiveChecked ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </span>
      ) : (
        <button
          aria-checked={effectiveChecked}
          aria-label={props.label || 'Switch'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${effectiveChecked ? 'bg-brand-600' : 'bg-hairline'}`}
          onClick={isPreview ? toggle : undefined}
          role="switch"
          tabIndex={isPreview ? 0 : -1}
          type="button"
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform ${effectiveChecked ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )}
    </div>
  );
}
