/**
 * POST /api/stripe-webhook — Stripe informuje o opłaconej zaliczce.
 * Sprawdzamy podpis (STRIPE_WEBHOOK_SECRET), potem zapisujemy wpłatę w arkuszu przez Apps Script.
 * Zdarzenia: checkout.session.completed, checkout.session.async_payment_succeeded.
 */
import type { Env } from '../_lib/types';
import { callAppsScript } from '../_lib/forward';
import { verifyStripeSignature } from '../_lib/stripe';

type CheckoutSession = {
  id: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string>;
  client_reference_id?: string | null;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('Webhook nieskonfigurowany', { status: 503 });
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response('Zły podpis', { status: 400 });

  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return new Response('ignored', { status: 200 });
  }
  const s = event.data.object;
  if (s.payment_status !== 'paid') return new Response('not paid yet', { status: 200 }); // np. przelew w toku
  const ref = s.metadata?.ref ?? s.client_reference_id ?? '';
  if (!ref) return new Response('no ref', { status: 200 });

  const res = await callAppsScript(env, 'quote-paid', {
    ref,
    amount: String((s.amount_total ?? 0) / 100),
    sessionId: s.id,
    paymentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.id,
  });
  // Błąd → 500, żeby Stripe ponowił próbę później
  if (!res || res.ok !== true) return new Response('apps script error', { status: 500 });
  return new Response('ok', { status: 200 });
};

/**
 * GET — podgląd w przeglądarce: pokazuje, że endpoint działa i czy sekret jest ustawiony.
 * (Stripe wysyła powiadomienia metodą POST — ta odpowiedź służy tylko do sprawdzenia.)
 */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const configured = Boolean(env.STRIPE_WEBHOOK_SECRET);
  const keySet = Boolean(env.STRIPE_SECRET_KEY);
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Webhook Stripe</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0c;color:#f5f5f2;font:500 1rem/1.6 ui-monospace,Menlo,Consolas,monospace;padding:1rem}main{max-width:36rem}.ok{color:#22e07a}.no{color:#ff7a7a}</style></head>
<body><main><h1>&gt; webhook Stripe działa<span class="ok">_</span></h1>
<p>Ten adres przyjmuje powiadomienia od Stripe (metodą POST) — w przeglądarce nic więcej tu nie zobaczysz.</p>
<p>STRIPE_WEBHOOK_SECRET: <b class="${configured ? 'ok' : 'no'}">${configured ? 'ustawiony ✓' : 'BRAK — dodaj w Cloudflare i zrób Retry deployment'}</b><br>
STRIPE_SECRET_KEY: <b class="${keySet ? 'ok' : 'no'}">${keySet ? 'ustawiony ✓' : 'BRAK — dodaj w Cloudflare i zrób Retry deployment'}</b></p></main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};
