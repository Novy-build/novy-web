import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ValidationReport } from '@domain/validation/projectValidation';
import { ValidationPanel } from './ValidationPanel';

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

describe('ValidationPanel', () => {
  it('uses a theme-safe issue surface and selects the issue', () => {
    const onIssueSelect = vi.fn();
    render(<ValidationPanel onIssueSelect={onIssueSelect} report={report} />);

    const issue = screen.getByRole('button', { name: /Target component is missing/ });
    expect(issue).toHaveClass('bg-surface', 'hover:bg-brand-500/10');
    fireEvent.click(issue);
    expect(onIssueSelect).toHaveBeenCalledWith(report.issues[0]);
  });
});
