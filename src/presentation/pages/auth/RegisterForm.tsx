import { useState, type FormEvent } from 'react';
import { AuthError } from '@domain/errors/AuthError';
import { Button } from '@presentation/components/ui/Button';
import { PasswordInput } from '@presentation/components/ui/PasswordInput';
import { TextInput } from '@presentation/components/ui/TextInput';
import { useSession } from '@main/providers/SessionProvider';
import { formatAuthError } from './authMessages';
import { validateDisplayName, validateEmail, validatePassword, validatePasswordMatch } from './validators';

interface FieldErrors {
  displayName?: string | null;
  email?: string | null;
  password?: string | null;
  passwordConfirm?: string | null;
}

/**
 * Registration form backed by the session provider. Depending on the backend
 * configuration it either signs in immediately or reports pending email
 * confirmation; AuthPage reacts to the session status.
 */
export function RegisterForm() {
  const { signUp } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {
      displayName: validateDisplayName(displayName),
      email: validateEmail(email),
      password: validatePassword(password),
      passwordConfirm: validatePasswordMatch(password, passwordConfirm),
    };
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors(null);
    setFormError(null);
    setFormNotice(null);
    setIsSubmitting(true);
    try {
      await signUp({ displayName, email: email.trim(), password });
    } catch (error) {
      // A pending email confirmation is not a failure: the account exists and
      // the user simply needs to follow the Supabase confirmation link.
      if (error instanceof AuthError && error.code === 'email-confirmation-required') {
        setFormNotice(formatAuthError(error));
      } else {
        setFormError(formatAuthError(error));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      {formNotice ? (
        <p className="rounded-tile border border-hairline bg-canvas px-3 py-2 text-sm text-ink" role="status">
          {formNotice}
        </p>
      ) : null}
      {formError ? (
        <p className="rounded-tile border border-signal-invalid/30 bg-signal-invalid/5 px-3 py-2 text-sm text-signal-invalid" role="alert">
          {formError}
        </p>
      ) : null}
      <TextInput
        autoComplete="name"
        error={fieldErrors?.displayName ?? null}
        label="Full name"
        onChange={(event) => setDisplayName(event.target.value)}
        type="text"
        value={displayName}
      />
      <TextInput
        autoComplete="email"
        error={fieldErrors?.email ?? null}
        label="Email"
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <PasswordInput
        autoComplete="new-password"
        error={fieldErrors?.password ?? null}
        hint="At least 8 characters including a number."
        label="Password"
        onChange={(event) => setPassword(event.target.value)}
        value={password}
      />
      <PasswordInput
        autoComplete="new-password"
        error={fieldErrors?.passwordConfirm ?? null}
        label="Confirm password"
        onChange={(event) => setPasswordConfirm(event.target.value)}
        value={passwordConfirm}
      />
      <Button isLoading={isSubmitting} isBlock type="submit">
        Create account
      </Button>
    </form>
  );
}
