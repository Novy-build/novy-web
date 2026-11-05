import { useState, type FormEvent } from 'react';
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
 * Registration form backed by the (mock) session provider. Creates the mock
 * account and signs in immediately; AuthPage reacts to the session status.
 */
export function RegisterForm() {
  const { signUp } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
    setIsSubmitting(true);
    try {
      await signUp({ displayName, email: email.trim(), password });
    } catch (error) {
      setFormError(formatAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      {formError ? (
        <p className="rounded-tile border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
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
