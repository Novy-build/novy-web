import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_DESIGN_SYSTEM } from '@domain/entities/designSystem';
import { FieldHelpEnvironmentContext } from '@presentation/components/ui/FieldHelp';
import { makeScreen } from '@test/editorFixtures';
import { DesignSystemInspector } from './DesignSystemInspector';

describe('DesignSystemInspector field help', () => {
  it('offers curated help for the screen surface fields', () => {
    render(
      <FieldHelpEnvironmentContext.Provider value={{ editor: 'design', onAskNovy: vi.fn() }}>
        <DesignSystemInspector onAction={vi.fn()} screen={makeScreen('home', [])} />
      </FieldHelpEnvironmentContext.Provider>,
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'About Background' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('base fill of the screen');
    expect(screen.getByRole('button', { name: 'About Dark background' })).toBeInTheDocument();
  });
});

describe('DesignSystemInspector screen surface', () => {
  it('explains that a full-screen background component is kept in sync', () => {
    const homeScreen = makeScreen('home', [{
      id: 'background', type: 'container', x: 0, y: 0, w: 390, h: 780, props: {}, children: [],
      appearance: { backgroundColor: '#eef0f7' },
    }]);

    render(<DesignSystemInspector onAction={vi.fn()} screen={homeScreen} />);

    expect(document.body.textContent).toContain('full-screen background component');
  });
});

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
