import { CheckCircle2, CircleAlert, ExternalLink } from 'lucide-react';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import { ScreenFrame } from '../renderer/ScreenFrame';
import type { AssistantProposalStatus } from './useAssistantConversation';
import { assistantProposalTitle } from './assistantProposalPreview';

interface AssistantProposalCardProps {
  proposal: AssistantProposalV1;
  status?: AssistantProposalStatus;
  onPreview: (opener: HTMLButtonElement) => void;
  onContinue: () => void;
}

export function AssistantProposalCard({ proposal, status, onPreview, onContinue }: AssistantProposalCardProps) {
  const title = assistantProposalTitle(proposal);
  const screens = proposal.preview.document.screens;
  const home = screens.find((screen) => screen.path === '/') ?? screens[0];
  const verification = proposal.verification;
  const failed = verification?.passed === false;
  const historical = status === 'rejected' || status === 'superseded';

  if (historical) {
    return (
      <section aria-label="Previous app draft" className="rounded-panel border border-hairline bg-canvas p-3 text-sm text-ink-muted">
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1">{status === 'rejected' ? 'Draft discarded. Your project was not changed.' : 'Replaced by a newer draft below.'}</p>
      </section>
    );
  }

  return (
    <section aria-label="App proposal preview" className="overflow-hidden rounded-panel border border-hairline bg-surface" data-testid="assistant-proposal">
      <div className="p-4">
        <p className="text-xs font-medium text-ink-muted">
          {status === 'applied' ? 'Applied and saved to your project' : failed ? 'This draft needs changes' : 'Your app draft is ready'}
        </p>
        <h3 className="mt-1 break-words text-lg font-semibold tracking-tight text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{proposal.blueprint.summary || proposal.message}</p>
      </div>

      {home ? (
        <div aria-label={`Visual preview of ${title}`} className="relative mx-4 h-56 overflow-hidden rounded-tile border border-hairline bg-canvas" role="img">
          <div aria-hidden="true" className="pointer-events-none flex justify-center pt-3" inert>
            <ScreenFrame designSystem={proposal.preview.document.designSystem} mode="thumbnail" scale={0.65} screen={home} />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-canvas to-transparent" />
        </div>
      ) : (
        <p className="mx-4 rounded-tile bg-canvas p-4 text-sm text-ink-muted">A visual preview is unavailable for this draft. Review what’s included below.</p>
      )}

      <div className="space-y-3 p-4">
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-tile border border-hairline bg-surface px-3 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
          disabled={!home}
          onClick={(event) => onPreview(event.currentTarget)}
          type="button"
        >
          <ExternalLink aria-hidden="true" size={16} /> Preview app
        </button>
        <p className="text-xs text-ink-muted">
          {proposal.blueprint.screens.length} {proposal.blueprint.screens.length === 1 ? 'screen' : 'screens'}
          {' · '}{proposal.blueprint.collections.length} data {proposal.blueprint.collections.length === 1 ? 'collection' : 'collections'}
        </p>

        <section aria-label="Build verification" className="space-y-1 text-xs">
          <p className="flex items-center gap-2 font-medium text-ink">
            {failed ? <CircleAlert aria-hidden="true" className="text-signal-invalid" size={16} /> : verification ? <CheckCircle2 aria-hidden="true" className="text-signal-valid" size={16} /> : null}
            {failed ? 'Checks found issues to resolve' : verification ? 'Automated checks passed' : 'No check report available'}
          </p>
          {verification ? <p className="pl-6 text-ink-muted">{verification.viewports.map((viewport) => `${viewport.id[0]!.toUpperCase()}${viewport.id.slice(1)}${viewport.passed ? '' : ' · failed'}`).join(' · ')}</p> : null}
          {verification?.issues.length ? (
            <ul className="list-disc space-y-1 pl-5 pt-2 text-ink">
              {verification.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}
            </ul>
          ) : null}
        </section>

        <details className="border-t border-hairline">
          <summary className="cursor-pointer py-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand-600">What’s included</summary>
          <ul className="space-y-2 pb-3 text-xs">
            {proposal.blueprint.screens.map((screen) => (
              <li className="rounded-tile bg-canvas p-2.5" key={screen.key}>
                <p className="font-medium text-ink">{screen.name}</p>
                <p className="mt-1 break-all text-ink-muted">{screen.path}</p>
                <p className="mt-1 text-ink-muted">{screen.components.length} components · {screen.workflows.length} workflows</p>
              </li>
            ))}
            {proposal.blueprint.collections.map((collection) => (
              <li className="text-ink-muted" key={collection.key}>{collection.name} data · {collection.fields.length} {collection.fields.length === 1 ? 'field' : 'fields'}</li>
            ))}
          </ul>
        </details>
        {verification ? (
          <details className="border-t border-hairline">
            <summary className="cursor-pointer py-3 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand-600">Check details</summary>
            <div className="space-y-2 pb-3 text-xs text-ink-muted">
              <p>These are automated design and workflow-simulation checks, not a live deployment test.</p>
              <ul className="space-y-1" aria-label="Responsive viewport checks">
                {verification.viewports.map((viewport) => <li key={viewport.id}>{viewport.id[0]!.toUpperCase()}{viewport.id.slice(1)} {viewport.width}×{viewport.height} · {viewport.passed ? 'Passed' : 'Failed'}</li>)}
              </ul>
              <ul className="space-y-1">
                {verification.stages.map((stage) => <li key={stage.id}>{stage.passed ? '✓' : '×'} {stage.label}</li>)}
              </ul>
              {verification.repairAttempts > 0 ? <p>Novy refined the draft {verification.repairAttempts} {verification.repairAttempts === 1 ? 'time' : 'times'} during checks.</p> : null}
            </div>
          </details>
        ) : null}
        {status === 'applied' ? <button className="min-h-11 w-full rounded-tile bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700" onClick={onContinue} type="button">Continue editing</button> : null}
      </div>
    </section>
  );
}
