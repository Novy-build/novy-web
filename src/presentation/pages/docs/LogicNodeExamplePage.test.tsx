import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LogicNodeExamplePage } from './LogicNodeExamplePage';

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<LogicNodeExamplePage />} path="/docs/logic-nodes/:nodeId" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LogicNodeExamplePage', () => {
  it('renders a curated guide with steps, a visual flow and a field table', () => {
    renderPage('/docs/logic-nodes/trigger-click?from=%2Fproject%2Fp1%2Feditor');

    expect(screen.getByRole('heading', { name: 'On Click', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to use it' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Visual example' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fields and options' })).toBeInTheDocument();
    expect(screen.getByText('Save a note when the button is clicked')).toBeInTheDocument();
    expect(screen.getByText('Target: Save button')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Field' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Target component' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to editor' })).toHaveAttribute('href', '/project/p1/editor');
  });

  it('renders a generated guide for nodes without curated content', () => {
    renderPage('/docs/logic-nodes/document-upload');

    expect(screen.getByRole('heading', { name: 'Document Upload', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/This guide is generated from the node’s default fields/)).toBeInTheDocument();
    expect(screen.getByText(/This is a generic example/)).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Media Reference' })).toBeInTheDocument();
  });

  it('shows a friendly fallback for unknown node ids', () => {
    renderPage('/docs/logic-nodes/no-such-node');

    expect(screen.getByRole('heading', { name: 'Logic node guide not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute('href', '/projects');
  });

  it('ignores an unsafe return url', () => {
    renderPage('/docs/logic-nodes/trigger-click?from=https%3A%2F%2Fexample.com');

    expect(screen.queryByRole('link', { name: '← Back to editor' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
  });
});
