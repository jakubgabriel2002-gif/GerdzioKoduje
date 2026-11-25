/**
 * Gerdzio Koduje — obsługa formularzy (Google Apps Script)
 *
 * Odbiera dane z funkcji Cloudflare (/api/lead i /api/waitlist),
 * zapisuje je w arkuszu Google i wysyła maile:
 *  - zwykłe zapytania o pakiety  → zakładka „Leady”,
 *  - indywidualne wyceny         → zakładka „Wyceny” (numer W-RRRR-NNN, wysyłka wyceny z arkusza),
 *  - lista oczekujących (Nauka)  → zakładka „Lista oczekujących”.
 *
 * Arkusz „Gerdzio Koduje — zgłoszenia” tworzy się SAM przy pierwszym uruchomieniu.
 * Po wklejeniu tej wersji uruchom RAZ funkcję `setup` (patrz automation/README.md).
 */

// ===== USTAWIENIA =====
/** Tu przychodzą powiadomienia o nowych zgłoszeniach i kopie wysłanych wycen. */
const OWNER_EMAIL = 'jakub.gabriel2002@gmail.com';
/** Podpis w mailach do klientów. */
const SIGNATURE = 'Gerdzio Koduje';
const SITE_URL = 'https://gerdziokoduje.pl';
const TZ = 'Europe/Warsaw';
/** Ile dni ważna jest wysłana wycena. */
const QUOTE_VALID_DAYS = 14;
/** Nazwa pakietu z formularza, która oznacza indywidualną wycenę. */
const QUOTE_PACKAGE = 'Indywidualna wycena';
/**
 * Wspólny sekret. Najlepiej NIE wpisuj go tutaj, tylko w:
 * Ustawienia projektu (ikona zębatki) → Właściwości skryptu → SECRET.
 * Musi być identyczny jak APPS_SCRIPT_SECRET w Cloudflare.
 */
const SECRET_FALLBACK = '';

