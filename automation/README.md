# Automatyzacja formularzy — Google Sheets + Apps Script

Jak to działa:

```
formularz na stronie
   → Cloudflare Pages Function (/api/lead albo /api/waitlist): walidacja, antyspam
   → Google Apps Script (Twój „mini-backend” w Google, za darmo)
       → dopisuje wiersz w arkuszu
       → wysyła automatyczną odpowiedź do osoby, która wypełniła formularz
       → wysyła Ci powiadomienie na OWNER_EMAIL
```

Całość zajmuje ok. 15 minut. Potrzebujesz tylko konta Google.

---

## Krok 1. Utwórz projekt skryptu

1. Otwórz <https://script.new> (zalogowany na swoje konto Google). Utworzy się nowy projekt Apps Script.
   Na telefonie: w Chrome włącz menu **⋮ → Wersja na komputer**.
2. Kliknij „Projekt bez tytułu” na górze i nazwij go np. **„Formularze GK”**.

Arkusza **nie musisz** tworzyć — skrypt sam założy arkusz „Gerdzio Koduje — zgłoszenia” (z zakładkami „Leady” i „Lista oczekujących”) przy pierwszym uruchomieniu.
Wolisz własny arkusz? Otwórz go i wejdź w **Rozszerzenia → Apps Script** — wtedy skrypt użyje tego arkusza.

## Krok 2. Wklej skrypt

1. W edytorze zaznacz i usuń wszystko w pliku `Kod.gs` (`Code.gs`).
2. Skopiuj całą zawartość pliku [`apps-script.gs`](./apps-script.gs) i wklej.
3. Sprawdź na górze stałą `OWNER_EMAIL` — tam przychodzą powiadomienia.
4. Kliknij ikonę dyskietki (**Zapisz projekt**).

## Krok 3. Ustaw sekret

Sekret to hasło, które zna tylko Twoja strona i skrypt — bez niego nikt nie dopisze nic do arkusza.

1. Wygeneruj losowy ciąg, np. w terminalu:
   ```bash
   node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"
   ```
   (albo dowolny długi, losowy ciąg liter i cyfr, min. 32 znaki).
2. W edytorze Apps Script: **ikona zębatki (Ustawienia projektu)** po lewej → na dole **Właściwości skryptu** → **Dodaj właściwość skryptu**.
3. Właściwość: `SECRET`, Wartość: wygenerowany ciąg. **Zapisz właściwości skryptu**.
4. Zachowaj ten ciąg — w kroku 5 wkleisz go do Cloudflare jako `APPS_SCRIPT_SECRET`.

## Krok 4. Test w edytorze i nadanie uprawnień

1. Wróć do edytora (ikona `< >` po lewej).
2. Na pasku u góry z listy funkcji wybierz **`testLead`** i kliknij **Uruchom**.
3. Google poprosi o autoryzację: **Sprawdź uprawnienia → wybierz konto → „Google nie zweryfikował tej aplikacji” → Zaawansowane → Przejdź do (nazwa projektu) → Zezwól**.
   To normalne — to Twój własny skrypt.
4. Sprawdź:
   - na dole otworzy się **Dziennik wykonania** z linkiem „Arkusz: https://docs.google.com/…” — otwórz go; jest tam zakładka **Leady** z wierszem „Test” (arkusz znajdziesz też na Dysku Google),
   - na `OWNER_EMAIL` przyszły 2 maile (potwierdzenie „do klienta” i powiadomienie).
5. Analogicznie możesz uruchomić `testWaitlist`. Wiersze testowe potem usuń.

## Krok 5. Wdróż jako aplikację internetową

1. W prawym górnym rogu: **Wdróż → Nowe wdrożenie**.
2. Ikona zębatki przy „Wybierz typ” → **Aplikacja internetowa**.
3. Ustaw:
   - Opis: `v1`
   - **Wykonaj jako: Ja** (Twój adres)
   - **Kto ma dostęp: Każdy** ← ważne, inaczej Cloudflare dostanie stronę logowania Google
4. **Wdróż** i skopiuj **URL aplikacji internetowej** (kończy się na `/exec`).
5. Szybki test: wklej ten URL w przeglądarkę — powinieneś zobaczyć
   `{"ok":true,"info":"Gerdzio Koduje — Apps Script działa..."}`.

> „Każdy” nie znaczy, że każdy może pisać do arkusza — bez poprawnego `SECRET` skrypt odrzuca żądanie.

## Krok 6. Wklej URL i sekret do Cloudflare

W panelu Cloudflare: **Workers & Pages → Twój projekt → Settings → Variables and Secrets → Add** (środowisko **Production**):

| Nazwa | Wartość | Typ |
|---|---|---|
| `APPS_SCRIPT_URL` | URL z kroku 5 | Text |
| `APPS_SCRIPT_SECRET` | sekret z kroku 3 | **Secret** |

