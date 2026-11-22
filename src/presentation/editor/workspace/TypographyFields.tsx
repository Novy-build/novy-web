import { normalizeDesignSystem, type AppDesignSystem } from '@domain/entities/designSystem';
import type { InputTextStyle, TextFontWeight } from '@domain/entities/componentNode';
import { isTextFontWeight } from '@domain/entities/componentNode';
import { FieldHelpLabel } from '@presentation/components/ui/FieldHelp';
import { TextInput } from '@presentation/components/ui/TextInput';
import { TEXT_FONT_WEIGHT_OPTIONS } from '../renderer/nodes/textTypography';
import { FontFamilyPicker } from './FontFamilyPicker';

interface TypographyFieldsProps {
  appFonts: AppDesignSystem | undefined;
  /** Inspector control names are prefixed so Text and Input controls never collide. */
  namePrefix: string;
  note?: string;
  onChange: (patch: Partial<InputTextStyle>) => void;
  value: InputTextStyle | undefined;
}

/** Shared typography controls for authored Text widgets and Input field text. */
export function TypographyFields({
  appFonts,
  namePrefix,
  note,
  onChange,
  value,
}: TypographyFieldsProps) {
  return (
    <>
      <FontFamilyPicker
        allowAppFonts
        appFonts={normalizeDesignSystem(appFonts).typography}
        label="Font family"
        name={`${namePrefix}-font-family`}
        onChange={(fontFamily) => onChange({ fontFamily: fontFamily || undefined })}
        value={value?.fontFamily ?? ''}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextInput
          label="Font size (px)"
          max={200}
          min={8}
          name={`${namePrefix}-font-size`}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw.trim().length === 0) {
              onChange({ fontSize: undefined });
              return;
            }
            const parsed = Number(raw);
            if (Number.isFinite(parsed) && parsed > 0) onChange({ fontSize: parsed });
          }}
          placeholder="Level preset"
          step={1}
          type="number"
          value={value?.fontSize ?? ''}
        />
        <label className="grid gap-1 text-xs font-medium text-ink-muted">
          <FieldHelpLabel label="Font weight" />
          <select
            className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            onChange={(event) => {
              const next = event.target.value;
              if (!next) {
                onChange({ fontWeight: undefined });
                return;
              }
              if (isTextFontWeight(next)) onChange({ fontWeight: next as TextFontWeight });
            }}
            value={value?.fontWeight ?? ''}
          >
            <option value="">Level preset</option>
            {TEXT_FONT_WEIGHT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TextInput
          label="Line height"
          min={0.8}
          name={`${namePrefix}-line-height`}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed) && parsed > 0) onChange({ lineHeight: parsed });
          }}
          step={0.05}
          type="number"
          value={value?.lineHeight ?? 1.25}
        />
        <TextInput
          label="Letter spacing"
          name={`${namePrefix}-letter-spacing`}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) onChange({ letterSpacing: parsed });
          }}
          step={0.1}
          type="number"
          value={value?.letterSpacing ?? 0}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs font-medium text-ink-muted">
          <FieldHelpLabel label="Alignment" />
          <select
            className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            onChange={(event) => onChange({ textAlign: event.target.value as InputTextStyle['textAlign'] })}
            value={value?.textAlign ?? 'left'}
          >
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-ink-muted">
          <FieldHelpLabel label="Transform" />
          <select
            className="h-10 rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
            onChange={(event) => onChange({ textTransform: event.target.value as InputTextStyle['textTransform'] })}
            value={value?.textTransform ?? 'none'}
          >
            <option value="none">None</option><option value="uppercase">Uppercase</option><option value="lowercase">Lowercase</option><option value="capitalize">Capitalize</option>
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-ink-muted">
        <input
          checked={value?.fontStyle === 'italic'}
          onChange={(event) => onChange({ fontStyle: event.target.checked ? 'italic' : 'normal' })}
          type="checkbox"
        />
        <FieldHelpLabel label="Italic" />
      </label>
      {note ? <p className="text-xs text-ink-muted">{note}</p> : null}
    </>
  );
}
