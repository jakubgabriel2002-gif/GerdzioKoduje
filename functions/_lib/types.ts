export interface Env {
  /** URL wdrożonego Google Apps Script (kończy się na /exec). */
  APPS_SCRIPT_URL?: string;
  /** Wspólny sekret — ten sam co SECRET w apps-script.gs. */
  APPS_SCRIPT_SECRET?: string;
  /** Publiczny klucz Turnstile (Site Key) — podawany przeglądarce przez /api/turnstile-key. */
  TURNSTILE_SITE_KEY?: string;
  /** Stripe: tajny klucz API (sk_test_… albo sk_live_…, najlepiej klucz ograniczony rk_…). Brak = płatności wyłączone. */
  STRIPE_SECRET_KEY?: string;
  /** Stripe: sekret podpisu webhooka (whsec_…). */
  STRIPE_WEBHOOK_SECRET?: string;
  /** Tylko do testów lokalnych: inny adres API Stripe. */
  STRIPE_API_BASE?: string;
  /** Sekretny klucz Turnstile. Brak = weryfikacja pominięta (tryb dev). */
  TURNSTILE_SECRET?: string;
}

export type Fields = Record<string, string>;
export type Validated<T> = { ok: true; data: T } | { ok: false; message: string };
