# Privacy policy — the new website's own text

`/privacy` (`/datenschutz`) no longer shows the old site's policy word for word. Since
2026-09-30 it is CASA's own text, in German and English, written against what the code
actually does. The general sections (introduction, §1 definitions, §20 rights, §24 legal
requirements) are carried over from the old policy; the rest is new. Provenance of the old
text stays in `basedOn` in `src/lib/content/published-legal.json`. `docs/LEGAL_BASELINE.md`
still describes the terms and the imprint, which are unchanged.

The facts behind the text are Rahman's answers of 2026-09-30 (he owns Microsoft 365, Azure
and the forms). The working draft and its 51 decisions are in `output/review/privacy-draft/`
(gitignored); `final-v2.json` is the version published here.

**This is a draft that has not had legal review.** It is on the website so that the site
has an honest policy rather than an outdated one, not because a lawyer has signed it off.

## Sections

1 Definitions · 2 Controller (as in the imprint) · 3 Hosting · 4 Abuse protection ·
5 Cookies · 6 Fonts and external content · 7 Social, map and placement-test links (Klett) ·
8 Contact and group enquiries · 9 Internal handling · 10 Course registration ·
11 Accommodation · 12 Allergies · 13 Exams · 14 Job applications · 15 Group appointments ·
16 Email notifications · 17 Assistant and search · 18 Recipients · 19 Storage periods ·
20 Rights · 21 Complaint · 22 Legal basis · 23 Legitimate interests · 24 Legal requirements ·
25 Automated decisions (none).

Since 2026-10-01 there is no section on CASA's own placement test: the test is in
development and closed on the public site (`src/lib/placement/availability.ts`), and the
public page links to the Klett tests instead (§7). The removed text is kept at the end of
this file, under „Held back". Every `h2` has an `id` (`#health-data`, `#storage-periods`, …),
the same in both languages.

## Facts the text states (settled, 2026-09-30)

- Microsoft nonprofit subscription for the gGmbH; processor Microsoft Ireland Operations Limited.
- Mailboxes: contact and group enquiries → `info@`; course, exam and accommodation
  registrations → `online@` (learners email their Klett result there themselves); appointment requests → the responsible
  contact person's mailbox (group consultations: Ina Eismann), who confirms by email;
  job-application alerts → `info@`, naming only the position and a reference.
- Job applications themselves: management only, in the workspace's Applications module.
- Host families get name, age, gender, nationality, German level, dates of stay, and
  allergies only with the separate consent. No smoking in any CASA accommodation, so the
  form no longer asks.
- telc gets no web registration. CASA orders exam places and runs the exams; the exam papers
  the candidate fills in go to telc.
- Visas: CASA issues the learner a confirmation; no data goes to authorities.
- Bookings move into the in-house school administration system (FileMaker).
- No data sold, no marketing email.
- Since 2026-10-01 the sender gets a confirmation (receipt): their name, the reference and their
  catalogue choices, never their free text; no copy kept; at most three per inbox in 24 hours per
  server process (§14, §15, §16, §19).
- Logs: Log Analytics `log-casa-prod`, Germany West Central, 30 days (verified 2026-09-30);
  no Application Insights on `ca-casa-website`.

## True only once the launch setup exists

The text describes the site as it will run on `casa-bremen.de`, not the current test revision.

- **Database**: Azure Database for PostgreSQL in **Belgium Central**, backups ≤ 35 days (§3, §18, §19).
  None is provisioned yet. The subscription blocks PostgreSQL in Germany West Central (checked
  2026-09-30, as `docs/AZURE_DEPLOYMENT_PLAN.md` says); the website and the logs stay there.
  Until it exists, §15's „in unserem internen Arbeitsbereich gespeichert" and „der Termin wird für
  andere Anfragen gesperrt" are not true: an appointment request then travels by mail alone and
  holds no time (2026-10-09, `docs/GROUP_APPOINTMENTS_AND_TEST_MAIL.md`).
- **Mail**: Graph mail from a CASA mailbox, `FORM_DELIVERY_MODE=live`, and every
  `FORM_RECIPIENT_*` set to the routing in §16. During testing all mail goes to `admin@`.
- **Staff host**: `admin.casa-bremen.de` live and `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST` unset (§5).

## Open questions

**For CASA**

