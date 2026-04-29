import { describe, it, expect } from 'vitest';
import { isValidHost, extractTokenFromUrl } from './http.js';

describe('isValidHost', () => {
  it('allows localhost', () => {
    expect(isValidHost('localhost:4242')).toBe(true);
  });

  it('allows 127.0.0.1', () => {
    expect(isValidHost('127.0.0.1:4242')).toBe(true);
  });

  it('rejects external host', () => {
    expect(isValidHost('evil.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidHost('')).toBe(false);
  });

  it('rejects localhost.evil.com', () => {
    expect(isValidHost('localhost.evil.com')).toBe(false);
  });

  it('rejects 127.0.0.10', () => {
    expect(isValidHost('127.0.0.10')).toBe(false);
  });
});

describe('extractTokenFromUrl', () => {
  it('extracts token from query string', () => {
    expect(extractTokenFromUrl('/ws?token=abc123', 'localhost:4242')).toBe('abc123');
  });

  it('returns null when token missing', () => {
    expect(extractTokenFromUrl('/ws', 'localhost:4242')).toBeNull();
  });
});
