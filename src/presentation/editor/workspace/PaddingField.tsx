import type { PaddingMode, PaddingValue } from '@domain/entities/componentNode';
import { resolveEdgeInsets } from '@domain/entities/componentNode';
import { TextInput } from '@presentation/components/ui/TextInput';

interface PaddingFieldProps {
  /** Base label, e.g. "Padding" or "Item padding". */
  label: string;
  /** Prefix for stable input ids/names. */
  namePrefix: string;
  value: PaddingValue;
  onChange: (padding: PaddingValue) => void;
}

const MODE_OPTIONS: ReadonlyArray<{ value: PaddingMode; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'symmetric', label: 'Symmetric' },
  { value: 'only', label: 'Only' },
];

function labelWithBase(label: string, suffix: string): string {
  const base = label.replace(/\s*padding$/i, '').trim();
  return base ? `${base} ${suffix}` : suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

function parseSide(raw: string): number | null {
  if (raw.trim().length === 0) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

/**
 * Flutter-style padding editor. The mode only changes which fields are shown;
 * all four sides stay stored so switching modes never loses values.
 */
export function PaddingField({ label, namePrefix, value, onChange }: PaddingFieldProps) {
  const edges = resolveEdgeInsets(value);

  function setMode(mode: PaddingMode): void {
    onChange({ ...edges, mode });
  }

  function setAll(raw: string): void {
    const parsed = parseSide(raw);
    if (parsed === null) return;
    onChange({ mode: 'all', top: parsed, right: parsed, bottom: parsed, left: parsed });
  }

  function setVertical(raw: string): void {
    const parsed = parseSide(raw);
    if (parsed === null) return;
    onChange({ ...edges, mode: 'symmetric', top: parsed, bottom: parsed });
  }

  function setHorizontal(raw: string): void {
    const parsed = parseSide(raw);
    if (parsed === null) return;
    onChange({ ...edges, mode: 'symmetric', left: parsed, right: parsed });
  }

  function setSide(side: keyof typeof edges, raw: string): void {
    const parsed = parseSide(raw);
    if (parsed === null) return;
    onChange({ ...edges, mode: 'only', [side]: parsed });
  }

  return (
    <div className="grid gap-2">
      <div aria-label={`${label} mode`} className="inline-flex gap-1 self-start rounded-tile bg-canvas p-0.5" role="group">
        {MODE_OPTIONS.map((option) => (
          <button
            aria-pressed={value.mode === option.value}
            className={`rounded-tile px-2.5 py-1 text-xs font-medium transition-colors ${
              value.mode === option.value ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'
            }`}
            key={option.value}
            onClick={() => setMode(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {value.mode === 'all' ? (
        <TextInput
          label={label}
          name={`${namePrefix}-all`}
          onChange={(event) => setAll(event.target.value)}
          type="number"
          value={edges.top}
        />
      ) : null}

      {value.mode === 'symmetric' ? (
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label={labelWithBase(label, 'vertical padding')}
            name={`${namePrefix}-vertical`}
            onChange={(event) => setVertical(event.target.value)}
            type="number"
            value={edges.top}
          />
          <TextInput
            label={labelWithBase(label, 'horizontal padding')}
            name={`${namePrefix}-horizontal`}
            onChange={(event) => setHorizontal(event.target.value)}
            type="number"
            value={edges.left}
          />
        </div>
      ) : null}

      {value.mode === 'only' ? (
        <div className="grid grid-cols-2 gap-2">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <TextInput
              key={side}
              label={labelWithBase(label, `${side} padding`)}
              name={`${namePrefix}-${side}`}
              onChange={(event) => setSide(side, event.target.value)}
              type="number"
              value={edges[side]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
