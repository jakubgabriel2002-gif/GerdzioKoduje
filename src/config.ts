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

/** Regulamin usług — data wersji (zmień przy każdej zmianie treści /regulamin). */
export const terms = { updated: '26 listopada 2026 r.', version: '2026-11-26' };

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
  { label: 'Dla firm', href: '/dla-firm' },
  { label: 'Portfolio', href: '/dla-firm#portfolio' },
  { label: 'Aplikacje', href: '/aplikacje' },
  { label: 'Nauka', href: '/nauka' },
  { label: 'Kontakt', href: '/dla-firm#kontakt' },
];

/** Pakiety. Cena to liczba w zł (pełne złote, np. 799) — na stronie wyświetlana jako „od …”. */
export type Pkg = {
  id: string;
  name: string;
  /** Cena „od” w zł. Brak ceny = pakiet wyceniany indywidualnie. */
  price?: number;
  period?: string;
  /** Tekst zamiast ceny (np. przy indywidualnej wycenie). */
  priceLabel?: string;
  /** Tekst przycisku (domyślnie „Zapytaj o ten pakiet”). */
  cta?: string;
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
    price: 799,
    summary: 'Jedna dopracowana strona, która mówi klientowi wszystko, czego potrzebuje.',
    features: ['1 strona', 'o firmie', 'usługi', 'kontakt', 'mapa dojazdu', 'wersja mobilna'],
    inForm: true,
  },
  {
    id: 'strona-firmowa',
    name: 'Strona firmowa',
    price: 1499,
    featured: true,
    badge: 'Polecana',
    summary: 'Pełna strona, która sama odpowiada na zapytania i zbiera je w jednym miejscu.',
    features: [
      '3–5 podstron',
      'formularz z automatyczną odpowiedzią',
      'zapis zapytań do arkusza',
      'wersja mobilna',
    ],
    inForm: true,
  },
  {
    id: 'indywidualna',
    name: 'Indywidualna wycena',
    priceLabel: 'do ustalenia',
    summary: 'Masz pomysł, którego nie ma w pakietach? Opisz go — przygotuję wycenę dopasowaną do Ciebie.',
    features: ['sklep internetowy', 'rezerwacje i zapisy online', 'aplikacja PWA dla firmy', 'integracje (kalendarz, płatności, CRM)', 'wszystko, co wymyślisz'],
    cta: 'Napisz, czego potrzebujesz',
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

/**
 * Dopisek nad pakietami (np. promocja). Pusty tekst = dopisek się nie wyświetla.
 */
export const pricingNote = 'Ceny startowe dla pierwszych 5 firm.';

/** Najniższa cena „od” spośród pakietów z formularza (np. do kafelka „Dla firm”). */
export const minPackagePrice = () =>
  Math.min(...packages.filter((p) => p.inForm && p.price !== undefined).map((p) => p.price!));

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

/**
 * Indywidualna wycena — dodatkowe pola formularza.
 * UWAGA: te same listy są w functions/_lib/quote.ts (walidacja) — zmieniaj w obu miejscach.
 */
export const quote = {
  package: 'Indywidualna wycena',
  projectTypes: [
    'Sklep internetowy',
    'Rezerwacje / zapisy online',
    'Aplikacja PWA',
    'Integracje (kalendarz, płatności, CRM)',
    'Rozbudowana strona',
    'Coś innego',
  ],
  budgets: ['Nie wiem jeszcze', 'do 2000 zł', '2000–5000 zł', '5000–10 000 zł', 'powyżej 10 000 zł'],
  deadlines: ['Jak najszybciej', 'W ciągu miesiąca', 'W ciągu 2–3 miesięcy', 'Bez pośpiechu'],
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
    slug: 'beauty',
    name: 'Atelier Malwa',
    industry: 'Salon kosmetyczny',
    text: 'Kosmetyka, paznokcie, brwi i rzęsy. Elegancki cennik, opinie klientek i prośba o termin.',
    image: '/img/portfolio/beauty.webp',
  },
  {
    slug: 'trener',
    name: 'Forma Od Podstaw',
    industry: 'Trener personalny',
    text: 'Treningi 1:1 i prowadzenie online. Pakiety, metoda pracy, postępy i zapis na trening próbny.',
    image: '/img/portfolio/trener.webp',
  },
  {
    slug: 'restauracja',
    name: 'Bistro Kminek',
    industry: 'Restauracja',
    text: 'Kuchnia sezonowa. Menu z zakładkami, danie dnia, godziny otwarcia i rezerwacja stolika.',
    image: '/img/portfolio/restauracja.webp',
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
