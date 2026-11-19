import { useId, type CSSProperties } from 'react';
import type { ComponentAppearance, InputProps } from '@domain/entities/componentNode';

/**
 * Visual twin of the published input widget. `renderStatic` swaps the
 * `<input>` for a styled div so thumbnails stay valid HTML inside
 * clickable tiles (no interactive descendants of buttons or links).
 */
export function InputNodeView({
  props,
  appearance,
  value,
  renderStatic = false,
  isPreview = false,
  onValueChange,
}: {
  props: InputProps;
  appearance?: ComponentAppearance;
  value?: string;
  renderStatic?: boolean;
  isPreview?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const inputId = useId();
  const showLabel = props.showLabel !== false;
  const accessibleLabel = props.label.trim()
    || props.placeholder.trim()
    || (props.multiline ? 'Text area' : `${props.inputType === 'text' ? 'Text' : props.inputType} field`);
  const hasVisibleLabel = showLabel && props.label.trim().length > 0;
  const borderStyle = appearance?.borderStyle ?? 'solid';
  const widgetStyle: CSSProperties = {
    backgroundColor: appearance?.backgroundColor || undefined,
    borderColor: borderStyle === 'none' ? undefined : appearance?.borderColor || undefined,
    borderRadius: appearance?.borderRadius,
    borderStyle,
    borderWidth: borderStyle === 'none' ? 0 : appearance?.borderWidth,
    color: appearance?.textColor || undefined,
    opacity: appearance?.opacity,
  };
  const textVariableStyle = appearance?.textColor
    ? { '--novy-component-text': appearance.textColor } as CSSProperties
    : undefined;
  const widgetClass =
    'novy-widget-text h-9 w-full rounded-tile border border-hairline bg-surface px-3 text-sm outline-none placeholder:text-current placeholder:opacity-70';

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1" style={textVariableStyle}>
      {hasVisibleLabel ? (
        renderStatic ? (
          <span className="novy-widget-text-muted text-xs font-medium">{props.label}</span>
        ) : (
          <label className="novy-widget-text-muted text-xs font-medium" htmlFor={inputId}>{props.label}</label>
        )
      ) : null}
      {renderStatic ? (
        <div className={widgetClass} style={widgetStyle} />
      ) : props.multiline ? (
        <textarea
          aria-label={hasVisibleLabel ? undefined : accessibleLabel}
          className={`${widgetClass} h-full py-2`}
          id={inputId}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder={props.placeholder}
          readOnly={!isPreview}
          style={widgetStyle}
          tabIndex={isPreview ? 0 : -1}
          value={value ?? ''}
        />
      ) : (
        <input
          aria-label={hasVisibleLabel ? undefined : accessibleLabel}
          className={widgetClass}
          id={inputId}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder={props.placeholder}
          readOnly={!isPreview}
          style={widgetStyle}
          tabIndex={isPreview ? 0 : -1}
          type={props.inputType}
          value={value ?? ''}
        />
      )}
    </div>
  );
}
