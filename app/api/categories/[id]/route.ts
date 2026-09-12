import {
  forbiddenOrNotFound,
  isResponse,
  mapDbError,
  parseJson,
  requireUser,
} from '@/lib/api';
import {
  categoryOwner,
  setCategoryArchived,
  updateCategory,
} from '@/lib/db/categories';
import { getDb } from '@/lib/db/client';
import { categoryUpdateSchema } from '@/lib/validation';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> | { id: string } };
const archiveSchema = z.object({ archived: z.boolean() });

export async function PATCH(request: Request, context: Context) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const body: unknown = await request
    .clone()
    .json()
    .catch(() => undefined);
  const archive = archiveSchema.safeParse(body);
  const input = archive.success
    ? archive.data
    : await parseJson(request, categoryUpdateSchema);
  if (isResponse(input)) return input;
  const { id } = await Promise.resolve(context.params);
  try {
    const result =
      'archived' in input
        ? setCategoryArchived(getDb(), user.id, id, input.archived)
        : updateCategory(getDb(), user.id, id, input);
    return result
      ? Response.json(result)
      : forbiddenOrNotFound(categoryOwner(getDb(), id), user.id);
  } catch (error) {
    return mapDbError(error);
  }
}
