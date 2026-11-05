import { useId, type FormEvent } from 'react';
import type { FormProps } from '@domain/entities/componentNode';

/** Self-contained PD6 Form control used consistently by canvas, preview, and thumbnails. */
export function FormNodeView({
  props,
  renderStatic,
}: {
  props: FormProps;
  renderStatic: boolean;
}) {
  const idPrefix = useId();

  if (renderStatic) {
    return (
      <div className="flex h-full flex-col gap-2 rounded-tile border border-hairline bg-surface p-4">
        <p className="text-base font-semibold text-ink">{props.title}</p>
        {props.fields.map((field, index) => (
          <div className="grid gap-1" key={`${field.label}-${index}`}>
            <span className="text-xs font-medium text-ink-muted">{field.label}</span>
            <span className="h-8 rounded-md border border-hairline bg-canvas" />
          </div>
        ))}
        <span className="mt-auto rounded-md bg-brand-600 px-3 py-2 text-center text-xs font-medium text-white">
          {props.submitLabel}
        </span>
      </div>
    );
  }

  function preventSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  return (
    <form
      aria-label={props.title}
      className="flex h-full flex-col gap-3 overflow-auto rounded-tile border border-hairline bg-surface p-4"
      onSubmit={preventSubmit}
    >
      <h3 className="text-base font-semibold text-ink">{props.title}</h3>
      {props.fields.map((field, index) => {
        const fieldId = `${idPrefix}-${index}`;
        return (
          <div className="grid gap-1" key={`${field.label}-${index}`}>
            <label className="text-xs font-medium text-ink-muted" htmlFor={fieldId}>
              {field.label}
            </label>
            <input
              className="h-9 rounded-md border border-hairline bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500"
              id={fieldId}
              placeholder={field.placeholder}
              type={field.type}
            />
          </div>
        );
      })}
      <button
        className="mt-auto rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white"
        type="submit"
      >
        {props.submitLabel}
      </button>
    </form>
  );
}