const SPREADSHEET_NAME = 'Gerdzio Koduje — zgłoszenia';
const SHEET_LEADS = 'Leady';
const SHEET_WAITLIST = 'Lista oczekujących';
const SHEET_QUOTES = 'Wyceny';
const HEADERS = {
  [SHEET_LEADS]: ['data', 'imię', 'firma', 'e-mail', 'telefon', 'branża', 'pakiet', 'strona', 'wiadomość', 'status'],
  [SHEET_WAITLIST]: ['data', 'e-mail', 'cel'],
  [SHEET_QUOTES]: [
    'numer', 'data', 'imię', 'firma', 'e-mail', 'telefon', 'branża',
    'rodzaj projektu', 'budżet', 'termin startu', 'obecna strona', 'opis',
    'status', 'kwota (zł)', 'zakres wyceny', 'czas realizacji', 'wyślij wycenę', 'wysłano', 'ważna do',
  ],
};
/** Numer kolumny (od 1) w zakładce „Wyceny” po nazwie nagłówka. */
const Q = {};
HEADERS[SHEET_QUOTES].forEach(function (h, i) { Q[h] = i + 1; });
const QUOTE_STATUSES = ['nowe', 'w kontakcie', 'wycena wysłana', 'zaakceptowana', 'odrzucona'];

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
  let ref = '';
  try {
    if (body.type === 'lead' && body.package === QUOTE_PACKAGE) {
      ref = handleQuote_(body);
    } else if (body.type === 'lead') {
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
  return json_({ ok: true, ref: ref });
}

/** Wejście z przeglądarki — pozwala sprawdzić, że wdrożenie żyje. */
function doGet() {
  return json_({ ok: true, info: 'Gerdzio Koduje — Apps Script działa. Formularze wysyłają POST.' });
}

// ===== LEADY (pakiety) =====
function handleLead_(d) {
  const site = siteText_(d);
  sheet_(SHEET_LEADS).appendRow([
    new Date(),
    safe_(d.name), safe_(d.company), safe_(d.email), safe_(d.phone),
    safe_(d.industry), safe_(d.package), safe_(site), safe_(d.message),
    'nowe',
  ]);

  sendSafe_({
    to: d.email,
    replyTo: OWNER_EMAIL,
    name: SIGNATURE,
    subject: 'Dzięki za zapytanie — ' + SIGNATURE,
    body:
      'Cześć ' + (d.name || '') + ',\n\n' +
      'dzięki za zapytanie o stronę dla ' + (d.company || 'Twojej firmy') + '. Odezwę się w ciągu 24 h.\n\n' +
      'Jeśli chcesz coś dopisać, po prostu odpowiedz na tego maila.\n\n' + signatureText_(),
    htmlBody: emailHtml_('Dzięki za zapytanie!',
      p_('Cześć ' + esc_(d.name) + ',') +
      p_('dzięki za zapytanie o stronę dla <b>' + esc_(d.company || 'Twojej firmy') + '</b>. Odezwę się w ciągu <b>24 h</b>.') +
      rows_([['Pakiet', d.package], ['Branża', d.industry]]) +
      p_('Jeśli chcesz coś dopisać, po prostu odpowiedz na tego maila.')),
  });

  sendSafe_({
    to: OWNER_EMAIL,
    replyTo: d.email,
    name: 'Formularz ' + SIGNATURE,
    subject: 'Nowy lead: ' + (d.company || '?') + ' (' + (d.package || '-') + ')',
    body: plainRows_([
      ['Imię', d.name], ['Firma', d.company], ['E-mail', d.email], ['Telefon', d.phone || '-'],
      ['Branża', d.industry], ['Pakiet', d.package], ['Strona', site], ['Wiadomość', d.message],
    ]) + '\n\nArkusz: ' + spreadsheet_().getUrl(),
    htmlBody: emailHtml_('Nowy lead: ' + esc_(d.company || '?'),
      rows_([
        ['Imię', d.name], ['Firma', d.company], ['E-mail', d.email], ['Telefon', d.phone || '-'],
        ['Branża', d.industry], ['Pakiet', d.package], ['Strona', site], ['Wiadomość', d.message],
      ]) + button_('Otwórz arkusz', spreadsheet_().getUrl())),
  });
}

// ===== INDYWIDUALNE WYCENY =====
function handleQuote_(d) {
  const sh = sheet_(SHEET_QUOTES);
  const n = Math.max(1, sh.getLastRow()); // wiersz 1 to nagłówki → pierwsze zgłoszenie ma numer 1
  const ref = 'W-' + Utilities.formatDate(new Date(), TZ, 'yyyy') + '-' + ('00' + n).slice(-3);
  const site = siteText_(d);
  const row = [];
  row[Q['numer'] - 1] = ref;
  row[Q['data'] - 1] = new Date();
  row[Q['imię'] - 1] = safe_(d.name);
  row[Q['firma'] - 1] = safe_(d.company);
  row[Q['e-mail'] - 1] = safe_(d.email);
  row[Q['telefon'] - 1] = safe_(d.phone);
  row[Q['branża'] - 1] = safe_(d.industry);
  row[Q['rodzaj projektu'] - 1] = safe_(d.projectTypes);
  row[Q['budżet'] - 1] = safe_(d.budget);
  row[Q['termin startu'] - 1] = safe_(d.deadline);
  row[Q['obecna strona'] - 1] = safe_(site);
  row[Q['opis'] - 1] = safe_(d.message);
  row[Q['status'] - 1] = 'nowe';
  for (let i = 0; i < HEADERS[SHEET_QUOTES].length; i++) if (row[i] === undefined) row[i] = '';
  sh.appendRow(row);
  const r = sh.getLastRow();
  sh.getRange(r, Q['wyślij wycenę']).insertCheckboxes();
  sh.getRange(r, Q['status']).setDataValidation(statusRule_());

  const summary = [
    ['Numer zgłoszenia', ref], ['Firma', d.company], ['Rodzaj projektu', d.projectTypes || '—'],
    ['Budżet', d.budget || '—'], ['Termin startu', d.deadline || '—'], ['Opis', d.message],
  ];

  // Mail do klienta
  sendSafe_({
    to: d.email,
    replyTo: OWNER_EMAIL,
    name: SIGNATURE,
    subject: 'Zapytanie o wycenę ' + ref + ' — ' + SIGNATURE,
    body:
      'Cześć ' + (d.name || '') + ',\n\n' +
      'dziękuję za zapytanie o indywidualną wycenę. Numer zgłoszenia: ' + ref + '.\n\n' +
      'Co dalej:\n1. W ciągu 24 h przeanalizuję Twój pomysł.\n2. Jeśli będę miał pytania — napiszę albo zadzwonię.\n' +
      '3. Dostaniesz wycenę mailem: zakres, cenę i czas realizacji.\n\n' +
      plainRows_(summary) + '\n\n' + signatureText_(),
    htmlBody: emailHtml_('Mam Twoje zapytanie!',
      p_('Cześć ' + esc_(d.name) + ',') +
      p_('dziękuję za zapytanie o indywidualną wycenę. Twój numer zgłoszenia to <b>' + ref + '</b>.') +
      h2_('Co dalej?') +
      steps_([
        'W ciągu <b>24 h</b> przeanalizuję Twój pomysł.',
        'Jeśli będę miał pytania — napiszę albo zadzwonię.',
        'Dostaniesz wycenę mailem: <b>zakres, cenę i czas realizacji</b>.',
      ]) +
      h2_('Podsumowanie zgłoszenia') + rows_(summary) +
      p_('Chcesz coś dopisać? Po prostu odpowiedz na tego maila.')),
  });

  // Powiadomienie dla mnie
  const all = [
    ['Numer', ref], ['Imię', d.name], ['Firma', d.company], ['E-mail', d.email], ['Telefon', d.phone || '-'],
    ['Branża', d.industry], ['Rodzaj projektu', d.projectTypes || '-'], ['Budżet', d.budget || '-'],
    ['Termin startu', d.deadline || '-'], ['Strona', site], ['Opis', d.message],
  ];
  sendSafe_({
    to: OWNER_EMAIL,
    replyTo: d.email,
    name: 'Formularz ' + SIGNATURE,
    subject: 'Nowa wycena ' + ref + ': ' + (d.company || '?') + (d.budget ? ' (' + d.budget + ')' : ''),
    body: plainRows_(all) + '\n\nWycenę wyślesz z arkusza (zakładka „Wyceny”): ' + spreadsheet_().getUrl(),
    htmlBody: emailHtml_('Nowa indywidualna wycena ' + ref,
      rows_(all) +
      p_('Żeby wysłać wycenę: w zakładce <b>„Wyceny”</b> uzupełnij <b>kwotę</b>, <b>zakres</b> i <b>czas realizacji</b>, a potem zaznacz pole <b>„wyślij wycenę”</b>.') +
      button_('Otwórz arkusz', spreadsheet_().getUrl())),
  });

  return ref;
}

/**
 * Wyzwalacz „przy edycji” (instaluje go funkcja setup).
 * Zaznaczenie pola „wyślij wycenę” w zakładce „Wyceny” wysyła wycenę do klienta.
 */
function onQuoteEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() !== SHEET_QUOTES) return;
  if (e.range.getColumn() !== Q['wyślij wycenę'] || e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
  if (e.range.getRow() < 2 || e.range.getValue() !== true) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sendQuote_(sh, e.range.getRow());
  } finally {
    lock.releaseLock();
  }
}

