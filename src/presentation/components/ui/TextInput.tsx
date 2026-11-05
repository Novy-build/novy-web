import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  /** Field-level validation message; renders with role="alert". */
  error?: string | null;
  isBlock?: boolean;
}

/**
 * Labelled text input with inline error and hint support (UI kit).
 */
export function TextInput({
  label,
  hint,
  error,
  isBlock = true,
  className,
  id,
  ...rest
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const borderClass = error
    ? 'border-red-400 focus-visible:outline-red-400'
    : 'border-hairline focus-visible:outline-brand-600';

  return (
    <div className={isBlock ? 'w-full' : 'inline-flex'}>
      <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-invalid={error ? true : undefined}
        className={`h-10 w-full rounded-tile bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 ${borderClass} border ${className ?? ''}`}
        id={inputId}
        {...rest}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-500" id={errorId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
