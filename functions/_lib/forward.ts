import type { Env } from './types';

/** Wysyła dane do Google Apps Script. Zwraca true, gdy skrypt potwierdził zapis. */
export async function forwardToAppsScript(env: Env, type: 'lead' | 'waitlist', data: Record<string, string>): Promise<boolean> {
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    console.error('Brak APPS_SCRIPT_URL lub APPS_SCRIPT_SECRET — formularz nie jest skonfigurowany.');
    return false;
  }
  try {
    // Apps Script odpowiada przekierowaniem 302 — fetch idzie za nim automatycznie.
    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, secret: env.APPS_SCRIPT_SECRET, ...data }),
      redirect: 'follow',
    });
    const text = await res.text();
    let json: { ok?: boolean; error?: string } = {};
    try { json = JSON.parse(text); } catch { /* nie-JSON, np. strona logowania Google */ }
    if (!res.ok || json.ok !== true) {
      console.error('Apps Script odrzucił żądanie:', res.status, json.error ?? text.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error('Błąd połączenia z Apps Script:', err);
    return false;
  }
}
