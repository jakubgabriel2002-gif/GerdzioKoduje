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
