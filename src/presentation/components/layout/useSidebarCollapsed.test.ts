import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSidebarCollapsed } from './useSidebarCollapsed';

describe('useSidebarCollapsed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to expanded when nothing is stored', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(false);
  });

  it('reads a previously persisted collapsed state', () => {
    window.localStorage.setItem('novy.sidebar.collapsed.v1', 'true');
    const { result } = renderHook(() => useSidebarCollapsed());
    expect(result.current.collapsed).toBe(true);
  });

  it('toggles and persists the new value', () => {
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => {
      result.current.toggle();
    });
    expect(result.current.collapsed).toBe(true);
    expect(window.localStorage.getItem('novy.sidebar.collapsed.v1')).toBe('true');

    act(() => {
      result.current.toggle();
    });
    expect(result.current.collapsed).toBe(false);
    expect(window.localStorage.getItem('novy.sidebar.collapsed.v1')).toBe('false');
  });

  it('expand() forces expanded and persists', () => {
    window.localStorage.setItem('novy.sidebar.collapsed.v1', 'true');
    const { result } = renderHook(() => useSidebarCollapsed());
    act(() => {
      result.current.expand();
    });
    expect(result.current.collapsed).toBe(false);
    expect(window.localStorage.getItem('novy.sidebar.collapsed.v1')).toBe('false');
  });
});
