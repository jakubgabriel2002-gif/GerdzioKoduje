/**
 * Minimalna obsługa Stripe bez SDK (Cloudflare Workers): Checkout Session + weryfikacja webhooka.
 */
import type { Env } from './types';

type Session = { id: string; url: string };

/** Tworzy stronę płatności Stripe Checkout dla zaliczki. */
export async function createDepositCheckout(
  env: Env,
  o: { ref: string; amountGrosze: number; email: string; company: string; successUrl: string; cancelUrl: string },
): Promise<Session> {
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('locale', 'pl');
  form.set('success_url', o.successUrl);
  form.set('cancel_url', o.cancelUrl);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'pln');
  form.set('line_items[0][price_data][unit_amount]', String(o.amountGrosze));
  form.set('line_items[0][price_data][product_data][name]', `Zaliczka 50% — wycena ${o.ref}`);
  if (o.company) form.set('line_items[0][price_data][product_data][description]', o.company.slice(0, 200));
  if (o.email) form.set('customer_email', o.email);
  form.set('client_reference_id', o.ref);
  form.set('metadata[ref]', o.ref);
  form.set('payment_intent_data[metadata][ref]', o.ref);
  form.set('payment_intent_data[description]', `Zaliczka — wycena ${o.ref}`);
  if (o.email) form.set('payment_intent_data[receipt_email]', o.email);

  const res = await fetch(`${env.STRIPE_API_BASE ?? 'https://api.stripe.com'}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Ten sam ref i kwota w ciągu tej samej minuty → ta sama sesja (ochrona przed podwójnym kliknięciem)
      'Idempotency-Key': `deposit-${o.ref}-${o.amountGrosze}-${Math.floor(Date.now() / 60000)}`,
    },
    body: form,
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url || !data.id) throw new Error(data.error?.message ?? `Stripe HTTP ${res.status}`);
  return { id: data.id, url: data.url };
}

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Porównanie w stałym czasie. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Sprawdza nagłówek Stripe-Signature: t=…,v1=… (HMAC-SHA256 z `${t}.${payload}`).
 * Odrzuca podpisy starsze niż `toleranceSec`.
 */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const signatures = header
    .split(',')
    .filter((kv) => kv.trim().startsWith('v1='))
    .map((kv) => kv.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`)));
  return signatures.some((sig) => safeEqual(sig, expected));
}
