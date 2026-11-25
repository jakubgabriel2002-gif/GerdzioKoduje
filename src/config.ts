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
  { label: 'Aplikacje', href: '/aplikacje' },
  { label: 'Nauka', href: '/nauka' },
  { label: 'Kontakt', href: '/#kontakt' },
];

/** Pakiety. Cena to liczba w zł (grosze po kropce, np. 499.99) — na stronie wyświetlana jako „od …”. */
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
    price: 499.99,
    summary: 'Jedna dopracowana strona, która mówi klientowi wszystko, czego potrzebuje.',
    features: ['1 strona', 'o firmie', 'usługi', 'kontakt', 'mapa dojazdu', 'wersja mobilna'],
    inForm: true,
  },
  {
    id: 'strona-firmowa',
    name: 'Strona firmowa',
    price: 1499.99,
    featured: true,
    badge: 'Najczęściej wybierana',
    summary: 'Pełna strona, która sama odpowiada na zapytania i zbiera je w jednym miejscu.',
    features: [
      '3–5 podstron',
      'formularz z automatyczną odpowiedzią',
      'zapis zapytań w arkuszu',
      'wersja mobilna',
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

export const formatPrice = (zl: number) => {
  const hasGrosze = Math.round(zl * 100) % 100 !== 0;
  return (
    new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: hasGrosze ? 2 : 0,
      maximumFractionDigits: 2,
    })
      .format(zl)
      .replace(/\s/g, '\u00a0') + '\u00a0zł'
  );
};

/** Opcje pola „pakiet” w formularzu firmowym. */
export const packageOptions = [
  ...packages.filter((p) => p.inForm).map((p) => p.name),
  'Nie wiem jeszcze',
];

export const processSteps = [
  { title: 'Krótki brief', text: 'Kilka pytań o firmę, klientów i to, co strona ma załatwiać. Wystarczy formularz albo krótka rozmowa.' },
  { title: 'Makieta w 1–2 dni', text: 'Dostajesz działający podgląd strony, a nie obrazek. Klikasz i widzisz, jak to będzie wyglądać.' },
  { title: 'Poprawki', text: 'Dwie rundy poprawek w cenie. Zmieniamy teksty, kolejność, kolory — aż będzie dobrze.' },
  { title: 'Publikacja i opieka', text: 'Strona trafia pod Twoją domenę. Jeśli chcesz, dalej się nią opiekuję.' },
];

export const processNote =
  'Zaliczka 50% przed startem, reszta po publikacji. Domenę zawsze rejestruję na klienta — strona i adres są Twoje.';

export const faq = [
  {
    q: 'Ile trwa realizacja?',
    a: 'Makietę pokazuję w 1–2 dni od briefu. Dalej tempo zależy głównie od tego, jak szybko dostanę teksty i zdjęcia, oraz od rund poprawek (dwie są w cenie).',
  },
  {
    q: 'Co muszę przygotować?',
    a: 'Logo (jeśli masz), listę usług z cenami, dane kontaktowe, godziny otwarcia i kilka zdjęć. Jeśli czegoś brakuje, napisz — ustalimy, jak to uzupełnić.',
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
    name: 'Tłok & Klucz',
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

/**
 * Moje aplikacje (PWA) — pokazują się na /aplikacje.
 * Pusta lista = strona pokazuje komunikat „wkrótce”.
 *
 * Jak dodać aplikację: skopiuj przykład spod listy, usuń // i uzupełnij.
 *  - url: adres, pod którym aplikacja działa (np. https://notatki.gerdziokoduje.pl),
 *  - icon: ikona w public/img/apps/ (najlepiej kwadratowa, 192×192 PNG lub SVG),
 *  - status: 'dostępna' albo 'wkrótce' (wtedy bez przycisku „Otwórz”).
 */
export type App = {
  name: string;
  description: string;
  url: string;
  icon?: string;
  status: 'dostępna' | 'wkrótce';
  tags?: string[];
};

export const apps: App[] = [
  // {
  //   name: 'Nazwa aplikacji',
  //   description: 'Jedno–dwa zdania: co robi i dla kogo jest.',
  //   url: 'https://nazwa.gerdziokoduje.pl',
  //   icon: '/img/apps/nazwa.png',
  //   status: 'dostępna',
  //   tags: ['darmowa', 'offline'],
  // },
];

/** Klucz publiczny Turnstile — ustawiany przy buildzie ze zmiennej TURNSTILE_SITE_KEY (patrz astro.config.mjs). Pusty = brak widgetu. */
export const turnstileSiteKey: string = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '';
