import type { InputProps } from '@domain/entities/componentNode';

/**
 * Visual twin of the published input widget. `renderStatic` swaps the
 * `<input>` for a styled div so thumbnails stay valid HTML inside
 * clickable tiles (no interactive descendants of buttons or links).
 */
export function InputNodeView({ props, renderStatic = false }: { props: InputProps; renderStatic?: boolean }) {
  const widgetClass =
    'h-9 w-full rounded-tile border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted/70';

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {props.label ? (
        renderStatic ? (
          <span className="text-xs font-medium text-ink-muted">{props.label}</span>
        ) : (
          <label className="text-xs font-medium text-ink-muted">{props.label}</label>
        )
      ) : null}
      {renderStatic ? (
        <div className={widgetClass} />
      ) : (
        <input
          readOnly
          className={widgetClass}
          placeholder={props.placeholder}
          tabIndex={-1}
        />
      )}
    </div>
  );
}
