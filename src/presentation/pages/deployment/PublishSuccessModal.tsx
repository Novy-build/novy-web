import { useState } from 'react';
import type { DeploymentRecord } from '@domain/entities/deployment';
import { Modal } from '@presentation/components/system/Modal';
import { Button } from '@presentation/components/ui/Button';

interface PublishSuccessModalProps {
  deployment: DeploymentRecord;
  onClose: () => void;
}

/** Success confirmation with the generated URL and clipboard feedback. */
export function PublishSuccessModal({ deployment, onClose }: PublishSuccessModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const url = deployment.url ?? '';

  async function copyUrl(): Promise<void> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <Modal labelledBy="publish-success-title" onClose={onClose}>
      <div
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700"
      >
        ✓
      </div>
      <h2 className="mt-4 text-lg font-semibold text-ink" id="publish-success-title">
        Your app is live
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        The latest version finished building and is ready to share.
      </p>

      <div className="mt-5 rounded-tile border border-hairline bg-canvas p-3">
        <a
          className="block truncate text-sm font-medium text-brand-700 underline"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          {url}
        </a>
        <button
          className="mt-3 rounded-tile border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
          onClick={() => void copyUrl()}
          type="button"
        >
          {copyStatus === 'copied' ? 'Copied!' : 'Copy URL'}
        </button>
        <p aria-live="polite" className="mt-2 text-xs text-ink-muted">
          {copyStatus === 'copied'
            ? 'URL copied to clipboard.'
            : copyStatus === 'failed'
              ? 'Copy failed. Select the URL above instead.'
              : ''}
        </p>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose} variant="ghost">Done</Button>
        <a
          className="inline-flex items-center justify-center rounded-tile bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          View site
        </a>
      </div>
    </Modal>
  );
}
