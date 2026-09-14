import { checkDatabase } from '@/lib/db/health';
import { getDb } from '@/lib/db/client';

// Confirms the database is reachable and migrated. The response is intentionally
// bare: schema versions and driver errors stay in the logs rather than being
// handed to anyone who can reach the endpoint.
export function GET() {
  try {
    checkDatabase(getDb());
    return Response.json({ status: 'ok' });
  } catch (error) {
    console.error('health check failed', error);
    return Response.json({ status: 'error' }, { status: 503 });
  }
}
