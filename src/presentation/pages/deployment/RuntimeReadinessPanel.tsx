import type { RuntimeRequirementDTO } from '@data/dto/generatedApp.dto';
import { Button } from '@presentation/components/ui/Button';

const CAPABILITY_LABELS: Readonly<Record<RuntimeRequirementDTO['capability'], string>> = {
  authentication: 'Authentication session',
  database: 'Project database',
  email: 'Email delivery',
  rag: 'RAG knowledge index',
  'computer-vision': 'Computer Vision / biometrics',
  camera: 'Browser camera permission',
  deployment: 'Deployment provider',
};

export function RuntimeReadinessPanel({
  requirements,
  onExport,
  onDownloadReact,
  isDownloading,
  downloadError,
}: {
  requirements: readonly RuntimeRequirementDTO[];
  onExport: () => void;
  onDownloadReact: () => void;
  isDownloading: boolean;
  downloadError: string | null;
}) {
  return (
    <section className="rounded-panel border border-hairline bg-surface p-5" aria-labelledby="runtime-readiness-title">
      <h2 className="text-base font-semibold text-ink" id="runtime-readiness-title">Backend handoff</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Runtime requirements inferred from the project JSON. Provider credentials remain backend-owned.
      </p>
      <ul className="mt-4 grid gap-2">
        {requirements.map((requirement) => (
          <li className="flex items-center justify-between gap-3 rounded-tile bg-canvas px-3 py-2" key={requirement.capability}>
            <span className="text-sm font-medium text-ink">{CAPABILITY_LABELS[requirement.capability]}</span>
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
              {requirement.configurationOwner === 'backend' ? 'Backend required' : 'Browser permission'}
            </span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-4"
        disabled={isDownloading}
        isBlock
        isLoading={isDownloading}
        onClick={onDownloadReact}
      >
        {isDownloading ? 'Generating React app…' : 'Download React app'}
      </Button>
      {downloadError ? (
        <p
          className="mt-2 rounded-tile border border-signal-invalid/30 bg-signal-invalid/5 p-2 text-xs text-signal-invalid"
          role="alert"
        >
          {downloadError}
        </p>
      ) : null}
      <Button className="mt-2" isBlock onClick={onExport} variant="ghost">
        Export backend handoff
      </Button>
      <p className="mt-2 text-xs text-ink-muted">
        React export creates an editable Vite project with client workflows and the secure Novy
        runtime client. Configure its runtime base URL for CRUD and email actions. The diagnostics
        handoff excludes records and secrets.
      </p>
    </section>
  );
}
