// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';

// Klucz publiczny Turnstile czytamy przy buildzie z TURNSTILE_SITE_KEY
// (z pliku .env lokalnie albo ze zmiennych środowiskowych Cloudflare Pages).
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const turnstileSiteKey = env.TURNSTILE_SITE_KEY ?? env.PUBLIC_TURNSTILE_SITE_KEY ?? '';

export default defineConfig({
  site: 'https://gerdziokoduje.pl',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // /dziekuje to strona techniczna (noindex) — nie trafia do mapy strony
      filter: (page) => !page.includes('/dziekuje'),
    }),
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_TURNSTILE_SITE_KEY': JSON.stringify(turnstileSiteKey),
    },
  },
});
