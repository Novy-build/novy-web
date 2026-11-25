import { CheckCircle2, CircleAlert, ExternalLink, Gauge } from 'lucide-react';
import type { AssistantProposalV1 } from '@domain/entities/assistant';
import { ScreenFrame } from '../renderer/ScreenFrame';
import type { AssistantProposalStatus } from './useAssistantConversation';
import { assistantProposalRagDisclosure, assistantProposalTitle } from './assistantProposalPreview';

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
  const rag = assistantProposalRagDisclosure(proposal);

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
        {rag.usesRag ? (
          <p className="rounded-tile bg-canvas p-2.5 text-xs text-ink-muted" data-testid="assistant-rag-disclosure">
            Document upload and grounded answers run through Novy’s backend RAG pipeline with the
            explicitly selected profiles. Raw files and provider credentials stay on the backend
            and are never bundled into your exported app.
            {rag.remoteProfiles.length
              ? ` Remote profile ${rag.remoteProfiles.join(', ')} sends prompts and retrieved context outside Novy and may incur cost.`
              : ''}
          </p>
        ) : null}

        {proposal.feasibility ? (
          <section aria-label="Design feasibility" className="rounded-tile border border-hairline bg-canvas p-3 text-xs">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Gauge aria-hidden="true" size={16} />
              Design match · {proposal.feasibility.predictedFidelity}% predicted fidelity
            </p>
            <p className="mt-1 leading-relaxed text-ink-muted">{proposal.feasibility.summary}</p>
            {proposal.feasibility.notices.length ? (
              <details className="mt-2 border-t border-hairline">
                <summary className="cursor-pointer py-2 font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand-600">
                  Fidelity notes ({proposal.feasibility.notices.length})
                </summary>
                <ul className="space-y-2 pb-1">
                  {proposal.feasibility.notices.map((notice, index) => (
                    <li className="rounded-tile bg-surface p-2 text-ink-muted" key={`${notice.requirement}-${index}`}>
                      <p className="font-medium text-ink">{notice.severity[0]!.toUpperCase()}{notice.severity.slice(1)} approximation</p>
                      <p className="mt-1">{notice.impact}</p>
                      {notice.safeAlternative ? <p className="mt-1">Safe alternative: {notice.safeAlternative}</p> : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {proposal.seedRecordCount ? (
          <section aria-label="Seed data" className="rounded-tile border border-hairline bg-canvas p-3 text-xs" data-testid="assistant-seed-disclosure">
            <p className="font-medium text-ink">
              {proposal.seedRecordCount} seed {proposal.seedRecordCount === 1 ? 'record' : 'records'} will be created when you apply
            </p>
            <p className="mt-1 leading-relaxed text-ink-muted">
              Values are checked against the collection fields and receive backend-generated IDs. The same records appear in Run App.
            </p>
            {proposal.seedExclusions?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
                {proposal.seedExclusions.map((exclusion, index) => <li key={`${exclusion}-${index}`}>{exclusion}</li>)}
              </ul>
            ) : null}
          </section>
        ) : null}

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
        {proposal.stageTrace?.length ? (
          <section aria-label="Generation stages" className="border-t border-hairline py-3 text-xs" data-testid="assistant-stage-trace">
            <h4 className="mb-1 font-medium text-ink">
              {proposal.qualityMode === 'high-fidelity' ? 'High-fidelity stages' : 'Generation stages'}
            </h4>
            <ul className="space-y-1 text-ink-muted">
              {proposal.stageTrace.map((stage) => (
                <li key={stage.id}>
                  {stage.id}: {stage.status}
                  {stage.attempts > 1 ? ` (${stage.attempts} attempts)` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {proposal.visualReview?.required ? (
          <section aria-label="Visual review" className="border-t border-hairline py-3 text-xs" data-testid="assistant-visual-review-status">
            <h4 className="mb-1 font-medium text-ink">Visual review</h4>
            <p className="text-ink-muted">
              {proposal.visualReview.qualityStatus === 'reviewed'
                ? `Completed · ${proposal.visualReview.score ?? '—'} / 100 fidelity`
                : proposal.visualReview.qualityStatus === 'continued-unreviewed'
                  ? 'Skipped — this draft was not visually compared with the reference.'
                  : proposal.visualReview.status === 'review-failed'
                    ? 'Failed — the draft was not changed.'
                    : 'Pending'}
            </p>
            {proposal.visualReview.qualityStatus === 'reviewed' && proposal.visualReview.summary ? (
              <p className="mt-1 text-ink-muted">{proposal.visualReview.summary}</p>
            ) : null}
            {proposal.visualReview.approximations?.length ? (
              <p className="mt-1 text-ink-muted">
                Approximations: {proposal.visualReview.approximations.join('; ')}
              </p>
            ) : null}
          </section>
        ) : null}
        {proposal.quality ? (
          <section aria-label="Quality gates" className="border-t border-hairline py-3 text-xs" data-testid="assistant-quality-report">
            <h4 className="mb-1 font-medium text-ink">Quality gates</h4>
            <p className="text-ink-muted">
              {proposal.quality.label} · {proposal.quality.overallScore} / 100
            </p>
          </section>
        ) : null}
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
