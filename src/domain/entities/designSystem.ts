import type {
  ComponentAppearance,
  ComponentType,
  TextProps,
} from './componentNode';

export const DESIGN_COLOR_TOKEN_NAMES = [
  'primary',
  'accent',
  'canvas',
  'surface',
  'surfaceElevated',
  'text',
  'textMuted',
  'border',
  'success',
  'warning',
  'danger',
] as const;

export type DesignColorTokenName = (typeof DESIGN_COLOR_TOKEN_NAMES)[number];

export type DesignColorPalette = Record<DesignColorTokenName, string>;

export interface DesignTypographyTokens {
  bodyFontFamily: string;
  headingFontFamily: string;
}

export interface DesignRadiusTokens {
  small: number;
  medium: number;
  large: number;
  pill: number;
}

export type DesignThemePreference = 'light' | 'dark' | 'system';

export interface NamedComponentStyle {
  id: string;
  name: string;
  componentType: ComponentType;
  appearance?: ComponentAppearance;
  /** Text-only values are ignored when the style is applied to another type. */
  textStyle?: Partial<Omit<TextProps, 'text' | 'level'>>;
}

export interface AppDesignSystem {
  colors: DesignColorPalette;
  darkColors: DesignColorPalette;
  typography: DesignTypographyTokens;
  radii: DesignRadiusTokens;
  styles: NamedComponentStyle[];
  /** Project-level default for generated and previewed apps. Legacy documents omit it. */
  defaultTheme?: DesignThemePreference;
}

export const DEFAULT_APP_DESIGN_SYSTEM: AppDesignSystem = {
  colors: {
    primary: '#5551f2',
    accent: '#ec4899',
    canvas: '#f5f6f8',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#0e1013',
    textMuted: '#565b66',
    border: '#e5e6ea',
    success: '#0ea974',
    warning: '#d97706',
    danger: '#dc2626',
  },
  darkColors: {
    primary: '#8a86ff',
    accent: '#f472b6',
    canvas: '#0b0d11',
    surface: '#15181e',
    surfaceElevated: '#1a1e25',
    text: '#eef0f4',
    textMuted: '#aeb4c0',
    border: '#262a33',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
  },
  typography: {
    bodyFontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter Variable, Inter, system-ui, sans-serif',
  },
  radii: { small: 6, medium: 12, large: 24, pill: 999 },
  styles: [],
  defaultTheme: 'system',
};

export function normalizeDesignSystem(value: AppDesignSystem | undefined): AppDesignSystem {
  if (!value) return structuredClone(DEFAULT_APP_DESIGN_SYSTEM);
  return {
    colors: { ...DEFAULT_APP_DESIGN_SYSTEM.colors, ...value.colors },
    darkColors: { ...DEFAULT_APP_DESIGN_SYSTEM.darkColors, ...value.darkColors },
    typography: { ...DEFAULT_APP_DESIGN_SYSTEM.typography, ...value.typography },
    radii: { ...DEFAULT_APP_DESIGN_SYSTEM.radii, ...value.radii },
    styles: Array.isArray(value.styles) ? structuredClone(value.styles) : [],
    defaultTheme: (
      value.defaultTheme === 'light'
      || value.defaultTheme === 'dark'
      || value.defaultTheme === 'system'
    ) ? value.defaultTheme : 'system',
  };
}

export function colorTokenCssValue(token: DesignColorTokenName): string {
  return `var(--novy-app-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)})`;
}

export function designSystemCssVariables(
  designSystem: AppDesignSystem | undefined,
  dark: boolean,
): Record<string, string> {
  const normalized = normalizeDesignSystem(designSystem);
  const palette = dark ? normalized.darkColors : normalized.colors;
  return {
    '--novy-app-primary': palette.primary,
    '--novy-app-accent': palette.accent,
    '--novy-app-canvas': palette.canvas,
    '--novy-app-surface': palette.surface,
    '--novy-app-surface-elevated': palette.surfaceElevated,
    '--novy-app-text': palette.text,
    '--novy-app-text-muted': palette.textMuted,
    '--novy-app-border': palette.border,
    '--novy-app-success': palette.success,
    '--novy-app-warning': palette.warning,
    '--novy-app-danger': palette.danger,
    '--novy-app-font-body': normalized.typography.bodyFontFamily,
    '--novy-app-font-heading': normalized.typography.headingFontFamily,
    '--novy-app-radius-sm': `${normalized.radii.small}px`,
    '--novy-app-radius-md': `${normalized.radii.medium}px`,
    '--novy-app-radius-lg': `${normalized.radii.large}px`,
    '--novy-app-radius-pill': `${normalized.radii.pill}px`,
  };
}

export function findNamedStyle(
  designSystem: AppDesignSystem | undefined,
  styleId: string | undefined,
): NamedComponentStyle | undefined {
  return styleId ? designSystem?.styles.find((style) => style.id === styleId) : undefined;
}