function sendQuote_(sh, row) {
  const values = sh.getRange(row, 1, 1, HEADERS[SHEET_QUOTES].length).getValues()[0];
  const get = function (h) { return values[Q[h] - 1]; };
  const box = sh.getRange(row, Q['wyślij wycenę']);

  if (get('wysłano')) {
    box.setNote('Ta wycena została już wysłana ' + fmtDate_(get('wysłano')) + '. Żeby wysłać ponownie, wyczyść kolumnę „wysłano”.');
    return;
  }
  const amount = parseAmount_(get('kwota (zł)'));
  const scope = String(get('zakres wyceny') || '').trim();
  const email = String(get('e-mail') || '').trim();
  if (!amount || !scope || !email) {
    box.setValue(false);
    box.setNote('Najpierw uzupełnij „kwota (zł)” i „zakres wyceny”, potem zaznacz ponownie.');
    return;
  }

  const ref = get('numer');
  const now = new Date();
  const validUntil = new Date(now.getTime() + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000);
  const time = String(get('czas realizacji') || '').trim() || 'do ustalenia';
  const price = fmtMoney_(amount);
  const name = String(get('imię') || '');
  const company = String(get('firma') || '');

  const plain =
    'Cześć ' + name + ',\n\n' +
    'dziękuję za cierpliwość — poniżej wycena ' + ref + ' dla ' + company + '.\n\n' +
    'ZAKRES:\n' + scope + '\n\n' +
    'Czas realizacji: ' + time + '\n' +
    'Kwota: ' + price + '\n' +
    'Płatność: zaliczka 50% przed startem, reszta po publikacji.\n' +
    'Wycena ważna do: ' + fmtDate_(validUntil) + '\n\n' +
    'Domenę zawsze rejestruję na klienta — strona i adres są Twoje.\n\n' +
    'Aby zaakceptować wycenę, po prostu odpowiedz na tego maila — ustalimy termin startu.\n\n' + signatureText_();

  const html = emailHtml_('Wycena ' + esc_(ref),
    p_('Cześć ' + esc_(name) + ',') +
    p_('dziękuję za cierpliwość — poniżej wycena dla <b>' + esc_(company) + '</b>.') +
    h2_('Zakres') +
    '<div style="margin:0 0 16px;padding:14px 16px;background:#f6f7f4;border-radius:8px;font-size:15px;line-height:1.6;color:#1b1b1b">' +
    esc_(scope).replace(/\n/g, '<br>') + '</div>' +
    rows_([['Czas realizacji', time], ['Płatność', 'zaliczka 50% przed startem, reszta po publikacji'], ['Ważna do', fmtDate_(validUntil)]]) +
    '<div style="margin:18px 0;padding:18px 16px;border:2px solid #15803d;border-radius:10px;text-align:center">' +
    '<div style="font-size:13px;color:#555;text-transform:uppercase;letter-spacing:1px">Kwota</div>' +
    '<div style="font-size:30px;font-weight:bold;color:#15803d;margin-top:4px">' + price + '</div></div>' +
    p_('Domenę zawsze rejestruję na klienta — strona i adres są Twoje.') +
    p_('<b>Aby zaakceptować wycenę, po prostu odpowiedz na tego maila</b> — ustalimy termin startu.'));

  try {
    MailApp.sendEmail({
      to: email,
      bcc: OWNER_EMAIL,
      replyTo: OWNER_EMAIL,
      name: SIGNATURE,
      subject: 'Wycena ' + ref + ' — ' + SIGNATURE,
      body: plain,
      htmlBody: html,
    });
  } catch (err) {
    box.setValue(false);
    box.setNote('Nie udało się wysłać: ' + err);
    return;
  }
  sh.getRange(row, Q['status']).setValue('wycena wysłana');
  sh.getRange(row, Q['wysłano']).setValue(now);
  sh.getRange(row, Q['ważna do']).setValue(validUntil);
  box.setNote('Wysłano ' + fmtDate_(now));
}

