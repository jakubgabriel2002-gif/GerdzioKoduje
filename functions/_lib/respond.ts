/**
 * Odpowiedź dopasowana do klienta:
 *  - fetch z JS (Accept: application/json) → JSON { ok, message },
 *  - zwykły POST bez JS → przekierowanie na /dziekuje albo prosta strona błędu.
 */
export function respond(request: Request, ok: boolean, message: string, status = ok ? 200 : 400): Response {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  if (ok) {
    return new Response(null, { status: 303, headers: { location: '/dziekuje/' } });
  }
  return new Response(errorPage(message), {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function errorPage(message: string): string {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Nie udało się wysłać | Gerdzio Koduje</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0c;color:#f5f5f2;font:500 1rem/1.6 ui-monospace,Menlo,Consolas,monospace;padding:1rem}
main{max-width:40rem}h1{font-size:1.6rem;line-height:1.2}a{color:#22e07a}.g{color:#22e07a}.e{color:#ff7a7a}</style></head>
<body><main><h1><span class="e">&gt;</span> nie udało się wysłać_</h1><p>${esc(message)}</p>
<p><span class="g">&gt;</span> wróć przyciskiem „wstecz” w przeglądarce — wpisane dane powinny tam na Ciebie czekać.</p>
<p><a href="/">strona główna</a></p></main></body></html>`;
}
