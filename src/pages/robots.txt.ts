/**
 * robots.txt generowany przy buildzie — adres mapy strony bierze się z `site` w astro.config.mjs.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /dziekuje', 'Disallow: /wycena', '', `Sitemap: ${sitemap}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
