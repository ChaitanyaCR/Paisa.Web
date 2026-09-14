import { isResponse, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db/client';
import { exportAccountData } from '@/lib/db/export';

export function GET(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  return Response.json(exportAccountData(getDb(), user.id), {
    headers: {
      'content-disposition': 'attachment; filename="paisa-account-export.json"',
      'cache-control': 'no-store',
    },
  });
}
