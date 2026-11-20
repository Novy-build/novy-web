import { useState } from 'react';
import type { CheckboxProps, ComponentAppearance } from '@domain/entities/componentNode';
import { fieldStyleClass, fieldStyleCss } from './fieldStyle';

export function CheckboxNodeView({
  props,
  appearance,
  renderStatic = false,
  isPreview = false,
  onValueChange,
}: {
  props: CheckboxProps;
  appearance?: ComponentAppearance;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [checked, setChecked] = useState(props.checked);
  const control = renderStatic ? (
    <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-hairline bg-surface'}`}>
      {checked ? '✓' : ''}
    </span>
  ) : (
    <input
      aria-label={props.label.trim() || 'Checkbox'}
      checked={checked}
      className="h-4 w-4 accent-brand-600"
      onChange={(event) => {
        setChecked(event.target.checked);
        onValueChange?.(String(event.target.checked));
      }}
      readOnly={!isPreview}
      tabIndex={isPreview ? 0 : -1}
      type="checkbox"
    />
  );

  return (
    <div className={`flex h-full w-full items-center gap-2 ${fieldStyleClass(props.fieldStyle)}`} style={fieldStyleCss(appearance, props.fieldStyle)}>
      {control}
      {props.label ? <span className="novy-widget-text text-sm">{props.label}</span> : null}
    </div>
  );
}
