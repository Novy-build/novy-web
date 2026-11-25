import { TextInput } from '@presentation/components/ui/TextInput';

interface ColorFieldProps {
  allowTransparent?: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Expands shorthand hex and returns a lowercase `#rrggbb` value. Native color
 * inputs only accept the six-digit form, while the text field keeps accepting
 * any CSS color string the user prefers to type.
 */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return null;
  const hex = trimmed.slice(1).toLowerCase();
  return hex.length === 3
    ? `#${hex.split('').map((character) => character + character).join('')}`
    : `#${hex}`;
}

/** Hex input paired with a native color picker for the same appearance value. */
export function ColorField({ allowTransparent, label, name, onChange, placeholder, value }: ColorFieldProps) {
  const isTransparent = value.trim().toLowerCase() === 'transparent';
  return (
    <div className="flex flex-wrap items-end gap-1.5">
      <div className="min-w-0 flex-1">
        <TextInput
          label={label}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </div>
      <input
        aria-label={`${label} picker`}
        className="h-10 w-9 shrink-0 cursor-pointer rounded-tile border border-hairline bg-surface p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        onChange={(event) => onChange(event.target.value)}
        title={`Choose ${label.toLowerCase()}`}
        type="color"
        value={normalizeHexColor(value) ?? '#000000'}
      />
      {allowTransparent ? (
        <button
          aria-label={`${label} transparent`}
          aria-pressed={isTransparent}
          className={`h-10 shrink-0 rounded-tile border px-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
            isTransparent
              ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
              : 'border-hairline bg-surface text-ink-muted hover:bg-canvas'
          }`}
          onClick={() => onChange(isTransparent ? '' : 'transparent')}
          title="Use no color"
          type="button"
        >
          Transparent
        </button>
      ) : null}
    </div>
  );
}
