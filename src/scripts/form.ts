/**
 * Progressive enhancement formularzy.
 * Bez JS: zwykły POST → funkcja Cloudflare przekierowuje na /dziekuje.
 * Z JS: wysyłka fetch, stan ładowania, komunikat w formularzu.
 */
import './turnstile';
import { atLeast, buttonLoading, buttonRestore, buttonSuccess, setStatus } from './sending';

const NETWORK_ERROR = 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.';

function enhance(form: HTMLFormElement) {
  if (form.dataset.enhanced) return;
  form.dataset.enhanced = '1';
  const status = form.querySelector<HTMLElement>('.form__status');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const show = (state: 'success' | 'error' | 'loading', msg: string) => setStatus(status, state, msg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.sending) return;
    form.dataset.sending = '1';
    if (button) buttonLoading(button);
    show('loading', 'Wysyłam…');
    let sent = false;
    try {
      const res = await atLeast(fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      }));
      let data: { ok?: boolean; message?: string } = {};
      try { data = await res.json(); } catch { /* brak JSON */ }
      if (res.ok && data.ok) {
        show('success', data.message || form.dataset.success || 'Wysłano.');
        form.reset();
        sent = true;
      } else {
        show('error', data.message || 'Coś poszło nie tak. Spróbuj ponownie za chwilę.');
      }
    } catch {
      show('error', NETWORK_ERROR);
    } finally {
      delete form.dataset.sending;
      if (button) (sent ? buttonSuccess(button) : buttonRestore(button));
      // Token Turnstile jest jednorazowy — po wysyłce pobieramy nowy.
      const ts = form.querySelector<HTMLElement>('.ts-slot');
      if (ts?.dataset.widgetId && window.turnstile) window.turnstile.reset(ts.dataset.widgetId);
    }
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-enhance]').forEach(enhance);

export {};
