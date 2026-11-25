/**
 * Centralna konfiguracja strony Gerdzio Koduje.
 * Wszystko, co zmieniasz na co dzień (ceny, teksty, linki), jest tutaj.
 * Po zmianie: zapisz → commit → push → Cloudflare sam wdroży nową wersję.
 */

export const site = {
  brand: 'Gerdzio Koduje',
  domain: 'gerdziokoduje.pl',
  url: 'https://gerdziokoduje.pl',
  owner: 'Jakub',
  tagline: 'buduję aplikacje z AI',
  defaultDescription:
    'Strony internetowe dla lokalnych firm z automatyczną obsługą zapytań. Wizytówki, strony firmowe i opieka. Gerdzio Koduje.',
  /**
   * E-mail kontaktowy. Na stronie składany w JS (utrudnia zbieranie przez boty).
   * Zapisany w dwóch częściach — nie łącz ich w jeden string.
   */
  email: { user: 'jakub.gabriel2002', domain: 'gmail.com' },
};

export const social = {
  // zmienić na @gerdziokoduje ok. 14.12.2026
  tiktok: 'https://www.tiktok.com/@firmanaai',
  instagram: 'https://www.instagram.com/gerdziokoduje',
  // podmienić na docelowy adres strony FB
  facebook: 'https://www.facebook.com/share/1HrxKMfJ7r/',
  youtube: 'https://www.youtube.com/@gerdzio_koduje',
};

export const socialList = [
  { name: 'TikTok', href: social.tiktok },
  { name: 'Instagram', href: social.instagram },
  { name: 'Facebook', href: social.facebook },
  { name: 'YouTube', href: social.youtube },
];

export const nav = [
  { label: 'Dla firm', href: '/#oferta' },
  { label: 'Portfolio', href: '/#portfolio' },
  { label: 'Nauka', href: '/nauka' },
  { label: 'Kontakt', href: '/#kontakt' },
];

/** Pakiety. Cena to liczba w zł — na stronie wyświetlana jako „od …”. */
export type Pkg = {
  id: string;
  name: string;
  price: number;
  period?: string;
  featured?: boolean;
  badge?: string;
  summary: string;
  features: string[];
  /** Czy pakiet pojawia się w polu „pakiet” formularza. */
  inForm: boolean;
};

export const packages: Pkg[] = [
  {
    id: 'wizytowka',
    name: 'Wizytówka',
    price: 1000,
    summary: 'Jedna dopracowana strona, która mówi klientowi wszystko, czego potrzebuje.',
    features: ['1 strona', 'o firmie', 'usługi', 'kontakt', 'mapa dojazdu', 'wersja mobilna'],
    inForm: true,
  },
  {
    id: 'strona-firmowa',
    name: 'Strona firmowa',
    price: 2000,
    featured: true,
    badge: 'Najczęściej wybierana',
    summary: 'Pełna strona, która sama odpowiada na zapytania i zbiera je w jednym miejscu.',
    features: [
      '3–5 podstron',
      'formularz z automatyczną odpowiedzią',
      'zapis zapytań w arkuszu',
      'wersja mobilna',
      'podstawowe SEO',
    ],
    inForm: true,
  },
  {
    id: 'opieka',
    name: 'Opieka',
    price: 100,
    period: '/mies.',
    summary: 'Ty prowadzisz firmę, ja pilnuję strony.',
    features: ['zmiany treści', 'aktualizacje', 'pilnowanie, że strona działa'],
    inForm: false,
  },
];

export const formatPrice = (zl: number) =>
  new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(zl).replace(/\s/g, ' ') + ' zł';

/** Opcje pola „pakiet” w formularzu firmowym. */
export const packageOptions = [
  ...packages.filter((p) => p.inForm).map((p) => p.name),
  'Nie wiem jeszcze',
];

export const processSteps = [
  { title: 'Krótki brief', text: 'Kilka pytań o firmę, klientów i to, co strona ma załatwiać. 15 minut rozmowy albo formularz.' },
  { title: 'Makieta w 1–2 dni', text: 'Dostajesz działający podgląd strony, a nie obrazek. Klikasz i widzisz, jak to będzie wyglądać.' },
  { title: 'Poprawki', text: 'Dwie rundy poprawek w cenie. Zmieniamy teksty, kolejność, kolory — aż będzie dobrze.' },
  { title: 'Publikacja i opieka', text: 'Strona trafia pod Twoją domenę. Jeśli chcesz, dalej się nią opiekuję.' },
];

export const processNote =
  'Zaliczka 50% przed startem, reszta po publikacji. Domenę zawsze rejestruję na klienta — strona i adres są Twoje.';

export const faq = [
  {
    q: 'Ile trwa realizacja?',
    a: 'Makietę pokazuję w 1–2 dni od briefu. Cała Wizytówka zwykle zamyka się w tygodniu, Strona firmowa w 2–3 tygodnie — w praktyce najdłużej czeka się na teksty i zdjęcia.',
  },
  {
    q: 'Co muszę przygotować?',
    a: 'Logo (jeśli masz), listę usług z cenami, dane kontaktowe, godziny otwarcia i kilka zdjęć. Jeśli czegoś brakuje — pomogę napisać teksty i dobrać zdjęcia.',
  },
  {
    q: 'Czy domena i strona są moje?',
    a: 'Tak. Domenę rejestruję na Ciebie, a po zakończeniu współpracy dostajesz pełny dostęp do strony i jej plików. Nie trzymam nikogo „na zakładnika”.',
  },
  {
    q: 'Jak wygląda płatność?',
    a: 'Zaliczka 50% przed rozpoczęciem pracy, pozostałe 50% po akceptacji i publikacji strony. Opiekę rozliczamy co miesiąc.',
  },
  {
    q: 'Co się dzieje po publikacji?',
    a: 'Strona działa, a zapytania z formularza trafiają do Twojego arkusza i na maila. Możesz wziąć pakiet Opieka — wtedy zmiany treści, aktualizacje i pilnowanie działania biorę na siebie.',
  },
];

/** Dema w portfolio. */
export const demos = [
  {
    slug: 'warsztat',
    name: 'Auto Serwis Kowalik',
    industry: 'Warsztat samochodowy',
    text: 'Mechanika, diagnostyka i wymiana opon. Cennik usług i szybki formularz umówienia wizyty.',
    image: '/img/portfolio/warsztat.webp',
  },
  {
    slug: 'barber',
    name: 'Brzytwa & Grzebień',
    industry: 'Barber shop',
    text: 'Klasyczny barber z charakterem. Strzyżenia, broda, golenie brzytwą i rezerwacja terminu.',
    image: '/img/portfolio/barber.webp',
  },
  {
    slug: 'fizjo',
    name: 'Fizjo Równowaga',
    industry: 'Gabinet fizjoterapii',
    text: 'Spokojna, czytelna strona gabinetu. Terapie, zespół, cennik i zapis na pierwszą wizytę.',
    image: '/img/portfolio/fizjo.webp',
  },
];

/** Klucz publiczny Turnstile (ustawiany przy buildzie). Pusty = brak widgetu (tryb dev). */
export const turnstileSiteKey: string = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '';
