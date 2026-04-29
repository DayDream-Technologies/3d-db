import { describe, it, expect } from 'vitest';
import { generateToken, validateToken } from './token.js';

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('returns a unique token each call', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe('validateToken', () => {
  it('returns true for matching token', () => {
    const t = generateToken();
    expect(validateToken(t, t)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateToken(null, generateToken())).toBe(false);
  });

  it('returns false for wrong token (correct length, wrong value)', () => {
    const expected = generateToken();
    const wrong = generateToken(); // different 64-char token
    expect(validateToken(wrong, expected)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateToken('', generateToken())).toBe(false);
  });
});
