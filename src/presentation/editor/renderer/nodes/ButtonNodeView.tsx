import type { ButtonProps } from '@domain/entities/componentNode';

/**
 * Visual twin of the published button widget. `renderStatic` renders a
 * plain div so thumbnails can embed the widget inside clickable tiles
 * without nesting interactive elements (invalid HTML, hydration errors).
 */
export function ButtonNodeView({ props, renderStatic = false }: { props: ButtonProps; renderStatic?: boolean }) {
  const variantClass =
    props.variant === 'outline'
      ? 'border border-brand-600 bg-transparent text-brand-600'
      : props.variant === 'text'
        ? 'bg-transparent text-brand-600'
        : 'bg-brand-600 text-white';
  const widgetClass = `flex h-full w-full items-center justify-center rounded-tile text-sm font-medium transition-colors ${variantClass}`;

  if (renderStatic) {
    return <div className={widgetClass}>{props.label}</div>;
  }

  return (
    <button
      type="button"
      className={widgetClass}
    >
      {props.label}
    </button>
  );
}
