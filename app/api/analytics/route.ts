import { apiError, isResponse, requireUser } from '@/lib/api';
import { getAnalytics } from '@/lib/db/analytics';
import { getDb } from '@/lib/db/client';
import { monthSchema, transactionFiltersSchema } from '@/lib/validation';
import { z } from 'zod';

const analyticsQuery = transactionFiltersSchema.extend({
  period: z.enum(['month', 'year', 'custom']),
  month: monthSchema,
});

export function GET(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const parsed = analyticsQuery.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return apiError(
      422,
      'VALIDATION_ERROR',
      'Invalid analytics filters',
      z.treeifyError(parsed.error),
    );
  const { period, month, ...filters } = parsed.data;
  return Response.json(
    getAnalytics(
      getDb(),
      user.id,
      filters,
      period,
      month,
      filters.from ?? `${month}-01`,
      filters.to ?? `${month}-01`,
    ),
  );
}
