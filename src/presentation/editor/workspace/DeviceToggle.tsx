import { type EditorDevice } from '../state/geometry';

const DEVICE_OPTIONS: readonly EditorDevice[] = ['mobile', 'tablet', 'desktop'];

const LABELS: Record<EditorDevice, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
};

export function DeviceToggle({
  value,
  onChange,
  label,
  testId,
}: {
  value: EditorDevice;
  onChange: (device: EditorDevice) => void;
  label: string;
  testId?: string;
}) {
  return (
    <div
      aria-label={label}
      className="flex items-center gap-1 rounded-full border border-hairline bg-surface p-0.5 shadow-md"
      data-testid={testId}
      role="group"
    >
      {DEVICE_OPTIONS.map((option) => (
        <button
          aria-pressed={value === option}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === option ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-canvas hover:text-ink'
          }`}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}