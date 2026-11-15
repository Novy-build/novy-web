import { DEPLOYMENT_STAGES, type DeploymentStage } from '@domain/entities/deployment';

const STAGE_LABELS: Readonly<Record<DeploymentStage, string>> = {
  build: 'Build',
  optimize: 'Optimize',
  provision: 'Provision',
  live: 'Live',
};

interface PublishStepperProps {
  activeStageIndex: number;
}

/** Animated, accessible progress display for the four mock publish stages. */
export function PublishStepper({ activeStageIndex }: PublishStepperProps) {
  return (
    <section
      aria-label="Publish progress"
      aria-live="polite"
      className="rounded-panel border border-brand-500/30 bg-brand-500/10 p-5 dark:border-brand-400/35 dark:bg-brand-500/15"
    >
      <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
        Publishing — {STAGE_LABELS[DEPLOYMENT_STAGES[activeStageIndex] ?? 'build']}
      </p>
      <ol className="mt-4 grid grid-cols-4 gap-2">
        {DEPLOYMENT_STAGES.map((stage, index) => {
          const state = index < activeStageIndex ? 'complete' : index === activeStageIndex ? 'active' : 'pending';
          return (
            <li className="flex min-w-0 flex-col gap-2" data-state={state} key={stage}>
              <div className="flex items-center">
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    state === 'complete'
                      ? 'bg-brand-600 text-white'
                      : state === 'active'
                        ? 'animate-pulse border-2 border-brand-600 bg-surface text-brand-700 dark:border-brand-400 dark:text-brand-300'
                        : 'border border-hairline bg-surface text-ink-muted'
                  }`}
                >
                  {state === 'complete' ? '✓' : index + 1}
                </span>
                {index < DEPLOYMENT_STAGES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={`h-0.5 flex-1 ${
                      index < activeStageIndex
                        ? 'bg-brand-600'
                        : 'bg-brand-500/25 dark:bg-brand-400/25'
                    }`}
                  />
                ) : null}
              </div>
              <span className={`truncate text-xs font-medium ${state === 'pending' ? 'text-ink-muted' : 'text-ink'}`}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="sr-only">{state}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
