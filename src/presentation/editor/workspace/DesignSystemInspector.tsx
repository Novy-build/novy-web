import type { AppDesignSystem, DesignColorTokenName, DesignThemePreference } from '@domain/entities/designSystem';
import {
  DEFAULT_APP_DESIGN_SYSTEM,
  DESIGN_COLOR_TOKEN_NAMES,
  normalizeDesignSystem,
} from '@domain/entities/designSystem';
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

  function update(next: AppDesignSystem): void {
    onAction({ type: 'design/system', designSystem: next });
  }

  const viewportFill = screen.viewportFill === true;
  const buttonNodes = collectButtonNodes(screen);

  return (
    <section aria-label="Inspector" className="flex-1 overflow-y-auto border-b border-hairline px-4 py-3">
      <h2 className="text-sm font-semibold text-ink">App styles</h2>
      <p className="mt-2 text-xs text-ink-muted">Project-wide tokens keep every screen and reusable style consistent.</p>

      <InspectorSection title="Default app theme">
        <label className="block text-xs text-ink-muted" htmlFor="design-default-theme">Default theme</label>
        <select
          className="mt-1 min-h-11 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink"
          id="design-default-theme"
          onChange={(event) => update({
            ...value,
            defaultTheme: event.target.value as DesignThemePreference,
          })}
          value={value.defaultTheme ?? 'system'}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <p className="mt-1 text-xs text-ink-muted">Generated apps start here; an explicit builder choice still wins.</p>
      </InspectorSection>

      <InspectorSection title="Screen layout">
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink" htmlFor="screen-viewport-fill">
          <input
            checked={viewportFill}
            className="h-4 w-4"
            id="screen-viewport-fill"
            onChange={(event) => onAction({
              type: 'screen/layout-intent',
              screenId: screen.id,
              viewportFill: event.target.checked,
              bottomAnchorNodeId: event.target.checked ? screen.bottomAnchorNodeId : undefined,
            })}
            type="checkbox"
          />
          Fill viewport height
        </label>
        <label className="mt-2 block text-xs text-ink-muted" htmlFor="screen-bottom-anchor">Bottom action</label>
        <select
          className="mt-1 min-h-11 w-full rounded-tile border border-hairline bg-surface px-2 text-sm text-ink disabled:opacity-50"
          disabled={!viewportFill || buttonNodes.length === 0}
          id="screen-bottom-anchor"
          onChange={(event) => onAction({
            type: 'screen/layout-intent',
            screenId: screen.id,
            viewportFill,
            bottomAnchorNodeId: event.target.value || undefined,
          })}
          value={screen.bottomAnchorNodeId ?? ''}
        >
          <option value="">None</option>
          {buttonNodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
        </select>
        <p className="mt-1 text-xs text-ink-muted">Anchoring uses dynamic viewport height and stays above the mobile keyboard.</p>
      </InspectorSection>

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

function collectButtonNodes(screen: Screen): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  const visit = (nodes: Screen['nodes']): void => {
    for (const node of nodes) {
      if (node.type === 'button') {
        result.push({
          id: node.id,
          label: node.name || (node.props as { label?: string }).label || node.id,
        });
      }
      if ('children' in node) visit(node.children);
    }
  };
  visit(screen.nodes);
  return result;
}
