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

## Krok 1. Utwórz arkusz

1. Wejdź na <https://sheets.new> (utworzy się nowy, pusty arkusz).
2. Nazwij go, np. **„Gerdzio Koduje — zgłoszenia”** (klik w „Arkusz bez nazwy” w lewym górnym rogu).
3. Zakładek **nie musisz** tworzyć ręcznie — skrypt sam założy „Leady” i „Lista oczekujących” z nagłówkami przy pierwszym zgłoszeniu.

## Krok 2. Wklej skrypt

1. W arkuszu: menu **Rozszerzenia → Apps Script**. Otworzy się edytor w nowej karcie.
2. Usuń wszystko z pliku `Kod.gs` (`Code.gs`).
3. Skopiuj całą zawartość pliku [`apps-script.gs`](./apps-script.gs) i wklej.
4. Sprawdź na górze stałą `OWNER_EMAIL` — tam przychodzą powiadomienia.
5. Kliknij ikonę dyskietki (**Zapisz projekt**). Nazwij projekt np. „Formularze GK”.

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
   - w arkuszu pojawiła się zakładka **Leady** z wierszem „Test”,
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

## Zmiana skryptu później

Po każdej zmianie kodu w Apps Script: **Wdróż → Zarządzaj wdrożeniami → ołówek (Edytuj) → Wersja: Nowa wersja → Wdróż**.
Dzięki temu **URL zostaje ten sam** i nie musisz nic zmieniać w Cloudflare. („Nowe wdrożenie” dałoby nowy URL.)

## Limity (darmowe konto Google)

- ok. **100 maili dziennie** wysyłanych przez `MailApp` (każde zgłoszenie = 2 maile → ok. 50 zgłoszeń/dzień). Gdy limit się wyczerpie, wiersz w arkuszu i tak się zapisze.
- Statusy leadów (`nowe` → np. `w kontakcie`, `wycena wysłana`, `zamknięte`) zmieniasz ręcznie w arkuszu.
