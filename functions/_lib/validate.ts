import type { Fields } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9 +()\-]{6,30}$/;

export class ValidationError extends Error {}

/** Odczyt pól z formularza (multipart / urlencoded) albo JSON. */
export async function readFields(request: Request): Promise<Fields> {
  const type = request.headers.get('content-type') ?? '';
  const out: Fields = {};
  if (type.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [k, v] of Object.entries(body)) if (typeof v === 'string') out[k] = v;
    return out;
  }
  const form = await request.formData();
  for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Pole tekstowe: przycięte, z limitem długości; wymagane → błąd, gdy puste. */
export function text(f: Fields, key: string, label: string, opts: { required?: boolean; max: number; min?: number }): string {
  const value = (f[key] ?? '').replace(/\r\n/g, '\n').trim();
  if (!value) {
    if (opts.required) throw new ValidationError(`Uzupełnij pole „${label}”.`);
    return '';
  }
  if (opts.min && value.length < opts.min) throw new ValidationError(`Pole „${label}” jest za krótkie (min. ${opts.min} znaków).`);
  if (value.length > opts.max) throw new ValidationError(`Pole „${label}” jest za długie (max ${opts.max} znaków).`);
  return value;
}

export function email(f: Fields): string {
  const value = text(f, 'email', 'E-mail', { required: true, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(value)) throw new ValidationError('Podaj poprawny adres e-mail.');
  return value;
}

export function phone(f: Fields): string {
  const value = text(f, 'phone', 'Telefon', { max: 30 });
  if (value && !PHONE_RE.test(value)) throw new ValidationError('Podaj poprawny numer telefonu (cyfry, spacje, +).');
  return value;
}

export function url(f: Fields, key: string, label: string): string {
  let value = text(f, key, label, { max: 300 });
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    if (!u.hostname.includes('.')) throw new Error();
    return u.toString();
  } catch {
    throw new ValidationError(`Pole „${label}” nie wygląda na adres strony.`);
  }
}

export function oneOf<T extends string>(f: Fields, key: string, allowed: readonly T[], fallback: T): T {
  const value = (f[key] ?? '').trim() as T;
  return allowed.includes(value) ? value : fallback;
}

export function consent(f: Fields): void {
  if ((f.consent ?? '') !== 'tak') throw new ValidationError('Zaznacz zgodę na przetwarzanie danych.');
}

/** Honeypot: ukryte pole „website” wypełniają tylko boty. */
export function isBot(f: Fields): boolean {
  return (f.website ?? '').trim() !== '';
}