1. Ina's mailbox address, for `FORM_RECIPIENT_APPOINTMENT`.
2. Minors: may someone under 18 register for a course, exam or accommodation without a
   parent or guardian? The policy says nothing about it today.
3. Job-application alert to `info@`: the site now sends only the position and a reference,
   so nobody outside management sees applicant data. Confirm that is what you want.
4. Where the careers page's email fallback should point once `bewerbungen@` is retired
   (`src/lib/mock/store.ts`, and `apply_email` per position in the database).
5. Deletion: nothing is deleted on a schedule, in the code or in the mailboxes. §19 promises
   periods. Needs scheduled deletion in the workspace and Microsoft 365 retention rules on
   `info@`, `online@`, the contact person's mailbox and the sender's Sent Items.
6. Host families: by which channel they receive the learner's details, and whether they sign
   a confidentiality undertaking.
7. Longer storage of applications "for future vacancies" (§14) needs a consent box that does
   not exist yet — build one or drop the sentence.
7a. ~~The interest list's retention~~ **Confirmed 2026-10-09 (Rahman):** entries are kept twelve
   months after the entry, like contact enquiries, as §8, §16 and §19 already state. The list is
   used only to tell people when the course starts, never for marketing.

8. AGB 2.2 promises „eine Kopie der Anmeldung per E-Mail". The new receipt deliberately shows only
   the name, the catalogue choices and the reference, so a mistyped address reveals little. Either
   amend 2.2 („erhält eine Eingangsbestätigung per E-Mail; sie ist noch keine Annahme") or decide
   to send the full copy. Also whether the receipt should carry the Widerrufsbelehrung on a
   durable medium.

**For a lawyer**

9. Legal bases throughout, the allergy consent (Art. 9(2)(a) GDPR), and whether submission
   under a server-enforced consent is enough proof or a stored timestamp is needed.
10. No cookie banner: the § 25 TDDDG reasoning in §5.
11. Placement test and Art. 22 GDPR: only when CASA's own test returns (see „Held back").
12. Data protection officer: none is named. Check § 38 BDSG (20+ people constantly
    processing personal data, counting teachers who use the workspace or the mailboxes).
13. Whether the DGD generator licence needs the credit kept for the carried-over sections.
14. Facebook and Instagram pages: a separate notice for possible joint controllership with Meta.

**Website follow-ups**

- Allergies in the workspace and the notification mail are visible to everyone with course
  registrations; a permission of their own would narrow §12.
- User agent is stored for enquiries and appointments with no use in the code; drop it and the
  two sentences that mention it.
- Rate-limit entries are overwritten rather than deleted when their window ends (§4 wording).
- Placement writing prompt WR-A1-003 asks "Nennen Sie Ihren Namen."
- News articles render raw `<img src>`: §6's "no third-party content" holds only while editors
  never embed an external image.
- Staff sessions and the sign-in throttle belong in an internal staff notice, not this policy.

## Changing the text

The HTML in `src/lib/content/published-legal.json` (`privacy.de`, `privacy.en`) is the source.
Change both languages, and `revisedAt` with the "Stand" / "Last updated" line at the end.
Keep to the tags already used (`h2` with an `id`, `h3`, `p`, `ul`, `li`, `a`, `br`, `strong`):
the template renders this HTML as it is. A change to a form, a recipient or a
retention period is a change to this policy: check §10–§19 in the same PR.

## Held back: CASA's own placement test (removed 2026-10-01)

Taken out because the own test is closed on the public site. Put it back, after section 14
(„Bewerbungen"), when `CASA_ENABLE_PLACEMENT_TEST` is switched on in production, and restore
with it: the test in §4 (abuse protection), the access key in §5 (cookies), placement results
in §9 (internal handling) and §16 (notifications to online@), the retention line in §19, the
legitimate interest „Verbesserung unseres Einstufungstests" in §23, and the Art. 22 text in
§25. `git show 4f9c179:src/lib/content/published-legal.json` has the full earlier version.
The § numbers above are today's. Restoring the section renumbers today's §15–§25 to §16–§26 in
both languages (the number in each `h2`), and the § references in this file and in
docs/GROUP_APPOINTMENTS_AND_TEST_MAIL.md move with them.

German, as it was published:

```html
<h2 id="placement-test">15. Online-Einstufungstest</h2><p>Mit unserem Online-Einstufungstest können Sie Ihr Deutschniveau einschätzen lassen. Sie benötigen dafür kein Konto. Ihren Namen oder Ihre E-Mail-Adresse müssen Sie für den Test nicht angeben. Ihre IP-Adresse speichern wir zusammen mit dem Test nicht.</p><p>Wir verarbeiten Ihre Antworten auf drei Einstiegsfragen (bisheriges Deutschlernen, Ihr Lernziel und wann Sie zuletzt regelmäßig Deutsch verwendet haben), Ihre Antworten auf die Testaufgaben einschließlich der Reihenfolge, in der Ihnen die Antwortmöglichkeiten angezeigt wurden, einen freiwilligen Schreibtext sowie Sprache, Zeitpunkte und Stand des Tests. Wenn Sie in der freiwilligen Schreibaufgabe Angaben zu Ihrer Person machen, speichern wir diese mit Ihrem Text. Aus Ihren Antworten berechnet unser System eine Empfehlung für ein Kursniveau.</p><p>Jeder Test erhält einen zufällig erzeugten Zugangsschlüssel. Er ist Teil der Adresse, unter der Sie den Test fortsetzen und Ihr Ergebnis aufrufen können. Wer diese Adresse kennt, kann das Ergebnis einsehen; bewahren Sie den Link daher sorgfältig auf. Er funktioniert, bis der Test gelöscht wird. Nach Abschluss des Tests werden unsere Mitarbeiterinnen und Mitarbeiter per E-Mail benachrichtigt und prüfen die Empfehlung in unserem internen Arbeitsbereich. Die Benachrichtigung enthält weder Ihren Namen noch Kontaktdaten, wohl aber Ihre Antworten auf die Einstiegsfragen, die berechnete Empfehlung und den Zugangsschlüssel zu Ihrem Ergebnis.</p><p>Das Ergebnis ist eine Kursempfehlung, kein Zertifikat, und es gibt kein Bestehen oder Nichtbestehen. Über Ihre Einstufung entscheidet eine Lehrkraft; eine ausschließlich auf automatisierter Verarbeitung beruhende Entscheidung im Sinne von Art. 22 DS-GVO findet nicht statt. Hat eine Lehrkraft die Empfehlung bestätigt, können unsere Mitarbeiterinnen und Mitarbeiter das Ergebnis Ihrem Eintrag in unserer Personenkartei zuordnen, etwa wenn Sie uns bei der Anmeldung Ihren Ergebnislink zeigen.</p><p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DS-GVO, da der Test auf Ihren Wunsch der Auswahl eines passenden Kurses dient. Außerdem werten wir die Antworten ohne Bezug zu einzelnen Personen aus, um die Testaufgaben zu verbessern. Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. f DS-GVO; unser berechtigtes Interesse liegt in einem verlässlichen Einstufungstest.</p>
```

English:

```html
<h2 id="placement-test">15. Online placement test</h2><p>Our online placement test lets you have your level of German assessed. You do not need an account for it, and you do not have to give your name or email address to take the test. We do not store your IP address with the test.</p><p>We process your answers to three introductory questions (your previous German learning, your learning goal and when you last used German regularly), your answers to the test items including the order in which the answer options were shown to you, an optional writing sample, and the language, times and progress of the test. If you include details about yourself in the optional writing task, they are stored with your text. From your answers our system calculates a recommended course level.</p><p>Each test is given a randomly generated access key. It forms part of the address at which you can continue the test and view your result. Anyone who knows this address can see the result, so please keep the link safe. It works until the test is deleted. When you finish the test, our staff are notified by email and review the recommendation in our internal workspace. The notification contains neither your name nor contact details, but it does contain your answers to the introductory questions, the calculated recommendation and the access key to your result.</p><p>The result is a course recommendation, not a certificate, and there is no pass or fail. Your placement is decided by a teacher; there is no decision based solely on automated processing within the meaning of Art. 22 GDPR. Once a teacher has confirmed the recommendation, our staff can attach the result to your entry in our register of persons, for example if you show us your result link when you register.</p><p>The legal basis is Art. 6(1)(b) GDPR, as the test serves, at your request, to choose a suitable course. We also analyse the answers without reference to individuals in order to improve the test items. The legal basis for this is Art. 6(1)(f) GDPR; our legitimate interest lies in a reliable placement test.</p>
```
