/**
 * POST /api/pay — tworzy płatność Stripe za zaliczkę (50%) zaakceptowanej wyceny.
 * Kwotę bierzemy z arkusza (przez Apps Script), nie od przeglądarki.
 */
import type { Env } from '../_lib/types';
import { callAppsScript } from '../_lib/forward';
import { createDepositCheckout } from '../_lib/stripe';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

type Quote = { ref: string; company: string; email: string; accepted: boolean; paid: boolean; depositGrosze: number };

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ ok: false, message: 'Płatności online nie są jeszcze włączone. Link do płatności wyślę mailem w ciągu 24 h.' }, 503);
  }
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* puste */ }
  const ref = typeof body.ref === 'string' ? body.ref.trim() : '';
  const token = typeof body.t === 'string' ? body.t.trim() : '';
  if (!/^W-\d{4}-\d{3,5}$/.test(ref) || !/^[a-f0-9]{32}$/.test(token)) {
    return json({ ok: false, message: 'Ten link jest nieprawidłowy. Użyj przycisku z maila.' }, 400);
  }

  const res = await callAppsScript(env, 'quote-get', { ref, token });
  if (!res || res.ok !== true) return json({ ok: false, message: 'Nie udało się wczytać wyceny. Spróbuj za chwilę.' }, 502);
  const q = res.quote as Quote;
  if (q.paid) return json({ ok: false, paid: true, message: 'Zaliczka jest już opłacona — dziękuję!' }, 409);
  if (!q.accepted) return json({ ok: false, message: 'Najpierw zaakceptuj wycenę.' }, 409);
  if (!(q.depositGrosze >= 200)) return json({ ok: false, message: 'Nieprawidłowa kwota zaliczki. Napisz do mnie.' }, 409);

  const origin = new URL(request.url).origin;
  const back = `${origin}/wycena/?ref=${encodeURIComponent(ref)}&t=${token}`;
  try {
    const session = await createDepositCheckout(env, {
      ref,
      amountGrosze: q.depositGrosze,
      email: q.email,
      company: q.company,
      successUrl: `${back}&paid=1`,
      cancelUrl: `${back}&a=pay`,
    });
    return json({ ok: true, url: session.url });
  } catch (err) {
    console.error('Stripe:', err);
    return json({ ok: false, message: 'Nie udało się otworzyć płatności. Spróbuj za chwilę.' }, 502);
  }
};