// ===== LISTA OCZEKUJĄCYCH =====
function handleWaitlist_(d) {
  sheet_(SHEET_WAITLIST).appendRow([new Date(), safe_(d.email), safe_(d.goal)]);

  sendSafe_({
    to: d.email,
    replyTo: OWNER_EMAIL,
    name: SIGNATURE,
    subject: 'Jesteś na liście — ' + SIGNATURE,
    body:
      'Cześć,\n\njesteś na liście, dam znać, gdy ruszymy z materiałami, kursem i mentoringiem.\n\n' +
      'Jeśli zmienisz zdanie, odpowiedz na tego maila — usunę Twój adres.\n\n' + signatureText_(),
    htmlBody: emailHtml_('Jesteś na liście!',
      p_('Cześć,') +
      p_('jesteś na liście, dam znać, gdy ruszymy z <b>materiałami, kursem i mentoringiem</b>.') +
      p_('Jeśli zmienisz zdanie, odpowiedz na tego maila — usunę Twój adres.')),
  });

  sendSafe_({
    to: OWNER_EMAIL,
    name: 'Formularz ' + SIGNATURE,
    subject: 'Nowy zapis na listę: ' + d.email,
    body: 'E-mail: ' + d.email + '\nCel: ' + (d.goal || '-'),
  });
}

