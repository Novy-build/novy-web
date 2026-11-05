import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  isBlock?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  ghost: 'border border-hairline bg-surface text-ink hover:bg-canvas focus-visible:outline-ink-muted',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
};

/**
 * Shared action button (UI kit). Named export, token-based styles only.
 */
export function Button({
  variant = 'primary',
  isLoading = false,
  isBlock = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const blockClass = isBlock ? 'w-full' : 'inline-flex';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-tile px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 ${blockClass} ${variantClasses[variant]} ${className ?? ''}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current"
        />
      ) : null}
      {children}
    </button>
  );
}
