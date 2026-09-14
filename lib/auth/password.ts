import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(pbkdf2);
export const PBKDF2_ITERATIONS = 600_000;
const KEY_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_BYTES,
    'sha256',
  );
  return `pbkdf2$sha256$${PBKDF2_ITERATIONS}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, digest, iterationsText, saltText, hashText] =
    stored.split('$');
  const iterations = Number(iterationsText);
  if (
    scheme !== 'pbkdf2' ||
    digest !== 'sha256' ||
    !Number.isSafeInteger(iterations) ||
    iterations < 1 ||
    !saltText ||
    !hashText
  )
    return false;
  try {
    const expected = Buffer.from(hashText, 'base64url');
    const actual = await derive(
      password,
      Buffer.from(saltText, 'base64url'),
      iterations,
      expected.length,
      digest,
    );
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export function needsRehash(stored: string): boolean {
  const [scheme, digest, iterations] = stored.split('$');
  return (
    scheme !== 'pbkdf2' ||
    digest !== 'sha256' ||
    Number(iterations) < PBKDF2_ITERATIONS
  );
}
