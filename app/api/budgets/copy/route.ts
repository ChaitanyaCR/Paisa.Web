import { apiError, isResponse, parseJson, requireUser } from '@/lib/api';
import { copyPreviousMonthBudgets } from '@/lib/db/budgets';
import { getDb } from '@/lib/db/client';
import { monthSchema } from '@/lib/validation';
import { z } from 'zod';

const schema = z.object({ month: monthSchema });

export async function POST(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, schema);
  if (isResponse(input)) return input;
  const copied = copyPreviousMonthBudgets(getDb(), user.id, input.month);
  return copied
    ? Response.json({ copied })
    : apiError(
        409,
        'NO_PREVIOUS_BUDGETS',
        'The previous month has no budgets to copy',
      );
}
