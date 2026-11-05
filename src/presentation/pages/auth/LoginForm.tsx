import { useState, type FormEvent } from 'react';
import { Button } from '@presentation/components/ui/Button';
import { PasswordInput } from '@presentation/components/ui/PasswordInput';
import { TextInput } from '@presentation/components/ui/TextInput';
import { useSession } from '@main/providers/SessionProvider';
import { formatAuthError } from './authMessages';
import { validateEmail, validateSignInCredentials } from './validators';

interface FieldErrors {
  email?: string | null;
  password?: string | null;
}

/**
 * Email + password sign-in form backed by the (mock) session provider.
 * Validation errors display inline; auth failures display in a banner.
 * Successful sign-ins flip the session status, and AuthPage reacts by
 * navigating — so this form stays fully self-contained.
 */
export function LoginForm() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {
      email: validateEmail(email),
      password: validateSignInCredentials(password, 'password'),
    };
    if (errors.email || errors.password) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors(null);
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (error) {
      setFormError(formatAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form aria-label="Log in" className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <p className="rounded-tile border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {formError}
        </p>
      ) : null}
      <TextInput
        autoComplete="email"
        error={fieldErrors?.email ?? null}
        label="Email"
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <PasswordInput
        autoComplete="current-password"
        error={fieldErrors?.password ?? null}
        label="Password"
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Your password"
        value={password}
      />
      <Button isLoading={isSubmitting} isBlock type="submit">
        Log in
      </Button>
    </form>
  );
}
