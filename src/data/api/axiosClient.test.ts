import { describe, expect, it } from 'vitest';
import { axiosClient } from './axiosClient';

describe('axiosClient', () => {
  it('sends browser credentials with every request', () => {
    expect(axiosClient.defaults.withCredentials).toBe(true);
  });
});
