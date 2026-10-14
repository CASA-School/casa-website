# The workspace in two languages

The staff workspace speaks **German by default and English on request**
(Rahman, 2026-10-14: "have it in two languages, the dashboard. the default
language should be in german"). Each colleague's choice is remembered on their
account (`staff_users.language`, migration 0025) and in their browser (cookie
`casa_ws_lang`, so the sign-in page knows it too). The switch is **DE | EN** in
the account card at the foot of the sidebar and on the sign-in page; it is a
link to `/admin/lang?to=en&back=…`.

## How text is written

Every text is written once in both languages, **German first**, next to the
code that shows it — the public site's `say(locale, 'Deutsch', 'English')`
habit:

```tsx
// a server component, page or action
const { t, lang } = await getI18n();          // src/lib/admin/i18n.server.ts
<h1>{t('Anfragen', 'Enquiries')}</h1>

// a client component ('use client')
const { t, lang } = useWsLang();               // src/components/admin/lang.tsx
<button>{t('Speichern', 'Save')}</button>

// a server component that is shared with client code and so cannot await
<Tr de="Öffnen" en="Open" />                   // src/components/admin/lang.tsx
```

- A label kept in a table (a status, a module, a type) is a `Bilingual`
  (`{ de, en }`) and is read with `pick(lang, label)` — not two parallel maps.
- Dates, numbers and money follow the language: `wsLocale(lang)` for
  `toLocaleDateString` / `Intl`, `dayRange(from, to, lang)`, `relativeDays(d, lang)`
  ("vor 3 Tagen"), `num(lang, n)`, `counted(lang, n, one, many)`.
  Money stays `1.234,56 €` in both (it is CASA's currency notation).
- A `title`, `aria-label`, `placeholder`, a confirmation's text, an error a
  server action redirects with, an email-free toast: all of it is text.
- **Not** translated: a person's or a school's name, what a learner wrote, a
  course's own name from the catalogue, the offer letter's text (the letter has
  its own language, chosen per offer), Kursplanung's planners' shorthand
  (`KW 36`, level codes).

## German style

- **du**, lower case, like everything else CASA writes (docs/VOICE_AND_TONE.md):
  "Dein Konto", "Möchtest du diese Buchung löschen?".
- Short labels, sentence case, no uppercase eyebrows (docs/ADMIN_WORKSPACE.md).
- Gender-neutral where the site already is: *Teilnehmende*, *Lernende*,
  *Mitarbeitende*.

## Glossary — use these words, the same everywhere

| English | Deutsch |
| --- | --- |
| Overview | Übersicht |
| Inbox | Posteingang |
| Enquiry / Enquiries | Anfrage / Anfragen |
| Registration / Registrations | Anmeldung / Anmeldungen |
| Course registration / Exam registration | Kursanmeldung / Prüfungsanmeldung |
| School | Schule |
| Student(s) (the register) | Teilnehmende (die Kartei: Teilnehmende) |
| learner | Lernende(r) |
| Placement test(s) | Einstufungstest(s) |
| Booking(s) | Buchung(en) |
| Offer(s) | Angebot(e) |
| Course(s) / cohort(s) | Kurs(e) / Kursgruppe(n) bzw. Termin(e) |
| Exam(s) / sitting | Prüfung(en) / Prüfungstermin |
| Management | Verwaltung |
| Application(s) (job) | Bewerbung(en) |
| Website | Website |
| Activity | Aktivität |
| Team / colleague(s) | Team / Kolleg:in → use *Kollegin oder Kollege* only when unavoidable; prefer *Team*, *Person* |
| Settings | Einstellungen |
| Price list / Prices | Preisliste / Preise |
| Lists (type lists) | Listen |
| Room(s) | Raum / Räume |
| Search | Suchen (placeholder: „Name, E-Mail …“) |
| Your account | Dein Konto |
| Sign in / Sign out | Anmelden / Abmelden |
| Owner / Administrator / Staff (roles) | Inhaber / Administrator / Mitarbeitende |
| Open (status filter) | Offen |
| New / In progress / Waiting on them / Done / Declined / Spam | Neu / In Bearbeitung / Wartet auf Antwort / Erledigt / Abgelehnt / Spam |
| Everything / All | Alle |
| Owner (who has a record) | Zuständig |
| Received | Eingegangen |
| Status | Status |
| Draft / Sent / Accepted / Declined / Withdrawn | Entwurf / Gesendet / Angenommen / Abgelehnt / Zurückgezogen |
| Follow up | Nachfassen |
| Reserved / Confirmed / Cancelled / Completed | Reserviert / Bestätigt / Storniert / Abgeschlossen |
| Balance / Total / Paid | Offen (Saldo) / Gesamt / Bezahlt |
| Payment / Record payment | Zahlung / Zahlung erfassen |
| Note(s) / Add note | Notiz(en) / Notiz hinzufügen |
| History | Verlauf |
| Save / Cancel / Delete / Edit / Add / Remove / Close | Speichern / Abbrechen / Löschen / Bearbeiten / Hinzufügen / Entfernen / Schließen |
| Create / New … | Anlegen / Neu… (e.g. „Neues Angebot") |
| Confirm | Bestätigen |
| Today / Yesterday | Heute / Gestern |
| Week / Month / Term | Woche / Monat / Semester (CASA: „Termin“ for a course start) |
| Level | Niveau |
| Accommodation / host family / flat | Unterkunft / Gastfamilie / WG |
| Enrolment fee / deposit / placement fee | Anmeldegebühr / Kaution / Vermittlungsgebühr |
| Nationality / Born / Added | Nationalität / Geboren / Angelegt |
| Previous / Next | Zurück / Weiter |
| Nothing found | Nichts gefunden |
