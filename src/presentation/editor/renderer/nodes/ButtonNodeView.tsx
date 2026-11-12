import type { ButtonProps } from '@domain/entities/componentNode';
import { ButtonIcon } from './buttonIcons';

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
  const iconPosition = props.iconPosition ?? 'left';
  const isIconOnly = Boolean(props.icon && iconPosition === 'center');
  const content = (
    <span className="inline-flex min-w-0 items-center justify-center gap-2">
      {props.icon && iconPosition === 'left' ? <ButtonIcon name={props.icon} /> : null}
      {props.icon && iconPosition === 'center' ? <ButtonIcon name={props.icon} /> : null}
      <span className={isIconOnly ? 'sr-only' : 'truncate'}>{props.label}</span>
      {props.icon && iconPosition === 'right' ? <ButtonIcon name={props.icon} /> : null}
    </span>
  );

  if (renderStatic) {
    return <div className={widgetClass}>{content}</div>;
  }

  return (
    <button
      aria-label={props.label.trim() || 'Button'}
      type="button"
      className={widgetClass}
    >
      {content}
    </button>
  );
}
