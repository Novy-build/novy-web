import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RuntimePreviewRepository } from '@domain/repositories/runtimePreview.repository';
import { RuntimePreviewAuthPanel } from './RuntimePreviewAuthPanel';

function repository(): RuntimePreviewRepository {
  return {
    isAvailable: true,
    prepare: vi.fn(),
    resetData: vi.fn(),
    execute: vi.fn(),
    uploadDocument: vi.fn(),
    executeVision: vi.fn(),
    requestCode: vi.fn(),
    verifyCode: vi.fn(),
    getSession: vi.fn(),
    logout: vi.fn(),
  };
}

describe('RuntimePreviewAuthPanel', () => {
  it('closes only the nested sign-in dialog on Escape', () => {
    const onClose = vi.fn();
    render(
      <RuntimePreviewAuthPanel
        appId="app_preview"
        onClose={onClose}
        onSignedIn={vi.fn()}
        reason="Authentication required."
        repository={repository()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Sign in to the test app' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
