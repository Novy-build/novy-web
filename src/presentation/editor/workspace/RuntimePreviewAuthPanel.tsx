import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  RuntimePreviewRepository,
  RuntimePreviewUser,
} from '@domain/repositories/runtimePreview.repository';

interface RuntimePreviewAuthPanelProps {
  appId: string;
  repository: RuntimePreviewRepository;
  reason: string;
  onClose: () => void;
  onSignedIn: (user: RuntimePreviewUser) => void;
}

export function RuntimePreviewAuthPanel({
  appId,
  repository,
  reason,
  onClose,
  onSignedIn,
}: RuntimePreviewAuthPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  async function sendCode(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    const target = email.trim();
    if (!target) {
      setError('Enter an email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repository.requestCode(appId, target);
      setStep('code');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'The sign-in code could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from the email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await repository.verifyCode(appId, email.trim(), code));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'The sign-in code could not be verified.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        aria-labelledby="runtime-preview-auth-title"
        aria-modal="true"
        className="w-full max-w-md rounded-panel border border-hairline bg-surface p-6 shadow-xl"
        ref={panelRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink" id="runtime-preview-auth-title">
              Sign in to the test app
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{reason}</p>
          </div>
          <button
            aria-label="Close app sign-in"
            className="min-h-11 min-w-11 rounded-tile text-xl text-ink-muted hover:bg-canvas hover:text-ink"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {step === 'email' ? (
          <form className="mt-5 flex flex-col gap-3" onSubmit={(event) => void sendCode(event)}>
            <label className="text-sm font-medium text-ink" htmlFor="runtime-preview-email">
              Email address
            </label>
            <input
              aria-describedby={error ? 'runtime-preview-auth-error' : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="email"
              className="min-h-11 rounded-tile border border-hairline bg-canvas px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              id="runtime-preview-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              ref={emailRef}
              required
              type="email"
              value={email}
            />
            {error ? <p className="text-sm text-red-700" id="runtime-preview-auth-error" role="alert">{error}</p> : null}
            <button
              className="min-h-11 rounded-tile bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </form>
        ) : (
          <form className="mt-5 flex flex-col gap-3" onSubmit={(event) => void verifyCode(event)}>
            <label className="text-sm font-medium text-ink" htmlFor="runtime-preview-code">
              Six-digit code
            </label>
            <input
              aria-describedby={error
                ? 'runtime-preview-code-help runtime-preview-code-error'
                : 'runtime-preview-code-help'}
              aria-invalid={Boolean(error)}
              autoComplete="one-time-code"
              className="min-h-11 rounded-tile border border-hairline bg-canvas px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              id="runtime-preview-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              pattern="\d{6}"
              ref={codeRef}
              required
              type="text"
              value={code}
            />
            <p className="text-sm text-ink-muted" id="runtime-preview-code-help">
              Enter the code sent to {email.trim()}.
            </p>
            {error ? <p className="text-sm text-red-700" id="runtime-preview-code-error" role="alert">{error}</p> : null}
            <button
              className="min-h-11 rounded-tile bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Verifying…' : 'Sign in'}
            </button>
            <div className="flex flex-wrap gap-4 text-sm">
              <button className="min-h-11 text-brand-700" disabled={busy} onClick={() => void sendCode()} type="button">
                Resend code
              </button>
              <button className="min-h-11 text-brand-700" onClick={() => { setStep('email'); setError(null); }} type="button">
                Change email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
