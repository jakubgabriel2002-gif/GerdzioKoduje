/**
 * GET /api/turnstile-key — publiczny klucz Turnstile (Site Key) odczytywany na żywo
 * ze zmiennych środowiskowych. Dzięki temu widget działa bez ponownego builda,
 * niezależnie od tego, czy zmienna jest typu Text czy Secret.
 */
import type { Env } from '../_lib/types';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return new Response(JSON.stringify({ siteKey: env.TURNSTILE_SITE_KEY ?? '' }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
};
