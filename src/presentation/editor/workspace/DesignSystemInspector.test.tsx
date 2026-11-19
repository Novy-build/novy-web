import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_DESIGN_SYSTEM } from '@domain/entities/designSystem';
import { makeScreen } from '@test/editorFixtures';
import { DesignSystemInspector } from './DesignSystemInspector';

describe('DesignSystemInspector typography', () => {
  it('uses font previews for both project font fields without permitting self-referencing app fonts', () => {
    const onAction = vi.fn();
    render(<DesignSystemInspector onAction={onAction} screen={makeScreen('home', [])} />);

    const body = screen.getByRole('combobox', { name: 'Body font stack' });
    expect(body).toHaveTextContent('Inter');
    fireEvent.click(screen.getByRole('combobox', { name: 'Heading font stack' }));
    expect(screen.queryByRole('option', { name: /App heading font/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /System Serif/ }));

    expect(onAction).toHaveBeenCalledWith({
      type: 'design/system',
      designSystem: {
        ...DEFAULT_APP_DESIGN_SYSTEM,
        typography: {
          ...DEFAULT_APP_DESIGN_SYSTEM.typography,
          headingFontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
        },
      },
    });
  });
});
