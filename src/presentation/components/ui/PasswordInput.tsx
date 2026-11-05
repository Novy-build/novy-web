import { useState } from 'react';
import { TextInput } from './TextInput';
import type { TextInputProps } from './TextInput';

export type PasswordInputProps = Omit<TextInputProps, 'type'>;

/**
 * Password field with a show/hide toggle (UI kit).
 */
export function PasswordInput(props: PasswordInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div className="relative">
      <TextInput
        {...props}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        type={isPasswordVisible ? 'text' : 'password'}
      />
      <button
        aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isPasswordVisible}
        className="absolute right-2 top-8 rounded-tile px-1 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
        onClick={() => setIsPasswordVisible((visible) => !visible)}
        type="button"
      >
        {isPasswordVisible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
