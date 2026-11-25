/**
 * Gerdzio Koduje — obsługa formularzy (Google Apps Script)
 *
 * Skrypt przypięty do arkusza Google. Odbiera dane z funkcji Cloudflare
 * (/api/lead i /api/waitlist), zapisuje je w arkuszu i wysyła maile.
 * Instrukcja wdrożenia: automation/README.md
 */

// ===== USTAWIENIA =====
/** Tu przychodzą powiadomienia o nowych zgłoszeniach. */
const OWNER_EMAIL = 'jakub.gabriel2002@gmail.com';
/** Podpis w mailach do klientów. */
const SIGNATURE = 'Gerdzio Koduje';
const SITE_URL = 'https://gerdziokoduje.pl';
/**
 * Wspólny sekret. Najlepiej NIE wpisuj go tutaj, tylko w:
 * Ustawienia projektu (ikona zębatki) → Właściwości skryptu → SECRET.
 * Musi być identyczny jak APPS_SCRIPT_SECRET w Cloudflare.
 */
const SECRET_FALLBACK = '';

const SHEET_LEADS = 'Leady';
const SHEET_WAITLIST = 'Lista oczekujących';
const HEADERS = {
  [SHEET_LEADS]: ['data', 'imię', 'firma', 'e-mail', 'telefon', 'branża', 'pakiet', 'strona', 'wiadomość', 'status'],
  [SHEET_WAITLIST]: ['data', 'e-mail', 'cel'],
};

// ===== WEJŚCIE =====
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_json' });
  }

  const secret = PropertiesService.getScriptProperties().getProperty('SECRET') || SECRET_FALLBACK;
  if (!secret || body.secret !== secret) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.type === 'lead') {
      handleLead_(body);
    } else if (body.type === 'waitlist') {
      handleWaitlist_(body);
    } else {
      return json_({ ok: false, error: 'unknown_type' });
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Wejście z przeglądarki — pozwala sprawdzić, że wdrożenie żyje. */
function doGet() {
  return json_({ ok: true, info: 'Gerdzio Koduje — Apps Script działa. Formularze wysyłają POST.' });
}

// ===== LEADY =====
function handleLead_(d) {
  const site = d.hasSite === 'tak' ? (d.siteUrl || 'tak (bez linku)') : 'nie';
  sheet_(SHEET_LEADS).appendRow([
    new Date(),
    safe_(d.name), safe_(d.company), safe_(d.email), safe_(d.phone),
    safe_(d.industry), safe_(d.package), safe_(site), safe_(d.message),
    'nowe',
  ]);

  // Mail do klienta
  sendSafe_({
    to: d.email,
    replyTo: OWNER_EMAIL,
    name: SIGNATURE,
    subject: 'Dzięki za zapytanie — Gerdzio Koduje',
    body:
      'Cześć ' + (d.name || '') + ',\n\n' +
      'dzięki za zapytanie o stronę dla ' + (d.company || 'Twojej firmy') + '. ' +
      'Odezwę się w ciągu 24 h.\n\n' +
      'Jeśli chcesz coś dopisać, po prostu odpowiedz na tego maila.\n\n' +
      'Pozdrawiam,\nJakub\n' + SIGNATURE + '\n' + SITE_URL,
  });

  // Powiadomienie dla mnie
  sendSafe_({
    to: OWNER_EMAIL,
    replyTo: d.email,
    name: 'Formularz ' + SIGNATURE,
    subject: 'Nowy lead: ' + (d.company || '?') + ' (' + (d.package || '-') + ')',
    body:
      'Imię: ' + d.name + '\n' +
      'Firma: ' + d.company + '\n' +
      'E-mail: ' + d.email + '\n' +
      'Telefon: ' + (d.phone || '-') + '\n' +
      'Branża: ' + d.industry + '\n' +
      'Pakiet: ' + d.package + '\n' +
      'Strona: ' + site + '\n\n' +
      'Wiadomość:\n' + d.message + '\n\n' +
      'Arkusz: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  });
}

// ===== LISTA OCZEKUJĄCYCH =====
function handleWaitlist_(d) {
  sheet_(SHEET_WAITLIST).appendRow([new Date(), safe_(d.email), safe_(d.goal)]);

  sendSafe_({
    to: d.email,
    replyTo: OWNER_EMAIL,
    name: SIGNATURE,
    subject: 'Jesteś na liście — Gerdzio Koduje',
    body:
      'Cześć,\n\n' +
      'jesteś na liście, dam znać, gdy ruszymy z materiałami, kursem i mentoringiem.\n\n' +
      'Jeśli zmienisz zdanie, odpowiedz na tego maila — usunę Twój adres.\n\n' +
      'Pozdrawiam,\nJakub\n' + SIGNATURE + '\n' + SITE_URL,
  });

  sendSafe_({
    to: OWNER_EMAIL,
    name: 'Formularz ' + SIGNATURE,
    subject: 'Nowy zapis na listę: ' + d.email,
    body: 'E-mail: ' + d.email + '\nCel: ' + (d.goal || '-'),
  });
}

// ===== POMOCNICZE =====
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
  }
  return sh;
}

/** Chroni przed wstrzyknięciem formuł do arkusza (=, +, -, @ na początku). */
function safe_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/** Wysyłka maila, której błąd (np. limit dzienny) nie blokuje zapisu w arkuszu. */
function sendSafe_(opts) {
  try {
    MailApp.sendEmail(opts);
  } catch (err) {
    console.error('Nie wysłano maila do ' + opts.to + ': ' + err);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test z edytora: wybierz „testLead” z listy funkcji i kliknij „Uruchom”.
 * Za pierwszym razem Google poprosi o uprawnienia — zaakceptuj.
 */
function testLead() {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET') || SECRET_FALLBACK;
  const res = doPost({ postData: { contents: JSON.stringify({
    type: 'lead', secret: secret,
    name: 'Test', company: 'Firma Testowa', email: OWNER_EMAIL, phone: '000 000 000',
    industry: 'test', package: 'Wizytówka', hasSite: 'nie', siteUrl: '', message: 'To jest testowe zapytanie.',
  }) } });
  console.log(res.getContent());
}

function testWaitlist() {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET') || SECRET_FALLBACK;
  const res = doPost({ postData: { contents: JSON.stringify({
    type: 'waitlist', secret: secret, email: OWNER_EMAIL, goal: 'Test listy oczekujących',
  }) } });
  console.log(res.getContent());
}
