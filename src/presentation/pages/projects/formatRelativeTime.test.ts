import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './formatRelativeTime';

const NOW = new Date('2026-01-15T12:00:00Z');

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 3_600_000);
}

describe('formatRelativeTime', () => {
  it('reports fresh saves as just now', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 10_000), NOW)).toBe('just now');
    expect(formatRelativeTime(new Date(NOW.getTime() - 44_000), NOW)).toBe('just now');
  });

  it('shows minutes and hours', () => {
    expect(formatRelativeTime(minutesAgo(1), NOW)).toBe('1m ago');
    expect(formatRelativeTime(minutesAgo(47), NOW)).toBe('47m ago');
    expect(formatRelativeTime(hoursAgo(3), NOW)).toBe('3h ago');
    expect(formatRelativeTime(hoursAgo(23), NOW)).toBe('23h ago');
  });

  it('shows days under a month', () => {
    expect(formatRelativeTime(hoursAgo(24), NOW)).toBe('1d ago');
    expect(formatRelativeTime(hoursAgo(29 * 24), NOW)).toBe('29d ago');
  });

  it('falls back to an absolute date afterwards', () => {
    const label = formatRelativeTime(hoursAgo(45 * 24), NOW);

    // 45 days before Jan 15 2026 is Dec 2025; the year in the label is stable
    // regardless of the local timezone of the machine running the test.
    expect(label).toContain('2025');
  });

  it('clamps clocks that run slightly ahead (future edits)', () => {
    const later = new Date(NOW.getTime() + 30_000);

    expect(formatRelativeTime(later, NOW)).toBe('just now');
  });
});
