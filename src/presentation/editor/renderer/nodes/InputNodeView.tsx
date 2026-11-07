import { useId } from 'react';
import type { InputProps } from '@domain/entities/componentNode';

/**
 * Visual twin of the published input widget. `renderStatic` swaps the
 * `<input>` for a styled div so thumbnails stay valid HTML inside
 * clickable tiles (no interactive descendants of buttons or links).
 */
export function InputNodeView({
  props,
  value,
  renderStatic = false,
  isPreview = false,
  onValueChange,
}: {
  props: InputProps;
  value?: string;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const inputId = useId();
  const widgetClass =
    'h-9 w-full rounded-tile border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted/70';

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {props.label ? (
        renderStatic ? (
          <span className="text-xs font-medium text-ink-muted">{props.label}</span>
        ) : (
          <label className="text-xs font-medium text-ink-muted" htmlFor={inputId}>{props.label}</label>
        )
      ) : null}
      {renderStatic ? (
        <div className={widgetClass} />
      ) : props.multiline ? (
        <textarea
          className={`${widgetClass} h-full py-2`}
          id={inputId}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder={props.placeholder}
          readOnly={!isPreview}
          tabIndex={isPreview ? 0 : -1}
          value={value ?? ''}
        />
      ) : (
        <input
          className={widgetClass}
          id={inputId}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder={props.placeholder}
          readOnly={!isPreview}
          tabIndex={isPreview ? 0 : -1}
          type={props.inputType}
          value={value ?? ''}
        />
      )}
    </div>
  );
}
