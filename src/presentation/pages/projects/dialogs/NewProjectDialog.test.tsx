import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TEMPLATE_CATALOG } from '@data/templates/templateCatalog';
import { NewProjectDialog } from './NewProjectDialog';

describe('NewProjectDialog', () => {
  it('filters templates by project type and creates a website', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<NewProjectDialog onCancel={vi.fn()} onCreate={onCreate} templates={TEMPLATE_CATALOG} />);

    fireEvent.click(screen.getByRole('button', { name: 'Website' }));

    expect(screen.getByRole('heading', { name: 'Choose a website template' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Blank canvas/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Landing page/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Notes CRUD app/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Acme site' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    await vi.waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0]?.[0]).toBe('Acme site');
    expect(onCreate.mock.calls[0]?.[1].projectType).toBe('website');
  });

  it('returns to the project type step', () => {
    render(<NewProjectDialog onCancel={vi.fn()} onCreate={vi.fn()} templates={TEMPLATE_CATALOG} />);
    fireEvent.click(screen.getByRole('button', { name: 'Web app' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change project type' }));
    expect(screen.getByRole('heading', { name: 'What do you want to build?' })).toBeInTheDocument();
  });
});
