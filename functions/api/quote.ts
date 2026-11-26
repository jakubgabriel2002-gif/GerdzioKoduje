/**
 * POST /api/quote — strona /wycena:
 *  - action "get"                         → szczegóły wyceny do wyświetlenia,
 *  - action "accept" | "negotiate" | "reject" → zapis decyzji klienta.
 * Link z maila zawiera numer wyceny (ref) i podpis (t), który sprawdza Apps Script.
 */
import type { Env } from '../_lib/types';
import { callAppsScript } from '../_lib/forward';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const ERRORS: Record<string, string> = {
  bad_link: 'Ten link jest nieprawidłowy. Użyj przycisku z maila z wyceną.',
  not_found: 'Nie znalazłem tej wyceny. Odpowiedz na maila z wyceną, a wszystko wyjaśnimy.',
  not_sent: 'Ta wycena nie została jeszcze wysłana.',
  closed: 'Na tę wycenę udzielono już odpowiedzi.',
  expired: 'Ta wycena wygasła. Wybierz „Chcę negocjować” albo odpowiedz na maila — przygotuję aktualną.',
  bad_action: 'Nieznana akcja.',
  terms: 'Żeby zaakceptować wycenę, zaznacz akceptację regulaminu.',
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: 'Nieprawidłowe żądanie.' }, 400);
  }
  const str = (k: string, max: number) => (typeof body[k] === 'string' ? (body[k] as string).trim().slice(0, max) : '');
  const ref = str('ref', 20);
  const token = str('t', 64);
  const action = str('action', 12);

  if (!/^W-\d{4}-\d{3,5}$/.test(ref) || !/^[a-f0-9]{32}$/.test(token)) {
    return json({ ok: false, message: ERRORS.bad_link }, 400);
  }
  if (!['get', 'accept', 'negotiate', 'reject'].includes(action)) {
    return json({ ok: false, message: ERRORS.bad_action }, 400);
  }
  // Honeypot
  if (str('website', 200)) return json({ ok: true });
  // Akceptacja wymaga zgody na regulamin — zapisujemy ją w komentarzu klienta (arkusz)
  if (action === 'accept' && str('terms', 5) !== 'tak') {
    return json({ ok: false, error: 'terms', message: ERRORS.terms }, 400);
  }
  const termsNote =
    action === 'accept'
      ? `Regulamin (wersja ${str('termsVersion', 20) || '?'}) zaakceptowany; żądanie rozpoczęcia prac przed upływem 14 dni.`
      : '';

  const res =
    action === 'get'
      ? await callAppsScript(env, 'quote-get', { ref, token })
      : await callAppsScript(env, 'quote-response', {
          ref,
          token,
          action,
          message: [termsNote, str('message', 2000)].filter(Boolean).join('\n'),
          price: str('price', 40),
        });

  if (!res) return json({ ok: false, message: 'Nie udało się połączyć. Spróbuj za chwilę.' }, 502);
  if (res.ok !== true) {
    const code = String(res.error ?? '');
    return json({ ok: false, error: code, status: res.status ?? null, message: ERRORS[code] ?? 'Coś poszło nie tak. Spróbuj za chwilę.' }, 400);
  }
  // Strona /wycena: czy pokazać przycisk płatności online
  return json({ ...res, payments: Boolean(env.STRIPE_SECRET_KEY) });
};
