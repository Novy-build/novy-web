import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentAppTheme } from './useDocumentAppTheme';

afterEach(() => document.documentElement.classList.remove('dark'));

describe('useDocumentAppTheme', () => {
  it('reads the current shell theme', () => {
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useDocumentAppTheme());

    expect(result.current).toBe('dark');
  });

  it('follows shell theme changes while the canvas stays mounted', async () => {
    const { result } = renderHook(() => useDocumentAppTheme());
    expect(result.current).toBe('light');

    act(() => document.documentElement.classList.add('dark'));
    await waitFor(() => expect(result.current).toBe('dark'));

    act(() => document.documentElement.classList.remove('dark'));
    await waitFor(() => expect(result.current).toBe('light'));
  });
});
