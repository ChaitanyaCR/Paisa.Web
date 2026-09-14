import { isResponse, mapDbError, parseJson, requireUser } from '@/lib/api';
import { createCategory, listCategories } from '@/lib/db/categories';
import { getDb } from '@/lib/db/client';
import { categoryInputSchema } from '@/lib/validation';

export function GET(request: Request) {
  const user = requireUser(request);
  return isResponse(user)
    ? user
    : Response.json(listCategories(getDb(), user.id));
}

export async function POST(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, categoryInputSchema);
  if (isResponse(input)) return input;
  try {
    return Response.json(createCategory(getDb(), user.id, input), {
      status: 201,
    });
  } catch (error) {
    return mapDbError(error);
  }
}
