import {
  apiError,
  isResponse,
  mapDbError,
  parseJson,
  requireUser,
} from '@/lib/api';
import { getDb } from '@/lib/db/client';
import { createTransaction, listTransactions } from '@/lib/db/transactions';
import {
  transactionFiltersSchema,
  transactionInputSchema,
} from '@/lib/validation';
import { z } from 'zod';

export function GET(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const url = new URL(request.url);
  const parsed = transactionFiltersSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success)
    return apiError(
      422,
      'VALIDATION_ERROR',
      'Invalid filters',
      z.treeifyError(parsed.error),
    );
  return Response.json(listTransactions(getDb(), user.id, parsed.data));
}

export async function POST(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, transactionInputSchema);
  if (isResponse(input)) return input;
  try {
    return Response.json(createTransaction(getDb(), user.id, input), {
      status: 201,
    });
  } catch (error) {
    return mapDbError(error);
  }
}
