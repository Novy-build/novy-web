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

  it('shows the issue code and available context', () => {
    const detailed: ValidationReport = {
      isValid: false,
      issues: [{
        id: 'binding-1',
        code: 'component-binding-field',
        severity: 'error',
        area: 'data',
        message: 'Item binding references field “missing”, which is not available in notes-collection.',
        screenId: 'screen_home',
        componentId: 'text_title',
        fieldId: 'missing',
        bindingTarget: 'text.content',
        collectionId: 'notes_collection',
      }],
    };
    render(<ValidationPanel report={detailed} />);

    const issue = screen.getByRole('button', { name: /Item binding references field/ });
    for (const detail of [
      'Code: component-binding-field', 'Area: data', 'Screen: screen_home',
      'Component: text_title', 'Field: missing', 'Target: text.content', 'Collection: notes_collection',
    ]) {
      expect(issue).toHaveTextContent(detail);
    }
  });
});
