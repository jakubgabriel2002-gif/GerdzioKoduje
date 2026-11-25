/**
 * Progressive enhancement formularzy.
 * Bez JS: zwykły POST → funkcja Cloudflare przekierowuje na /dziekuje.
 * Z JS: wysyłka fetch, stan ładowania, komunikat w formularzu.
 */
declare global {
  interface Window { turnstile?: { reset: (el?: Element | string) => void } }
}

const NETWORK_ERROR = 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.';

function enhance(form: HTMLFormElement) {
  if (form.dataset.enhanced) return;
  form.dataset.enhanced = '1';
  const status = form.querySelector<HTMLElement>('.form__status');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = button?.textContent ?? '';

  const show = (state: 'success' | 'error' | 'loading', msg: string) => {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (button) {
      button.disabled = true;
      button.textContent = 'Wysyłanie…';
    }
    show('loading', 'Wysyłam…');
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      let data: { ok?: boolean; message?: string } = {};
      try { data = await res.json(); } catch { /* brak JSON */ }
      if (res.ok && data.ok) {
        show('success', data.message || form.dataset.success || 'Wysłano.');
        form.reset();
      } else {
        show('error', data.message || 'Coś poszło nie tak. Spróbuj ponownie za chwilę.');
      }
    } catch {
      show('error', NETWORK_ERROR);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
      const ts = form.querySelector('.cf-turnstile');
      if (ts && window.turnstile) window.turnstile.reset(ts);
    }
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-enhance]').forEach(enhance);

export {};