// ===== JEDNORAZOWA KONFIGURACJA =====
/**
 * Uruchom RAZ po wklejeniu skryptu (i po każdej zmianie arkusza na nowy):
 * tworzy zakładki, ustawia formatowanie i instaluje wyzwalacz wysyłki wycen.
 */
function setup() {
  const ss = spreadsheet_();
  [SHEET_LEADS, SHEET_WAITLIST, SHEET_QUOTES].forEach(sheet_);
  const sh = sheet_(SHEET_QUOTES);
  const rows = Math.max(1, sh.getMaxRows() - 1);
  sh.getRange(2, Q['kwota (zł)'], rows).setNumberFormat('#,##0.00 "zł"');
  sh.getRange(2, Q['data'], rows).setNumberFormat('dd.MM.yyyy HH:mm');
  sh.getRange(2, Q['wysłano'], rows).setNumberFormat('dd.MM.yyyy HH:mm');
  sh.getRange(2, Q['ważna do'], rows).setNumberFormat('dd.MM.yyyy');
  sh.getRange(2, Q['status'], rows).setDataValidation(statusRule_());
  sh.getRange(1, Q['kwota (zł)'], 1, 3).setBackground('#e6f4ea');
  sh.getRange(1, Q['wyślij wycenę']).setBackground('#ceead6');
  sh.setColumnWidth(Q['opis'], 320);
  sh.setColumnWidth(Q['zakres wyceny'], 320);

  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'onQuoteEdit'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onQuoteEdit').forSpreadsheet(ss).onEdit().create();
  console.log('Gotowe. Arkusz: ' + ss.getUrl());
}

// ===== POMOCNICZE: ARKUSZ =====
/**
 * Arkusz ze zgłoszeniami: ten, do którego przypięty jest skrypt, a jeśli skrypt
 * jest samodzielny — arkusz utworzony automatycznie (jego ID zapisuje się we właściwościach).
 */
function spreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* arkusz usunięty — utwórz nowy */ }
  }
  const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  console.log('Utworzono arkusz: ' + ss.getUrl());
  return ss;
}

function sheet_(name) {
  const ss = spreadsheet_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
  }
  return sh;
}

function statusRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList(QUOTE_STATUSES, true).setAllowInvalid(true).build();
}

/** Chroni przed wstrzyknięciem formuł do arkusza (=, +, -, @ na początku). */
function safe_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function siteText_(d) {
  return d.hasSite === 'tak' ? (d.siteUrl || 'tak (bez linku)') : 'nie';
}

