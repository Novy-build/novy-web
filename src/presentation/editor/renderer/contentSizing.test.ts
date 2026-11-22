import { describe, expect, it } from 'vitest';
import { resolveContentSize } from './contentSizing';

describe('resolveContentSize', () => {
  it('classifies compact, small, and regular widget geometry', () => {
    expect(resolveContentSize(160, 200).tier).toBe('compact');
    expect(resolveContentSize(240, 100).tier).toBe('small');
    expect(resolveContentSize(360, 260).tier).toBe('regular');
  });

  it('guards invalid dimensions', () => {
    expect(resolveContentSize(0, -10)).toEqual({ width: 1, height: 1, tier: 'compact' });
  });
});
