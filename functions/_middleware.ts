/**
 * Jeden główny adres strony (SEO): przekierowanie 301 z www i z produkcyjnego *.pages.dev
 * na CANONICAL_HOST (np. gerdziokoduje.pl).
 *
 * Bezpieczniki:
 *  - działa tylko, gdy w Cloudflare ustawiono zmienną CANONICAL_HOST,
 *  - tylko dla GET/HEAD (formularze i webhooki nie są przekierowywane),
 *  - pomija /api/* (np. webhook Stripe i Apps Script),
 *  - pomija podglądy gałęzi (<gałąź>.<projekt>.pages.dev).
 */
import type { Env } from './_lib/types';

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const canonical = (ctx.env.CANONICAL_HOST ?? '').trim().toLowerCase();
  if (!canonical) return ctx.next();

  const { request } = ctx;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const isGet = request.method === 'GET' || request.method === 'HEAD';
  const isWww = host === `www.${canonical}`;
  const isProdPagesDev = /^[a-z0-9-]+\.pages\.dev$/.test(host); // bez podglądów gałęzi (mają dodatkowy człon)

  if (isGet && (isWww || isProdPagesDev) && !url.pathname.startsWith('/api/')) {
    url.protocol = 'https:';
    url.hostname = canonical;
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return ctx.next();
};
