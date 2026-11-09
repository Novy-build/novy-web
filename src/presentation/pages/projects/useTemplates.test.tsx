import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RepositoriesProvider } from '@main/providers/RepositoriesProvider';
import { useTemplates } from './useTemplates';
import { createStubRepositories } from '@test/stubRepositories';

function renderUseTemplates() {
  return renderHook(() => useTemplates(), {
    initialProps: {},
    wrapper: ({ children }) => (
      <RepositoriesProvider repositories={createStubRepositories()}>{children}</RepositoriesProvider>
    ),
  });
}

describe('useTemplates', () => {
  it('loads the full starter catalog', async () => {
    const { result } = renderUseTemplates();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const names = result.current.templates.map((template) => template.name);
    expect(names).toEqual(['Blank', 'Landing page', 'Login form', 'Student list', 'Notes CRUD app']);
  });

  it('exposes each template with a first screen to preview', async () => {
    const { result } = renderUseTemplates();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const blank = result.current.templates.find((template) => template.name === 'Blank');
    expect(blank?.screens.length).toBeGreaterThan(0);
  });
});
