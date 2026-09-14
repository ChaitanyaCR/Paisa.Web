import { z, type ZodType } from 'zod';
import { getDb } from '@/lib/db/client';
import { findSessionUser } from '@/lib/db/sessions';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  mustChangePassword: boolean;
};

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export function requireUser(
  request: Request,
  options: { allowPasswordChangeRequired?: boolean } = {},
): ApiUser | Response {
  const token = sessionToken(request);
  if (!token)
    return apiError(401, 'UNAUTHENTICATED', 'Authentication required');
  const user = findSessionUser(getDb(), token);
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Authentication required');
  if (user.mustChangePassword && !options.allowPasswordChangeRequired)
    return apiError(
      403,
      'PASSWORD_CHANGE_REQUIRED',
      'You must change your temporary password',
    );
  return user;
}

export function sessionToken(request: Request): string | undefined {
  const cookie = request.headers.get('cookie') ?? '';
  const token = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('session='))
    ?.slice(8);
  return token ? decodeURIComponent(token) : undefined;
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T | Response> {
  try {
    const result = schema.safeParse(await request.json());
    return result.success
      ? result.data
      : apiError(
          422,
          'VALIDATION_ERROR',
          'Invalid request',
          z.treeifyError(result.error),
        );
  } catch {
    return apiError(422, 'VALIDATION_ERROR', 'Request body must be valid JSON');
  }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export function mapDbError(error: unknown): Response {
  const message = error instanceof Error ? error.message : '';
  if (message === 'CATEGORY_NOT_FOUND')
    return apiError(
      422,
      'INVALID_CATEGORY',
      'Category does not exist or cannot be used',
    );
  if (message === 'CATEGORY_IN_USE')
    return apiError(
      409,
      'CATEGORY_IN_USE',
      'Archive this category instead; it is used by transactions or budgets',
    );
  if (message.includes('categories_user_type_name'))
    return apiError(
      422,
      'DUPLICATE_CATEGORY',
      'A category with this name and type already exists',
    );
  if (message.includes('constraint'))
    return apiError(
      422,
      'CONSTRAINT_ERROR',
      'The request violates a data constraint',
    );
  console.error('api operation failed', error);
  return apiError(500, 'INTERNAL_ERROR', 'The request could not be completed');
}

export function forbiddenOrNotFound(
  ownerId: string | undefined,
  userId: string,
) {
  return ownerId && ownerId !== userId
    ? apiError(403, 'FORBIDDEN', 'This resource belongs to another user')
    : apiError(404, 'NOT_FOUND', 'Resource not found');
}
