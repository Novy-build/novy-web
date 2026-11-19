import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssistantProposalActions } from './AssistantProposalActions';

describe('AssistantProposalActions', () => {
  it('requires confirmation before replacing existing screens and focuses Cancel', () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    render(<AssistantProposalActions canApply hasExistingContent isApplying={false} isWorking={false} onAccept={onAccept} onDiscard={vi.fn()} onRefine={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use this app' }));
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByText(/Existing saved records are not deleted/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Use this app' })).toHaveFocus();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('accepts only after explicit confirmation and blocks duplicate use while applying', () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    const props = { canApply: true, hasExistingContent: true, isApplying: false, isWorking: false, onAccept, onDiscard: vi.fn(), onRefine: vi.fn() };
    const { rerender } = render(<AssistantProposalActions {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use this app' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace and use app' }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    rerender(<AssistantProposalActions {...props} isApplying isWorking />);
    expect(screen.getByRole('button', { name: 'Applying…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Applying your app');
  });
});
