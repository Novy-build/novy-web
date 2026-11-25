import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeScreen, makeText } from '@test/editorFixtures';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import { AssistantProposalCard } from './AssistantProposalCard';

const PROPOSAL: AssistantProposalV1 = {
  id: 'draft', projectId: 'project', baseRevision: 1, message: 'Built inventory',
  blueprint: {
    version: 1, summary: 'Track your equipment.', screens: [], collections: [],
    design: { style: 'product', palette: 'indigo', typography: 'modern-sans', radius: 'soft', density: 'comfortable', fieldStyle: 'outline' },
  },
  preview: {
    schemaVersion: 14,
    document: { screens: [makeScreen('home', [makeText('heading')], 'Equipment')] },
    collections: [],
    seedRecords: { tasks: [{ values: { title: 'Plan the week' } }] },
  },
  verification: { passed: true, repairAttempts: 2, stages: [], viewports: [], issues: [] },
  seedRecordCount: 1,
  seedExclusions: ['tasks.api_key was excluded from automatic seeding.'],
  qualityMode: 'high-fidelity',
  stageTrace: [
    { id: 'design-intent', status: 'passed', attempts: 1, repaired: false },
    { id: 'v2-blueprint', status: 'repaired', attempts: 2, repaired: true },
  ],
  visualReview: {
    required: true,
    status: 'reviewed',
    qualityStatus: 'reviewed',
    captureRequests: [{ screenKey: 'home', viewport: 'mobile' }],
    score: 88,
    categoryScores: [],
    approximations: ['Icons approximated.'],
    summary: 'The render closely matches the reference.',
  },
  quality: {
    passed: true,
    label: 'verified-high-fidelity',
    overallScore: 92,
    categoryScores: { composition: 94 },
    issueCounts: { total: 0 },
  },
  feasibility: {
    status: 'approximate',
    summary: 'Novy can build this with one disclosed approximation; predicted fidelity is 88%.',
    predictedFidelity: 88,
    approximationCount: 1,
    unsupportedCount: 0,
    notices: [{
      requirement: 'Preserve a custom palette.',
      impact: 'V1 uses the closest preset palette.',
      severity: 'moderate',
      safeAlternative: 'Use the closest disclosed preset.',
    }],
  },
};

describe('AssistantProposalCard', () => {
  it('leads with the actual app and keeps technical checks collapsed', () => {
    const onPreview = vi.fn();
    const { container } = render(<AssistantProposalCard onContinue={vi.fn()} onPreview={onPreview} proposal={PROPOSAL} status="pending" />);
    expect(screen.getByRole('heading', { name: 'Equipment' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Visual preview of Equipment' })).toBeInTheDocument();
    expect(container.querySelector('[data-node-id="heading"]')).not.toBeNull();
    expect(screen.getByText('Automated checks passed')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Seed data' })).toHaveTextContent(
      '1 seed record will be created when you apply',
    );
    expect(screen.getByText('tasks.api_key was excluded from automatic seeding.')).toBeVisible();
    expect(screen.getByTestId('assistant-stage-trace')).toHaveTextContent('High-fidelity stages');
    expect(screen.getByText(/v2-blueprint: repaired/)).toBeVisible();
    expect(screen.getByTestId('assistant-visual-review-status')).toHaveTextContent(
      'Completed · 88 / 100 fidelity',
    );
    expect(screen.getByText('The render closely matches the reference.')).toBeVisible();
    expect(screen.getByTestId('assistant-quality-report')).toHaveTextContent(
      'verified-high-fidelity · 92 / 100',
    );
    expect(screen.getByText('Check details').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('region', { name: 'Design feasibility' })).toHaveTextContent(
      '88% predicted fidelity',
    );
    expect(screen.getByText('Fidelity notes (1)').closest('details')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Fidelity notes (1)'));
    expect(screen.getByText('Safe alternative: Use the closest disclosed preset.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Preview app' }));
    expect(onPreview).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('keeps actionable check errors visible rather than hiding them in details', () => {
    const proposal = { ...PROPOSAL, verification: { ...PROPOSAL.verification!, passed: false, issues: [{ code: 'overflow', message: 'A card extends beyond Mobile.', stage: 'responsive' as const, viewport: 'mobile' as const, screenId: 'home', componentId: 'card' }] } };
    render(<AssistantProposalCard onContinue={vi.fn()} onPreview={vi.fn()} proposal={proposal} status="pending" />);
    expect(screen.getByText('A card extends beyond Mobile.')).toBeVisible();
    expect(screen.queryByText('Automated checks passed')).not.toBeInTheDocument();
  });

  it('offers a clear return to editing after applying the draft', () => {
    const onContinue = vi.fn();
    render(<AssistantProposalCard onContinue={onContinue} onPreview={vi.fn()} proposal={PROPOSAL} status="applied" />);
    expect(screen.getByText('Applied and saved to your project')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Continue editing' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it.each(['rejected', 'superseded'] as const)('keeps %s drafts compact and non-interactive', (status) => {
    render(<AssistantProposalCard onContinue={vi.fn()} onPreview={vi.fn()} proposal={PROPOSAL} status={status} />);
    expect(screen.getByRole('region', { name: 'Previous app draft' })).toHaveTextContent('Equipment');
    expect(screen.queryByRole('button', { name: 'Preview app' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

