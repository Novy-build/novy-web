import { describe, expect, it } from 'vitest';
import { isDemoLoginVisible } from './demoAvailability';

describe('isDemoLoginVisible', () => {
  it('shows the demo shortcut only for development builds with demo support', () => {
    expect(isDemoLoginVisible(true, true)).toBe(true);
  });

  it.each([
    [false, true],
    [true, false],
    [false, false],
  ])('hides the demo shortcut for development=%s and supportsDemo=%s', (isDevelopment, supportsDemo) => {
    expect(isDemoLoginVisible(isDevelopment, supportsDemo)).toBe(false);
  });
});
