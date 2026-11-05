import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Screen } from '@domain/entities/screen';
import { makeButton, makeScreen } from '@test/editorFixtures';
import { PreviewOverlay } from './PreviewOverlay';

const SCREEN: Screen = makeScreen('screen_1', [makeButton('node_button')]);

function renderPreview(onClose = vi.fn()) {
  render(<PreviewOverlay device="mobile" onClose={onClose} projectName="My App" screen={SCREEN} />);
  return onClose;
}

describe('PreviewOverlay', () => {
  it('previews the active screen at full size', () => {
    renderPreview();

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Previewing My App')).toBeInTheDocument();
    expect(within(dialog).getByText(/390×780/)).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Previewing My App' })).toBeInTheDocument();
    expect(within(dialog).getByText('Click me')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = renderPreview();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