Zapisz i zrób ponowne wdrożenie (**Deployments → … → Retry deployment**) albo po prostu zrób kolejny push — zmienne działają od następnego wdrożenia.

## Krok 7. Test na żywo

1. Wejdź na stronę → sekcja **Kontakt** → wypełnij formularz swoim drugim mailem.
2. Powinieneś zobaczyć zielony komunikat, w arkuszu nowy wiersz ze statusem `nowe`, a na skrzynkach maile.
3. To samo na `/nauka` (lista oczekujących).

Jeśli coś nie działa — w Cloudflare: **Workers & Pages → projekt → Functions → Real-time logs** (albo „Logs”) i wyślij formularz jeszcze raz. Najczęstsze komunikaty:

| W logach | Przyczyna |
|---|---|
| `Brak APPS_SCRIPT_URL lub APPS_SCRIPT_SECRET` | nie ustawiono zmiennych albo nie było nowego wdrożenia |
| `unauthorized` | sekret w Cloudflare ≠ `SECRET` we właściwościach skryptu |
| HTML zamiast JSON / strona logowania | w kroku 5 dostęp nie jest ustawiony na „Każdy” |
| `server_error` | błąd w skrypcie — zobacz Apps Script → **Wykonania** |

---

## Indywidualne wyceny

Gdy klient wybierze w formularzu pakiet **„Indywidualna wycena”**, zgłoszenie trafia do zakładki **„Wyceny”** (nie „Leady”) i dostaje numer, np. `W-2026-001`.
Klient od razu dostaje maila z numerem, podsumowaniem i informacją „co dalej”, a Ty — powiadomienie ze wszystkimi szczegółami.

### Jednorazowa konfiguracja (po wklejeniu nowej wersji skryptu)

1. Wklej nową wersję `apps-script.gs` i zapisz (dyskietka).
2. Z listy funkcji na górze wybierz **`setup`** → **Uruchom**. Google poprosi o nowe uprawnienie (wyzwalacze) — zaakceptuj.
   Funkcja założy zakładkę „Wyceny”, ustawi formaty i włączy automatyczną wysyłkę wycen.
3. **Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: Nowa wersja → Wdróż** (URL zostaje ten sam).
4. Test: uruchom **`testQuote`** — w zakładce „Wyceny” pojawi się wiersz testowy, a na maila przyjdą 2 wiadomości.

### Jak wysłać wycenę klientowi

1. Otwórz arkusz → zakładka **„Wyceny”** (działa też w aplikacji Arkusze na telefonie).
2. W wierszu zgłoszenia uzupełnij zielone kolumny:
   - **kwota (zł)** — np. `3200` albo `3200,50`,
   - **zakres wyceny** — co dokładnie zrobisz (możesz pisać w kilku liniach),
   - **czas realizacji** — np. `3–4 tygodnie` (opcjonalnie).
3. Zaznacz pole **„wyślij wycenę”**.
4. Klient dostaje maila „Wycena W-…” z zakresem, kwotą, warunkami płatności (50/50) i datą ważności (14 dni). Ty dostajesz kopię (UDW).
   Status zmienia się na **„wycena wysłana”**, a kolumny „wysłano” i „ważna do” uzupełniają się same.

### Przyciski w mailu z wyceną: akceptuj / negocjuj / odrzuć

Mail z wyceną ma przyciski **„Akceptuję wycenę”**, **„Chcę negocjować”** i link **„Odrzucam wycenę”**.
Każdy otwiera stronę `/wycena` z podsumowaniem (kwota, zakres, termin, ważność), gdzie klient potwierdza wybór
(przy negocjacji może podać swoją kwotę i komentarz, przy odrzuceniu — powód).
Nic nie dzieje się „samo” po kliknięciu linku — to celowe, bo programy pocztowe potrafią same otwierać linki, sprawdzając je pod kątem bezpieczeństwa.

Po potwierdzeniu:
- status w arkuszu zmienia się na `zaakceptowana`, `negocjacja` albo `odrzucona`,
- kolumny **„odpowiedź klienta”**, **„komentarz klienta”** i **„data odpowiedzi”** uzupełniają się same (komentarze z kolejnych rund dopisują się pod sobą),
- klient dostaje potwierdzenie, a Ty — powiadomienie (np. „Wycena W-2026-001 zaakceptowana!”).

Linki są podpisane (HMAC z Twoim `SECRET`), więc nikt nie zmieni statusu cudzej wyceny, nawet znając jej numer.
Po negocjacji możesz wysłać poprawioną wycenę: zmień kwotę/zakres, wyczyść kolumnę „wysłano” i ponownie zaznacz „wyślij wycenę”.

**Ważne — adres strony w przyciskach:** dopóki nie masz domeny gerdziokoduje.pl, dodaj we **Właściwościach skryptu**
(zębatka → Właściwości skryptu → Dodaj) właściwość `SITE_URL` z adresem Twojej strony, np. `https://gerdziokoduje.pages.dev`.
Po podpięciu domeny zmień ją na `https://gerdziokoduje.pl` (albo usuń — to wartość domyślna).

