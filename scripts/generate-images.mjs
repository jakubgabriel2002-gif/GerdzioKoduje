/**
 * Generuje grafiki do public/:
 *  - og.png (1200×630) — obrazek do udostępnień,
 *  - favicon-32.png i apple-touch-icon.png (z public/favicon.svg),
 *  - miniatury portfolio public/img/portfolio/*.webp (zrzuty dem z dist/).
 *
 * Uruchamiasz ręcznie, tylko gdy zmieniasz logo lub dema:
 *   npm run build && npm run images
 * Wymaga Playwrighta z Chromium (jednorazowo: npx playwright install chromium).
 * Gotowe pliki są w repo, więc Cloudflare tego nie uruchamia.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Brak Playwrighta. Zainstaluj: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const pub = join(root, 'public');
const font = (w) =>
  pathToFileURL(join(root, `node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-${w}-normal.woff2`)).href;
const fontLatin = (w) =>
  pathToFileURL(join(root, `node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`)).href;

const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:JBM;font-weight:500;src:url(${fontLatin(500)})}
@font-face{font-family:JBM;font-weight:800;src:url(${fontLatin(800)})}
@font-face{font-family:JBM;font-weight:500;src:url(${font(500)});unicode-range:U+0100-024F}
@font-face{font-family:JBM;font-weight:800;src:url(${font(800)});unicode-range:U+0100-024F}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0B0B0C;color:#F5F5F2;font-family:JBM,monospace;font-weight:500;
background-image:linear-gradient(rgba(34,224,122,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(34,224,122,.08) 1px,transparent 1px);
background-size:48px 48px;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.g{color:#22E07A}.top{display:flex;align-items:center;justify-content:space-between}
.logo{font-weight:800;font-size:120px;letter-spacing:-.04em;line-height:1}
.name{font-weight:800;font-size:44px;letter-spacing:-.03em}
h1{font-weight:800;font-size:62px;line-height:1.12;letter-spacing:-.02em;max-width:1000px}
.bottom{display:flex;justify-content:space-between;align-items:end;font-size:28px;color:#A8A8A3}
</style></head><body>
<div class="top"><div class="logo"><span class="g">&lt;/</span>G<span class="g">&gt;</span></div>
<div class="name">gerdzio<span class="g">koduje</span></div></div>
<h1>Strony dla firm, które same obsługują klientów.</h1>
<div class="bottom"><div><span class="g">&gt;</span> buduję aplikacje z AI<span class="g">_</span></div><div>gerdziokoduje.pl</div></div>
</body></html>`;

/** Prosty serwer statyczny dla dist/ — do zrzutów dem. */
function serveDist(port) {
  const dist = join(root, 'dist');
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    else if (!extname(p)) p += '/index.html';
    try {
      const body = await readFile(join(dist, p));
      res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

/** PNG → WebP przez canvas w przeglądarce (bez dodatkowych zależności). */
async function toWebp(page, png, w, h, quality = 0.82) {
  const dataUrl = await page.evaluate(
    async ({ b64, w, h, quality }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', quality);
    },
    { b64: png.toString('base64'), w, h, quality },
  );
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

const browser = await playwright.chromium.launch();
try {
  // OG
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.setContent(ogHtml, { waitUntil: 'load' });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: join(pub, 'og.png') });
  console.log('✓ public/og.png');

  // Favicony PNG
  const svg = await readFile(join(pub, 'favicon.svg'), 'utf8');
  for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    // apple-touch-icon musi być nieprzezroczysty (iOS sam zaokrągla rogi)
    const bg = size > 32 ? 'background:#0B0B0C' : '';
    await p.setContent(`<style>*{margin:0}body{${bg}}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
    await p.screenshot({ path: join(pub, name), omitBackground: size <= 32 });
    console.log(`✓ public/${name}`);
  }

  // Miniatury dem
  const port = 4791;
  const server = await serveDist(port);
  await mkdir(join(pub, 'img/portfolio'), { recursive: true });
  // reducedMotion: zrzut bez animacji wejścia (wszystko od razu widoczne)
  const shot = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  for (const slug of ['beauty', 'trener', 'restauracja', 'barber', 'fizjo']) {
    const res = await shot.goto(`http://localhost:${port}/demo/${slug}/`, { waitUntil: 'networkidle' });
    if (!res?.ok()) {
      console.warn(`! /demo/${slug} niedostępne — najpierw npm run build`);
      continue;
    }
    await shot.evaluate(() => document.fonts.ready);
    const png = await shot.screenshot();
    await writeFile(join(pub, `img/portfolio/${slug}.webp`), await toWebp(shot, png, 800, 500));
    console.log(`✓ public/img/portfolio/${slug}.webp`);
  }
  server.close();
} finally {
  await browser.close();
}
