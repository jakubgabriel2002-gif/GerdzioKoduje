/**
 * POST /api/lead — formularz zapytania firmowego.
 */
import type { Env } from '../_lib/types';
import { readFields, text, email, phone, url, oneOf, consent, isBot, ValidationError } from '../_lib/validate';
import { verifyTurnstile } from '../_lib/turnstile';
import { forwardToAppsScript } from '../_lib/forward';
import { respond } from '../_lib/respond';

const SUCCESS = 'Dzięki! Zapytanie dotarło. Na maila przyszło potwierdzenie — odezwę się w ciągu 24 h.';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let fields;
  try {
    fields = await readFields(request);
  } catch {
    return respond(request, false, 'Nie udało się odczytać formularza.');
  }

  // Bot wypełnił honeypot — udajemy sukces, nic nie zapisujemy.
  if (isBot(fields)) return respond(request, true, SUCCESS);

  let data: Record<string, string>;
  try {
    const hasSite = oneOf(fields, 'hasSite', ['tak', 'nie'] as const, 'nie');
    data = {
      name: text(fields, 'name', 'Imię', { required: true, max: 80 }),
      company: text(fields, 'company', 'Nazwa firmy', { required: true, max: 120 }),
      email: email(fields),
      phone: phone(fields),
      industry: text(fields, 'industry', 'Branża', { required: true, max: 80 }),
      package: text(fields, 'package', 'Pakiet', { max: 60 }) || 'Nie wiem jeszcze',
      hasSite,
      siteUrl: url(fields, 'siteUrl', 'Link do strony'),
      message: text(fields, 'message', 'Wiadomość', { required: true, min: 10, max: 3000 }),
    };
    consent(fields);
  } catch (err) {
    if (err instanceof ValidationError) return respond(request, false, err.message);
    throw err;
  }

  const human = await verifyTurnstile(env, fields['cf-turnstile-response'], request.headers.get('CF-Connecting-IP'));
  if (!human) return respond(request, false, 'Weryfikacja antyspamowa nie powiodła się. Odśwież stronę i spróbuj ponownie.', 403);

  const saved = await forwardToAppsScript(env, 'lead', data);
  if (!saved) {
    return respond(request, false, 'Nie udało się zapisać zapytania. Spróbuj za chwilę albo napisz maila (adres w stopce).', 502);
  }
  return respond(request, true, SUCCESS);
};
