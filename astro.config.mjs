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
      // /dziekuje to strona techniczna, nie ma sensu jej indeksować
      filter: (page) => !page.includes('/dziekuje'),
    }),
  ],
});
