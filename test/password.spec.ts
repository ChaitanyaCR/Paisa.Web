import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  needsRehash,
  PBKDF2_ITERATIONS,
  verifyPassword,
} from '../lib/auth/password';

describe('password hashing', () => {
  it('uses a random salt and verifies without storing plaintext', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');
    expect(first).not.toBe(second);
    expect(first).not.toContain('correct horse');
    expect(first.split('$')[2]).toBe(String(PBKDF2_ITERATIONS));
    expect(await verifyPassword('correct horse battery staple', first)).toBe(
      true,
    );
    expect(await verifyPassword('wrong password', first)).toBe(false);
    expect(needsRehash(first)).toBe(false);
  });
});
