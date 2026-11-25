/**
 * POST /api/waitlist — zapis na listę oczekujących (Nauka).
 */
import type { Env } from '../_lib/types';
import { readFields, text, email, consent, isBot, ValidationError } from '../_lib/validate';
import { verifyTurnstile } from '../_lib/turnstile';
import { forwardToAppsScript } from '../_lib/forward';
import { respond } from '../_lib/respond';

const SUCCESS = 'Jesteś na liście! Sprawdź skrzynkę — wysłałem potwierdzenie.';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let fields;
  try {
    fields = await readFields(request);
  } catch {
    return respond(request, false, 'Nie udało się odczytać formularza.');
  }

  if (isBot(fields)) return respond(request, true, SUCCESS);

  let data: Record<string, string>;
  try {
    data = {
      email: email(fields),
      goal: text(fields, 'goal', 'Co chcesz zbudować?', { max: 1000 }),
    };
    consent(fields);
  } catch (err) {
    if (err instanceof ValidationError) return respond(request, false, err.message);
    throw err;
  }

  const human = await verifyTurnstile(env, fields['cf-turnstile-response'], request.headers.get('CF-Connecting-IP'));
  if (!human) return respond(request, false, 'Weryfikacja antyspamowa nie powiodła się. Odśwież stronę i spróbuj ponownie.', 403);

  const saved = await forwardToAppsScript(env, 'waitlist', data);
  if (!saved.ok) {
    return respond(request, false, 'Nie udało się zapisać. Spróbuj za chwilę.', 502);
  }
  return respond(request, true, SUCCESS);
};
