import type { CSSProperties } from 'react';
import type { ComponentAppearance, FieldStyle } from '@domain/entities/componentNode';

/** Shared visual treatment for interactive form controls in editor previews. */
export function fieldStyleClass(fieldStyle: FieldStyle | undefined): string {
  return `novy-field novy-field-${fieldStyle ?? 'outline'}`;
}

function borderSideStyles(
  appearance: ComponentAppearance | undefined,
  borderStyle: 'solid' | 'dashed' | 'none' | undefined,
  hasVisibleBorder: boolean,
): CSSProperties {
  if (!appearance?.borderSides) return {};
  const sharedWidth = hasVisibleBorder
    ? appearance.borderWidth ?? 1
    : borderStyle === 'none' ? 0 : undefined;
  const sharedColor = hasVisibleBorder
    ? appearance.borderColor ?? 'var(--novy-hairline)'
    : undefined;
  const sideCss = (side: 'top' | 'right' | 'bottom' | 'left'): CSSProperties => {
    const custom = appearance.borderSides?.[side];
    if (!custom) return {};
    const cap = side[0].toUpperCase() + side.slice(1);
    const style = custom.style ?? borderStyle;
    if (style === 'none') {
      return { [`border${cap}Style`]: 'none', [`border${cap}Width`]: 0 } as CSSProperties;
    }
    const css: Record<string, string | number> = { [`border${cap}Style`]: style ?? 'solid' };
    if (custom.width !== undefined) css[`border${cap}Width`] = custom.width;
    else if (sharedWidth !== undefined) css[`border${cap}Width`] = sharedWidth;
    if (custom.color !== undefined) css[`border${cap}Color`] = custom.color;
    else if (sharedColor !== undefined) css[`border${cap}Color`] = sharedColor;
    return css as CSSProperties;
  };
  return {
    ...sideCss('top'),
    ...sideCss('right'),
    ...sideCss('bottom'),
    ...sideCss('left'),
  };
}

export function fieldStyleCss(
  appearance: ComponentAppearance | undefined,
  fieldStyle: FieldStyle | undefined,
): CSSProperties {
  if (!appearance && !fieldStyle) return {};
  const borderStyle = appearance?.borderStyle
    ?? (appearance?.borderColor ? 'solid' : undefined);
  const hasVisibleBorder = borderStyle === 'solid' || borderStyle === 'dashed';
  const base: CSSProperties = {
    backgroundColor: appearance?.backgroundColor || undefined,
    borderColor: hasVisibleBorder ? appearance?.borderColor || 'var(--novy-hairline)' : undefined,
    borderStyle,
    borderWidth: hasVisibleBorder
      ? appearance?.borderWidth ?? 1
      : borderStyle === 'none' ? 0 : undefined,
    ...borderSideStyles(appearance, borderStyle, hasVisibleBorder),
    borderRadius: appearance?.borderRadius,
    color: appearance?.textColor || undefined,
    opacity: appearance?.opacity,
    boxShadow: appearance?.boxShadows?.map((shadow) =>
      `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`).join(', ') || undefined,
  };
  if (fieldStyle === 'underline') {
    return {
      ...base,
      backgroundColor: 'transparent',
      borderStyle: 'none',
      borderWidth: 0,
      borderBottomStyle: 'solid',
      borderBottomWidth: appearance?.borderSides?.bottom?.width ?? appearance?.borderWidth ?? 1,
      borderBottomColor: appearance?.borderSides?.bottom?.color ?? appearance?.borderColor ?? 'var(--novy-hairline)',
      borderRadius: 0,
      paddingLeft: 0,
      paddingRight: 0,
    };
  }
  if (fieldStyle === 'filled') {
    return {
      ...base,
      borderStyle: 'none',
      borderWidth: 0,
      backgroundColor: appearance?.backgroundColor || 'var(--novy-surface-elevated)',
    };
  }
  return base;
}
