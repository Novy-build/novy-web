import type { AppDesignSystem, DesignColorTokenName } from '@domain/entities/designSystem';
import {
  DEFAULT_APP_DESIGN_SYSTEM,
  DESIGN_COLOR_TOKEN_NAMES,
  normalizeDesignSystem,
} from '@domain/entities/designSystem';
import { isFullScreenBackgroundNode } from '@domain/entities/componentNode';
import type { Screen } from '@domain/entities/screen';
import type { EditorAction } from '../state/editorState';
import { ColorField } from './ColorField';
import { TextInput } from '@presentation/components/ui/TextInput';
import { FontFamilyPicker } from './FontFamilyPicker';
import { InspectorSection } from './InspectorSection';

const TOKEN_LABELS: Record<DesignColorTokenName, string> = {
  primary: 'Primary',
  accent: 'Accent',
  canvas: 'Canvas',
  surface: 'Surface',
  surfaceElevated: 'Elevated surface',
  text: 'Text',
  textMuted: 'Muted text',
  border: 'Border',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
};

export function DesignSystemInspector({
  designSystem,
  screen,
  onAction,
}: {
  designSystem?: AppDesignSystem;
  screen: Screen;
  onAction: (action: EditorAction) => void;
}) {
  const value = normalizeDesignSystem(designSystem);
  const hasCoveringBackground = screen.nodes.some(isFullScreenBackgroundNode);

  function update(next: AppDesignSystem): void {
    onAction({ type: 'design/system', designSystem: next });
  }

  return (
    <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">App styles</h2>
      <p className="mt-2 text-xs text-ink-muted">Project-wide tokens keep every screen and reusable style consistent.</p>

      <InspectorSection title="Screen surface">
        <ColorField
          label="Background"
          name="screen-background"
          onChange={(backgroundColor) => onAction({
            type: 'screen/appearance',
            screenId: screen.id,
            appearance: { ...screen.appearance, backgroundColor: backgroundColor || undefined },
          })}
          placeholder="Canvas token"
          value={screen.appearance?.backgroundColor ?? ''}
        />
        <ColorField
          label="Dark background"
          name="screen-dark-background"
          onChange={(backgroundColor) => onAction({
            type: 'screen/appearance',
            screenId: screen.id,
            appearance: {
              ...screen.appearance,
              dark: { ...screen.appearance?.dark, backgroundColor: backgroundColor || undefined },
            },
          })}
          placeholder="Dark canvas token"
          value={screen.appearance?.dark?.backgroundColor ?? ''}
        />
        {hasCoveringBackground ? (
          <p className="text-xs text-ink-muted">
            A full-screen background component covers this screen. Its color is kept in sync with
            these fields, so changes are visible on the canvas.
          </p>
        ) : null}
      </InspectorSection>

      <InspectorSection title="Light theme colors">
        <div className="grid grid-cols-2 gap-2">
          {DESIGN_COLOR_TOKEN_NAMES.map((token) => (
            <ColorField
              key={token}
              label={TOKEN_LABELS[token]}
              name={`design-light-${token}`}
              onChange={(color) => update({ ...value, colors: { ...value.colors, [token]: color || DEFAULT_APP_DESIGN_SYSTEM.colors[token] } })}
              value={value.colors[token]}
            />
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Dark theme colors">
        <div className="grid grid-cols-2 gap-2">
          {DESIGN_COLOR_TOKEN_NAMES.map((token) => (
            <ColorField
              key={token}
              label={TOKEN_LABELS[token]}
              name={`design-dark-${token}`}
              onChange={(color) => update({ ...value, darkColors: { ...value.darkColors, [token]: color || DEFAULT_APP_DESIGN_SYSTEM.darkColors[token] } })}
              value={value.darkColors[token]}
            />
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Typography">
        <FontFamilyPicker
          appFonts={value.typography}
          label="Body font stack"
          name="design-body-font"
          onChange={(bodyFontFamily) => update({ ...value, typography: { ...value.typography, bodyFontFamily } })}
          value={value.typography.bodyFontFamily}
        />
        <FontFamilyPicker
          appFonts={value.typography}
          label="Heading font stack"
          name="design-heading-font"
          onChange={(headingFontFamily) => update({ ...value, typography: { ...value.typography, headingFontFamily } })}
          value={value.typography.headingFontFamily}
        />
        <p className="text-xs text-ink-muted">Use local, system, or bundled font stacks. Export never depends on an external font CDN.</p>
      </InspectorSection>

      <InspectorSection title="Radius presets">
        <div className="grid grid-cols-2 gap-2">
          {(['small', 'medium', 'large', 'pill'] as const).map((token) => (
            <TextInput
              key={token}
              label={token[0].toUpperCase() + token.slice(1)}
              min={0}
              name={`design-radius-${token}`}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed) && parsed >= 0) update({ ...value, radii: { ...value.radii, [token]: parsed } });
              }}
              type="number"
              value={value.radii[token]}
            />
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Reusable styles">
        <p className="text-xs text-ink-muted">{value.styles.length} saved style{value.styles.length === 1 ? '' : 's'}. Select a component to create, apply, update, or detach styles.</p>
      </InspectorSection>
    </section>
  );
}
