import { apiError, isResponse, parseJson, requireUser } from '@/lib/api';
import { getDb } from '@/lib/db/client';
import { getSettings, updateSettings } from '@/lib/db/settings';
import { settingsInputSchema } from '@/lib/validation';

export function GET(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const settings = getSettings(getDb(), user.id);
  return settings
    ? Response.json(settings)
    : apiError(404, 'NOT_FOUND', 'Settings not found');
}

export async function PATCH(request: Request) {
  const user = requireUser(request);
  if (isResponse(user)) return user;
  const input = await parseJson(request, settingsInputSchema);
  if (isResponse(input)) return input;
  const settings = updateSettings(getDb(), user.id, input);
  return settings
    ? Response.json(settings)
    : apiError(404, 'NOT_FOUND', 'Settings not found');
}
