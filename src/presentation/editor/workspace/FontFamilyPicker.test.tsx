import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FontFamilyPicker } from './FontFamilyPicker';

describe('FontFamilyPicker', () => {
  it('previews curated fonts and selects one with the keyboard', () => {
    const onChange = vi.fn();
    render(<FontFamilyPicker allowAppFonts label="Font family" name="font" onChange={onChange} value="" />);

    const picker = screen.getByRole('combobox', { name: 'Font family' });
    expect(picker).toHaveTextContent('Default app font');
    fireEvent.keyDown(picker, { key: 'Enter' });
    fireEvent.keyDown(picker, { key: 'End' });
    fireEvent.keyDown(picker, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith("ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace");
  });

  it('preserves and previews an unknown saved font until a curated option is chosen', () => {
    render(<FontFamilyPicker label="Body font" name="body-font" onChange={vi.fn()} value="'Legacy Font', serif" />);

    const picker = screen.getByRole('combobox', { name: 'Body font' });
    expect(picker).toHaveTextContent('Custom saved font');
    expect(picker).toHaveStyle({ fontFamily: "'Legacy Font', serif" });
    expect(screen.getByText(/preserved until you choose/i)).toBeInTheDocument();
  });

  it('announces the active preview, supports Escape, and dismisses outside pointer interactions', () => {
    const onChange = vi.fn();
    render(<FontFamilyPicker allowAppFonts label="Font family" name="font" onChange={onChange} value="" />);
    const picker = screen.getByRole('combobox', { name: 'Font family' });
    picker.focus();
    fireEvent.keyDown(picker, { key: 'ArrowDown' });
    fireEvent.keyDown(picker, { key: 'j' });
    const active = document.getElementById(picker.getAttribute('aria-activedescendant') ?? '');
    expect(active).toHaveTextContent('JetBrains Mono');
    expect(active).toHaveStyle({ fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace" });
    fireEvent.keyDown(picker, { key: 'Escape' });
    expect(picker).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(picker);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
