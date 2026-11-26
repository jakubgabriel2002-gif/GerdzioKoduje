# gerdziokoduje.pl

Strona marki **Gerdzio Koduje**: oferta stron dla firm, portfolio (3 dema fikcyjnych firm), sekcja Nauka z listą oczekujących i formularze, które same zapisują zgłoszenia w Arkuszu Google i odpisują klientom.

- **Astro** (strona statyczna, bez frameworka UI), zwykły CSS z custom properties
- **JetBrains Mono** self-hosted (`@fontsource`), zero Google Fonts / CDN
- **Cloudflare Pages** (hosting) + **Pages Functions** (`/functions/api/*`, backend formularzy)
- **Google Apps Script** (arkusz + automatyczne maile), **Cloudflare Turnstile** (antyspam)
- Wszystko w darmowych planach.

---

## Uruchomienie lokalne

Wymagany Node.js **22.23+** (wersja jest w `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:4321 — podgląd na żywo (bez /api)
npm run build        # buduje stronę do dist/
npm run preview      # podgląd zbudowanej strony
```

Formularze (`/api/lead`, `/api/waitlist`) działają tylko w środowisku Cloudflare. Żeby przetestować je lokalnie:

```bash
cp .env.example .dev.vars   # uzupełnij APPS_SCRIPT_URL i APPS_SCRIPT_SECRET
npm run cf:dev              # build + Wrangler: http://localhost:8788
```

Bez `TURNSTILE_SECRET` weryfikacja antyspamowa jest pomijana (tryb dev).

---

## Struktura folderów

```
├─ astro.config.mjs        konfiguracja Astro (domena, sitemap, klucz Turnstile)
├─ .env.example            opis wszystkich zmiennych środowiskowych
├─ public/                 pliki kopiowane 1:1 (favicony, og.png, robots.txt, _headers, miniatury)
├─ scripts/
│  └─ generate-images.mjs  generuje og.png, favicony PNG i miniatury dem (Playwright)
├─ src/
│  ├─ config.ts            ← WSZYSTKIE teksty i dane do zmiany (ceny, FAQ, social, e-mail)
│  ├─ styles/              tokens.css (kolory, rozmiary), global.css
│  ├─ layouts/             BaseLayout (strona marki), DemoLayout (dema), Head (meta/OG)
│  ├─ components/          Logo, Lockup, Header, Footer…
│  │  ├─ home/             sekcje strony głównej
│  │  ├─ forms/            LeadForm, WaitlistForm, Turnstile
│  │  └─ demo/             pasek demo, formularz demo, mapa, godziny
│  ├─ scripts/form.ts      wysyłka formularzy przez fetch (progressive enhancement)
│  └─ pages/               podstrony: / (ekran wyboru), /dla-firm, /nauka, /aplikacje, /polityka-prywatnosci, /dziekuje, 404, /demo/*
├─ functions/
│  ├─ _lib/                walidacja, Turnstile, wysyłka do Apps Script, odpowiedzi
│  └─ api/                 lead.ts, waitlist.ts → endpointy POST /api/lead i /api/waitlist
└─ automation/
   ├─ apps-script.gs       skrypt Google (arkusz + maile)
   └─ README.md            instrukcja wdrożenia krok po kroku
```

---

## Jak zmieniać ceny i teksty

Prawie wszystko jest w **`src/config.ts`**:

| Co | Gdzie w `config.ts` |
|---|---|
| ceny i zawartość pakietów, etykieta „Najczęściej wybierana” | `packages` (`price` to liczba w zł; na stronie pokazuje się jako „od …”) |
| pytania FAQ | `faq` |
| kroki procesu, dopisek o zaliczce | `processSteps`, `processNote` |
| linki do social mediów | `social` |
| e-mail kontaktowy | `site.email` (zapisany w dwóch częściach, składany w przeglądarce — ochrona przed botami) |
| opisy dem w portfolio | `demos` |
| nawigacja | `nav` |

### Jak dodać aplikację na /aplikacje

1. Wrzuć ikonę (kwadratową, np. 192×192 PNG) do `public/img/apps/`.
2. W `src/config.ts` znajdź listę `apps`, skopiuj zakomentowany przykład, usuń `//` i uzupełnij: nazwę, opis, adres aplikacji (`url`), ikonę i `status` (`'dostępna'` albo `'wkrótce'`).
3. Commit + push — aplikacja pojawi się na stronie. Dopóki lista jest pusta, strona pokazuje komunikat „wkrótce”.

Teksty sekcji (np. „O mnie”, hero) są w `src/components/home/*.astro`, a strona Nauka w `src/pages/nauka.astro`.
Kolory marki: `src/styles/tokens.css`.

Po zmianie logo lub dem odśwież grafiki (opcjonalnie):

```bash
npm i -D playwright && npx playwright install chromium   # jednorazowo
npm run build && npm run images
```

---

## Płatności zaliczek (Stripe)

Po akceptacji indywidualnej wyceny klient od razu płaci zaliczkę 50% przez Stripe (karta, BLIK, Przelewy24).
Wpłata sama zapisuje się w arkuszu („zaliczka opłacona”), a obie strony dostają maile.
Szczegóły i konfiguracja krok po kroku: **[automation/README.md → Płatności zaliczek przez Stripe](automation/README.md#płatności-zaliczek-przez-stripe)**.

## Statystyki odwiedzin (Cloudflare Web Analytics)

Darmowe, bez ciasteczek — nie wymagają banera cookies. Włączasz je w panelu, bez zmian w kodzie:

1. Cloudflare → **Workers & Pages** → projekt **gerdziokoduje** → zakładka **Metrics** (albo **Analytics**).
2. W sekcji **Web Analytics** kliknij **Enable**.
3. Przy następnym wdrożeniu Cloudflare sam doda skrypt statystyk do strony. Dane zobaczysz w tej samej zakładce (oraz w **Analytics & Logs → Web Analytics**).

Polityka prywatności już opisuje te statystyki.

## Wdrożenie na Cloudflare Pages

1. Wypchnij repo na GitHub (patrz niżej).
2. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git** → wybierz repozytorium.
3. Ustawienia buildu:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Production branch:** `main`
4. **Environment variables** (Settings → Variables and Secrets, środowisko Production):

   | Zmienna | Opis | Typ |
   |---|---|---|
   | `APPS_SCRIPT_URL` | URL aplikacji Apps Script (`…/exec`) | Text |
   | `APPS_SCRIPT_SECRET` | wspólny sekret z Apps Script | Secret |
   | `TURNSTILE_SITE_KEY` | publiczny klucz Turnstile (używany przy buildzie) | Text |
   | `TURNSTILE_SECRET` | sekretny klucz Turnstile | Secret |
   | `NODE_VERSION` | opcjonalnie `22.23.5`, jeśli build nie odczyta `.nvmrc` | Text |

5. **Save and Deploy.** Folder `functions/` zostanie automatycznie wdrożony jako Pages Functions.

Klucze Turnstile: **Cloudflare → Turnstile → Add widget**, domena `gerdziokoduje.pl` (do testów dodaj też `*.pages.dev`), tryb **Managed**. Klucz publiczny strona pobiera na żywo z `/api/turnstile-key`, więc zmiana kluczy działa bez nowego builda (wystarczy zapisać zmienne).

### Podpięcie domeny gerdziokoduje.pl

1. W projekcie Pages: **Custom domains → Set up a custom domain** → `gerdziokoduje.pl`.
2. Najprościej, gdy DNS domeny jest w Cloudflare:
   - **Add a site** w Cloudflare → `gerdziokoduje.pl` → plan Free,
   - u rejestratora domeny zmień **serwery nazw (nameservery)** na te 2 podane przez Cloudflare,
   - po aktywacji (zwykle do kilku godzin) Cloudflare sam doda rekord dla Pages.
3. Dodaj też `www.gerdziokoduje.pl` jako drugą domenę i ustaw przekierowanie www → bez www (**Rules → Redirect Rules** lub Bulk Redirects).
4. Certyfikat HTTPS wystawia się automatycznie.

### Wdrożenie Apps Script

Pełna instrukcja: **[automation/README.md](automation/README.md)** (arkusz → skrypt → sekret → wdrożenie → zmienne w Cloudflare → test).

---

## GitHub

Repozytorium: `jakubgabriel2002-gif/GerdzioKoduje`. Prace są na gałęzi roboczej; Cloudflare buduje produkcję z `main`, więc po scaleniu gałęzi do `main` strona sama się wdroży.

Gdybyś chciał przenieść projekt do osobnego prywatnego repo `gerdziokoduje-www`:

```bash
gh repo create gerdziokoduje-www --private --source=. --remote=www
git push www HEAD:main
```

(bez `gh`: utwórz puste prywatne repo na github.com, potem `git remote add www git@github.com:<login>/gerdziokoduje-www.git && git push www HEAD:main`).

---

## Codzienny workflow

```bash
# 1. zmiana (np. cena w src/config.ts)
npm run dev                 # sprawdź lokalnie
# 2. commit
git add -A
git commit -m "zmiana: cena wizytówki"
# 3. push
git push
```

Push na `main` = automatyczny build i wdrożenie na Cloudflare (ok. 1–2 min). Push na inną gałąź tworzy podgląd pod osobnym adresem `*.pages.dev`.

---

## Do weryfikacji przed startem

- **Regulamin usług** (`src/pages/regulamin.astro`) to szablon przygotowany na podstawie ustaleń (zaliczka 50%, 2 rundy poprawek, domena na klienta itd.) — **zweryfikuj go przed użyciem**, najlepiej z prawnikiem. Datę wersji zmieniasz w `src/config.ts` (`terms`). Akceptacja regulaminu przy wycenie zapisuje się w arkuszu w kolumnie „komentarz klienta”.
- **Polityka prywatności** (`src/pages/polityka-prywatnosci.astro`) ma uzupełnione dane, ale warto **zweryfikować treść** — najlepiej z prawnikiem lub na podstawie aktualnych wytycznych UODO. Nie jest to porada prawna. Przy zmianach aktualizuj datę na górze dokumentu.
- Linki social z komentarzami w `config.ts` (TikTok — zmiana nazwy ok. 14.12.2026, Facebook — docelowy adres strony).
