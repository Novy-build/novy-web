import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValidationReport } from '@domain/validation/projectValidation';
import { ValidationDock } from './ValidationDock';

const report: ValidationReport = {
  isValid: false,
  issues: [{
    id: 'missing-target-1',
    code: 'logic-missing-target',
    severity: 'error',
    area: 'logic',
    message: 'Target component is missing.',
    screenId: 'screen_home',
  }],
};

describe('ValidationDock', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('toggles the panel from the header disclosure control', () => {
    const onToggle = vi.fn();
    render(
      <ValidationDock
        isOpen={false}
        onCollapse={vi.fn()}
        onToggle={onToggle}
        report={report}
      />,
    );

    const header = screen.getByRole('button', { name: /validation/i });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Validation', { selector: 'section' })).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows issues when open and forwards issue selection', () => {
    const onIssueSelect = vi.fn();
    render(
      <ValidationDock
        isOpen
        onCollapse={vi.fn()}
        onIssueSelect={onIssueSelect}
        onToggle={vi.fn()}
        report={report}
      />,
    );

    expect(screen.getByRole('button', { name: /validation/i })).toHaveAttribute('aria-expanded', 'true');
    const issue = screen.getByRole('button', { name: /Target component is missing/ });
    fireEvent.click(issue);
    expect(onIssueSelect).toHaveBeenCalledWith(report.issues[0]);
  });

  it('minimizes when the splitter is dragged below the minimum height', () => {
    const onCollapse = vi.fn();
    render(
      <ValidationDock
        isOpen
        onCollapse={onCollapse}
        onToggle={vi.fn()}
        report={report}
      />,
    );

    const handle = screen.getByRole('separator', { name: 'Resize validation panel' });
    fireEvent.pointerDown(handle, { button: 0, clientY: 300 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 500 }));
    });

    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel open when the splitter stays above the minimum', () => {
    const onCollapse = vi.fn();
    render(
      <ValidationDock
        isOpen
        onCollapse={onCollapse}
        onToggle={vi.fn()}
        report={report}
      />,
    );

    const handle = screen.getByRole('separator', { name: 'Resize validation panel' });
    fireEvent.pointerDown(handle, { button: 0, clientY: 300 });
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 340 }));
    });

    expect(onCollapse).not.toHaveBeenCalled();
    expect(handle).toHaveAttribute('aria-valuenow', '160');
  });
});
