import {
  apiError,
  isResponse,
  mapDbError,
  parseJson,
  requireUser,
} from '@/lib/api';
import { listBudgets, saveBudget } from '@/lib/db/budgets';
import { getDb } from '@/lib/db/client';
import { budgetInputSchema, monthSchema } from '@/lib/validation';

export function GET(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const parsed = monthSchema.safeParse(
    new URL(request.url).searchParams.get('month'),
  );
  return parsed.success
    ? Response.json(listBudgets(getDb(), user.id, parsed.data))
    : apiError(422, 'VALIDATION_ERROR', 'A valid month is required');
}

export async function PUT(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, budgetInputSchema);
  if (isResponse(input)) return input;
  try {
    const result = saveBudget(getDb(), user.id, input);
    return result ? Response.json(result) : new Response(null, { status: 204 });
  } catch (error) {
    return mapDbError(error);
  }
}
