import {
  forbiddenOrNotFound,
  isResponse,
  mapDbError,
  parseJson,
  requireUser,
} from '@/lib/api';
import {
  categoryOwner,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from '@/lib/db/categories';
import { getDb } from '@/lib/db/client';
import { categoryUpdateSchema } from '@/lib/validation';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> | { id: string } };

// PATCH multiplexes two operations. `categoryUpdateSchema` strips unknown keys
// and rejects an empty patch, so an `{ archived }` body can only match the first
// member — the union is unambiguous and the body is read exactly once.
const archiveSchema = z.object({ archived: z.boolean() });
const patchSchema = z.union([archiveSchema, categoryUpdateSchema]);

export async function PATCH(request: Request, context: Context) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, patchSchema);
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

export async function DELETE(request: Request, context: Context) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const { id } = await Promise.resolve(context.params);
  try {
    return deleteCategory(getDb(), user.id, id)
      ? new Response(null, { status: 204 })
      : forbiddenOrNotFound(categoryOwner(getDb(), id), user.id);
  } catch (error) {
    return mapDbError(error);
  }
}
