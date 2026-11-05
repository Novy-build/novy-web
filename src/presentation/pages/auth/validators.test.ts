import { describe, expect, it } from 'vitest';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateSignInCredentials,
} from './validators';

describe('validateDisplayName', () => {
  it('rejects blank names', () => {
    expect(validateDisplayName('   ')).toBe('Enter your name.');
    expect(validateDisplayName('Andrei')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('rejects blank and malformed emails', () => {
    expect(validateEmail('')).toBe('Enter your email.');
    expect(validateEmail('not-an-email')).toBe('Enter a valid email address, like you@example.com.');
    expect(validateEmail('missing@tld')).toBe('Enter a valid email address, like you@example.com.');
  });

  it('accepts normal addresses with surrounding whitespace', () => {
    expect(validateEmail('  carl@novy.app  ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires eight or more characters', () => {
    expect(validatePassword('a1')).toBe('Use at least 8 characters.');
  });

  it('requires at least one number', () => {
    expect(validatePassword('nodigits')).toBe('Include at least one number.');
  });

  it('accepts strong-enough passwords', () => {
    expect(validatePassword('novy-pass-1')).toBeNull();
  });
});

describe('validatePasswordMatch', () => {
  it('requires a confirmation value', () => {
    expect(validatePasswordMatch('pass1234', '')).toBe('Confirm your password.');
  });

  it('rejects mismatches', () => {
    expect(validatePasswordMatch('pass1234', 'pass5678')).toBe('Passwords do not match.');
  });

  it('accepts matches', () => {
    expect(validatePasswordMatch('pass1234', 'pass1234')).toBeNull();
  });
});

describe('validateSignInCredentials', () => {
  it('rejects empty sign-in fields', () => {
    expect(validateSignInCredentials('', 'password')).toBe('Enter your password.');
    expect(validateSignInCredentials('secret1', 'password')).toBeNull();
  });
});
