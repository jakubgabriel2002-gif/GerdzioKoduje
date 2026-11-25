// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gerdziokoduje.pl',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // /dziekuje i dema (noindex) nie trafiają do mapy strony
      filter: (page) => !page.includes('/dziekuje') && !page.includes('/demo/'),
    }),
  ],
});