Jeśli zaznaczysz pole bez kwoty lub zakresu — nic nie zostanie wysłane, pole się odznaczy, a w komórce pojawi się notatka, czego brakuje.
Statusy dalej zmieniasz ręcznie z listy: `nowe`, `w kontakcie`, `wycena wysłana`, `zaakceptowana`, `odrzucona`.

## Płatności zaliczek przez Stripe

Jak to działa: klient akceptuje wycenę → od razu widzi przycisk **„Zapłać zaliczkę”** (dostaje go też w mailu) →
płaci na stronie Stripe (karta, BLIK, Przelewy24) → Stripe powiadamia stronę (webhook) → arkusz sam zmienia status na
**„zaliczka opłacona”** i uzupełnia kolumny „zaliczka (zł)”, „data wpłaty”, „ID płatności” → klient dostaje „Zaliczka otrzymana”, Ty — powiadomienie o wpłacie.
Kwota zaliczki (50%) liczy się z arkusza — klient nie może jej zmienić.

Dopóki tego nie skonfigurujesz, wszystko działa jak wcześniej (w mailu: „link do płatności wyślę w ciągu 24 h”).

### Konfiguracja (od razu na trybie Live)

1. **Konto:** załóż konto na <https://dashboard.stripe.com/register> i dokończ **aktywację konta** (dane osobowe, dokument, konto bankowe do wypłat).
   Bez aktywacji klucze Live nie działają. Przy typie działalności wybierz opcję dla osoby fizycznej.
   Jeśli Stripe poprosi o dane, których nie masz (np. NIP przy działalności nierejestrowanej) — przerwij i daj znać.
2. Upewnij się, że w panelu jest wyłączony przełącznik **„Tryb testowy”** (wszystko poniżej robisz w trybie Live).
3. **Metody płatności:** Ustawienia → **Metody płatności** → włącz **Karty**, **BLIK** i **Przelewy24**.
4. **Klucz API:** Programiści → **Klucze API** → *Utwórz klucz ograniczony* → nazwa `gerdziokoduje` →
   uprawnienie **Checkout Sessions: Zapis** (reszta „Brak”) → skopiuj klucz `rk_live_…`.
5. **Webhook:** Programiści → **Webhooki** → *Dodaj endpoint*:
   - URL: `https://TWOJA-STRONA/api/stripe-webhook` (np. `https://gerdziokoduje.pages.dev/api/stripe-webhook`),
   - zdarzenia: `checkout.session.completed` i `checkout.session.async_payment_succeeded`,
   - po zapisaniu skopiuj **Sekret podpisu** `whsec_…`.
6. **Cloudflare:** projekt → Settings → Variables and Secrets → dodaj jako **Secret**:
   `STRIPE_SECRET_KEY` (klucz z kroku 4) i `STRIPE_WEBHOOK_SECRET` (z kroku 5) → **Retry deployment**.
7. **Apps Script:** Właściwości skryptu → dodaj `STRIPE_ENABLED` = `tak` (włącza przycisk płatności w mailach).
8. **Test prawdziwą płatnością na małą kwotę:**
   - uruchom `testQuote` (wycena przyjdzie na Twój mail), w arkuszu wpisz kwotę **`4`** (zaliczka = 2 zł — minimum w Stripe) i zakres, zaznacz „wyślij wycenę”,
   - w mailu kliknij „Akceptuję wycenę” → „Zapłać zaliczkę” → zapłać np. BLIK-iem,
   - sprawdź: status „zaliczka opłacona” w arkuszu, 2 maile, płatność w Stripe (Płatności),
   - **zwróć płatność** w Stripe: Płatności → wybierz płatność → *Zwrot*. Prowizja od testu może nie wrócić — to koszt rzędu groszy.
   - usuń wiersz testowy z arkusza.

Prowizje sprawdzisz na <https://stripe.com/pl/pricing> — Stripe pobiera je od każdej wpłaty, bez opłat miesięcznych.
Wpływy ze Stripe liczą się do limitu przychodu działalności nierejestrowanej i trzeba je wpisać do ewidencji sprzedaży.

## Zmiana skryptu później

Po każdej zmianie kodu w Apps Script: **Wdróż → Zarządzaj wdrożeniami → ołówek (Edytuj) → Wersja: Nowa wersja → Wdróż**.
Dzięki temu **URL zostaje ten sam** i nie musisz nic zmieniać w Cloudflare. („Nowe wdrożenie” dałoby nowy URL.)

## Limity (darmowe konto Google)

- ok. **100 maili dziennie** wysyłanych przez `MailApp` (każde zgłoszenie = 2 maile → ok. 50 zgłoszeń/dzień). Gdy limit się wyczerpie, wiersz w arkuszu i tak się zapisze.
- Statusy leadów (`nowe` → np. `w kontakcie`, `wycena wysłana`, `zamknięte`) zmieniasz ręcznie w arkuszu.
