import type { Env } from './types';

/** Wysyła dane do Google Apps Script. Zwraca { ok, ref } — ref to numer zgłoszenia (przy wycenach). */
export async function forwardToAppsScript(
  env: Env,
  type: 'lead' | 'waitlist',
  data: Record<string, string>,
): Promise<{ ok: boolean; ref?: string }> {
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    console.error('Brak APPS_SCRIPT_URL lub APPS_SCRIPT_SECRET — formularz nie jest skonfigurowany.');
    return { ok: false };
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
    let json: { ok?: boolean; error?: string; ref?: string } = {};
    try { json = JSON.parse(text); } catch { /* nie-JSON, np. strona logowania Google */ }
    if (!res.ok || json.ok !== true) {
      console.error('Apps Script odrzucił żądanie:', res.status, json.error ?? text.slice(0, 200));
      return { ok: false };
    }
    return { ok: true, ref: typeof json.ref === 'string' ? json.ref : undefined };
  } catch (err) {
    console.error('Błąd połączenia z Apps Script:', err);
    return { ok: false };
  }
}

/** Wysyła dowolne żądanie do Apps Script i zwraca jego odpowiedź JSON (albo null przy błędzie połączenia). */
export async function callAppsScript(env: Env, type: string, data: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) {
    console.error('Brak APPS_SCRIPT_URL lub APPS_SCRIPT_SECRET — formularz nie jest skonfigurowany.');
    return null;
  }
  try {
    const res = await fetch(env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, secret: env.APPS_SCRIPT_SECRET, ...data }),
      redirect: 'follow',
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      console.error('Apps Script zwrócił nie-JSON:', res.status, text.slice(0, 200));
      return null;
    }
  } catch (err) {
    console.error('Błąd połączenia z Apps Script:', err);
    return null;
  }
}
