import { useEffect, useState } from 'react';
import type { DropdownProps } from '@domain/entities/componentNode';
import { ActionMenuNodeView } from './ActionMenuNodeView';

export function DropdownNodeView({
  props,
  renderStatic = false,
  isPreview = false,
  onValueChange,
  itemLabel,
  value,
}: {
  props: DropdownProps;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
  itemLabel?: string;
  value?: string;
}) {
  if (props.presentation === 'menu') {
    if (renderStatic || !isPreview) return <div aria-hidden="true" className="flex h-full w-full items-center justify-center text-xl text-ink">⋮</div>;
    return <ActionMenuNodeView isPreview={isPreview && !renderStatic} itemLabel={itemLabel} label={props.label} onSelect={onValueChange} options={props.options} />;
  }
  return <SelectNodeView isPreview={isPreview} onValueChange={onValueChange} props={props} renderStatic={renderStatic} value={value} />;
}

function SelectNodeView({ props, renderStatic, isPreview, onValueChange, value }: {
  props: DropdownProps;
  renderStatic: boolean;
  isPreview: boolean;
  onValueChange?: (value: string) => void;
  value?: string;
}) {
  const boundIndex = value === undefined ? props.selectedIndex : props.options.indexOf(value);
  const [selectedIndex, setSelectedIndex] = useState(boundIndex);
  const selected = selectedIndex >= 0 ? props.options[selectedIndex] : '';

  useEffect(() => {
    setSelectedIndex(boundIndex);
  }, [boundIndex]);

  if (renderStatic) {
    return (
      <div className="flex h-full w-full flex-col justify-center gap-1">
        {props.label ? <span className="text-xs font-medium text-ink-muted">{props.label}</span> : null}
        <div className="flex h-9 w-full items-center rounded-tile border border-hairline bg-surface px-3 text-sm text-ink">
          {selected || props.placeholder}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {props.label ? <label className="text-xs font-medium text-ink-muted">{props.label}</label> : null}
      <select
        aria-label={props.label.trim() || props.placeholder.trim() || 'Dropdown'}
        className="h-9 w-full rounded-tile border border-hairline bg-surface px-3 text-sm text-ink"
        onChange={(event) => {
          const index = Number(event.target.value);
          setSelectedIndex(index);
          onValueChange?.(props.options[index] ?? '');
        }}
        disabled={!isPreview}
        tabIndex={isPreview ? 0 : -1}
        value={selectedIndex}
      >
        <option value={-1}>{props.placeholder}</option>
        {props.options.map((option, index) => (
          <option key={`${option}-${index}`} value={index}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
