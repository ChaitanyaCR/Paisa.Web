import {
  forbiddenOrNotFound,
  isResponse,
  mapDbError,
  parseJson,
  requireUser,
} from '@/lib/api';
import { getDb } from '@/lib/db/client';
import {
  deleteTransaction,
  transactionOwner,
  updateTransaction,
} from '@/lib/db/transactions';
import { transactionInputSchema } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> | { id: string } };
const params = async (context: Context) => Promise.resolve(context.params);

export async function PUT(request: Request, context: Context) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, transactionInputSchema);
  if (isResponse(input)) return input;
  const { id } = await params(context);
  try {
    const result = updateTransaction(getDb(), user.id, id, input);
    return result
      ? Response.json(result)
      : forbiddenOrNotFound(transactionOwner(getDb(), id), user.id);
  } catch (error) {
    return mapDbError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const { id } = await params(context);
  return deleteTransaction(getDb(), user.id, id)
    ? new Response(null, { status: 204 })
    : forbiddenOrNotFound(transactionOwner(getDb(), id), user.id);
}