// ===== POMOCNICZE: FORMATY =====
function parseAmount_(v) {
  if (typeof v === 'number') return v > 0 ? v : 0;
  const n = Number(String(v || '').replace(/[^\d,.-]/g, '').replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
}

function fmtMoney_(n) {
  const fixed = (Math.round(n * 100) / 100).toFixed(2);
  const parts = fixed.split('.');
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (parts[1] === '00' ? int : int + ',' + parts[1]) + ' zł';
}

function fmtDate_(d) {
  return Utilities.formatDate(new Date(d), TZ, 'dd.MM.yyyy');
}

// ===== POMOCNICZE: MAILE =====
function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function p_(html) {
  return '<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1b1b1b">' + html + '</p>';
}

function h2_(text) {
  return '<h2 style="margin:22px 0 10px;font-size:16px;color:#0b0b0c">' + text + '</h2>';
}

function rows_(pairs) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;border-collapse:collapse;font-size:14px">' +
    pairs.map(function (r) {
      return '<tr><td style="padding:8px 10px 8px 0;border-bottom:1px solid #ececec;color:#666;vertical-align:top;width:38%">' + esc_(r[0]) +
        '</td><td style="padding:8px 0;border-bottom:1px solid #ececec;color:#1b1b1b;vertical-align:top">' + esc_(r[1]).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('') + '</table>';
}

function steps_(items) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">' +
    items.map(function (t, i) {
      return '<tr><td style="vertical-align:top;padding:4px 12px 8px 0"><div style="width:24px;height:24px;border-radius:12px;background:#15803d;color:#fff;font-size:13px;font-weight:bold;text-align:center;line-height:24px">' + (i + 1) +
        '</div></td><td style="vertical-align:top;padding:6px 0 8px;font-size:15px;line-height:1.5;color:#1b1b1b">' + t + '</td></tr>';
    }).join('') + '</table>';
}

function button_(label, url) {
  return '<p style="margin:20px 0 6px"><a href="' + esc_(url) + '" style="display:inline-block;padding:12px 20px;background:#15803d;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px">' + esc_(label) + '</a></p>';
}

function plainRows_(pairs) {
  return pairs.map(function (r) { return r[0] + ': ' + (r[1] == null ? '' : r[1]); }).join('\n');
}

function signatureText_() {
  return 'Pozdrawiam,\nJakub\n' + SIGNATURE + '\n' + SITE_URL;
}

/** Szablon maila w stylu marki (jasne tło, zielony akcent #15803D). */
function emailHtml_(title, bodyHtml) {
  return '<!doctype html><html lang="pl"><body style="margin:0;padding:24px 12px;background:#f4f4f1;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">' +
    '<tr><td style="background:#0b0b0c;padding:18px 24px;font-family:\'Courier New\',monospace;font-size:18px;font-weight:bold;color:#f5f5f2">' +
    '<span style="color:#22e07a">&lt;/</span>G<span style="color:#22e07a">&gt;</span>&nbsp;&nbsp;gerdzio<span style="color:#22e07a">koduje</span></td></tr>' +
    '<tr><td style="padding:28px 24px 6px"><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b0b0c">' + title + '</h1>' + bodyHtml + '</td></tr>' +
    '<tr><td style="padding:14px 24px 24px;border-top:1px solid #ececec;font-size:13px;line-height:1.6;color:#666">Jakub · ' + SIGNATURE +
    '<br><a href="' + SITE_URL + '" style="color:#15803d">' + SITE_URL.replace('https://', '') + '</a></td></tr>' +
    '</table></td></tr></table></body></html>';
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

// ===== TESTY Z EDYTORA =====
/** Wybierz funkcję z listy na górze i kliknij „Uruchom”. Maile przyjdą na OWNER_EMAIL. */
function testLead() {
  runTest_({
    type: 'lead', name: 'Test', company: 'Firma Testowa', email: OWNER_EMAIL, phone: '000 000 000',
    industry: 'test', package: 'Wizytówka', hasSite: 'nie', siteUrl: '', message: 'To jest testowe zapytanie.',
  });
}

function testQuote() {
  runTest_({
    type: 'lead', name: 'Test', company: 'Firma Testowa', email: OWNER_EMAIL, phone: '000 000 000',
    industry: 'test', package: QUOTE_PACKAGE, hasSite: 'nie', siteUrl: '',
    projectTypes: 'Sklep internetowy, Rezerwacje / zapisy online', budget: '2000–5000 zł', deadline: 'W ciągu miesiąca',
    message: 'Testowe zapytanie o indywidualną wycenę: sklep z rezerwacjami.',
  });
}

function testWaitlist() {
  runTest_({ type: 'waitlist', email: OWNER_EMAIL, goal: 'Test listy oczekujących' });
}

function runTest_(data) {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET') || SECRET_FALLBACK;
  if (!secret) {
    console.log('Najpierw ustaw SECRET: zębatka (Ustawienia projektu) → Właściwości skryptu.');
    return;
  }
  data.secret = secret;
  const res = doPost({ postData: { contents: JSON.stringify(data) } });
  console.log(res.getContent());
  console.log('Arkusz: ' + spreadsheet_().getUrl());
}
