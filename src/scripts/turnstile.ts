/**
 * Cloudflare Turnstile — ładowany dopiero, gdy formularz zbliża się do ekranu
 * (nie spowalnia strony). Klucz publiczny bierzemy z atrybutu data-sitekey
 * (jeśli był znany przy buildzie) albo na żywo z /api/turnstile-key.
 * Brak klucza = brak widgetu (tryb dev).
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let keyPromise: Promise<string> | null = null;
let scriptPromise: Promise<void> | null = null;

function getKey(slot: HTMLElement): Promise<string> {
  if (slot.dataset.sitekey) return Promise.resolve(slot.dataset.sitekey);
  keyPromise ??= fetch('/api/turnstile-key', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : { siteKey: '' }))
    .then((d: { siteKey?: string }) => d.siteKey ?? '')
    .catch(() => '');
  return keyPromise;
}

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Nie udało się załadować Turnstile'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function mount(slot: HTMLElement) {
  if (slot.dataset.state) return;
  slot.dataset.state = 'loading';
  const key = await getKey(slot);
  if (!key) {
    slot.dataset.state = 'off';
    return;
  }
  try {
    await loadScript();
    slot.dataset.widgetId = window.turnstile!.render(slot, {
      sitekey: key,
      theme: 'dark',
      language: 'pl',
      size: 'flexible',
    });
    slot.dataset.state = 'ready';
  } catch {
    slot.dataset.state = 'error';
  }
}

const slots = document.querySelectorAll<HTMLElement>('.ts-slot');
if (slots.length) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.unobserve(e.target);
            const slot = (e.target as HTMLElement).querySelector<HTMLElement>('.ts-slot');
            if (slot) mount(slot);
          }
        }
      },
      { rootMargin: '600px 0px' },
    );
    // Obserwujemy formularz (pusty slot jest ukryty, więc sam nie „wejdzie” na ekran).
    slots.forEach((s) => io.observe(s.closest('form') ?? s.parentElement!));
  } else {
    slots.forEach(mount);
  }
  // Na wszelki wypadek: pierwsza interakcja z formularzem też uruchamia widget.
  slots.forEach((s) => s.closest('form')?.addEventListener('focusin', () => mount(s), { once: true }));
}

export {};
