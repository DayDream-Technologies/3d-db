import { randomBytes, timingSafeEqual } from 'crypto';

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateToken(provided: string | null | undefined, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
