import { describe, expect, it } from 'vitest';
import { userInitials } from './userInitials';

describe('userInitials', () => {
  it('uses the first letter of the first and last name for two-word names', () => {
    expect(userInitials('Demo User')).toBe('DU');
    expect(userInitials('Aditya Raj')).toBe('AR');
  });

  it('falls back to the first two letters for a single-word name', () => {
    expect(userInitials('Calexx')).toBe('CA');
  });

  it('handles a single character name', () => {
    expect(userInitials('a')).toBe('A');
  });

  it('returns an em dash for empty or nullish input', () => {
    expect(userInitials('')).toBe('—');
    expect(userInitials('   ')).toBe('—');
    expect(userInitials(null)).toBe('—');
    expect(userInitials(undefined)).toBe('—');
  });

  it('collapses extra whitespace between names', () => {
    expect(userInitials('  Demo   User  ')).toBe('DU');
  });
});
