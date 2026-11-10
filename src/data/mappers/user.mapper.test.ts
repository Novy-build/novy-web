import { describe, expect, it } from 'vitest';
import { mapUserDtoToEntity, parseUserDto } from './user.mapper';

describe('parseUserDto', () => {
  it('accepts a complete API user payload', () => {
    expect(parseUserDto({ id: 'user_1', displayName: 'Ada', email: 'ada@novy.app' })).toEqual({
      id: 'user_1',
      displayName: 'Ada',
      email: 'ada@novy.app',
    });
  });

  it.each([
    null,
    'user',
    {},
    { id: 1, displayName: 'Ada', email: 'ada@novy.app' },
    { id: 'user_1', email: 'ada@novy.app' },
  ])('rejects malformed payload %j', (payload) => {
    expect(() => parseUserDto(payload)).toThrow(/Invalid user payload/);
  });
});

describe('mapUserDtoToEntity', () => {
  it('maps the transport shape to the domain entity', () => {
    expect(mapUserDtoToEntity({ id: 'user_1', displayName: 'Ada', email: 'ada@novy.app' })).toEqual({
      id: 'user_1',
      displayName: 'Ada',
      email: 'ada@novy.app',
    });
  });
});
