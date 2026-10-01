# Privacy policy — the new website's own text

`/privacy` (`/datenschutz`) no longer shows the old site's policy word for word. Since
2026-09-30 it is CASA's own text, in German and English, written against what the code
actually does. The general sections (introduction, §1 definitions, §21 rights, §25 legal
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
5 Cookies · 6 Fonts and external content · 7 Social and map links · 8 Contact and group
enquiries · 9 Internal handling · 10 Course registration · 11 Accommodation · 12 Allergies ·
13 Exams · 14 Job applications · 15 Placement test · 16 Group appointments · 17 Email
notifications · 18 Assistant and search · 19 Recipients · 20 Storage periods · 21 Rights ·
22 Complaint · 23 Legal basis · 24 Legitimate interests · 25 Legal requirements ·
26 Automated decisions. Every `h2` has an `id` (`#health-data`, `#storage-periods`, …),
the same in both languages.

## Facts the text states (settled, 2026-09-30)

- Microsoft nonprofit subscription for the gGmbH; processor Microsoft Ireland Operations Limited.
- Mailboxes: contact and group enquiries → `info@`; course, exam and accommodation
  registrations and placement results → `online@`; appointment requests → the responsible
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
- Logs: Log Analytics `log-casa-prod`, Germany West Central, 30 days (verified 2026-09-30);
  no Application Insights on `ca-casa-website`.

## True only once the launch setup exists

The text describes the site as it will run on `casa-bremen.de`, not the current test revision.

- **Database**: Azure Database for PostgreSQL in **Belgium Central**, backups ≤ 35 days (§3, §19, §20).
  None is provisioned yet. The subscription blocks PostgreSQL in Germany West Central (checked
  2026-09-30, as `docs/AZURE_DEPLOYMENT_PLAN.md` says); the website and the logs stay there.
- **Mail**: Graph mail from a CASA mailbox, `FORM_DELIVERY_MODE=live`, and every
  `FORM_RECIPIENT_*` set to the routing in §17. During testing all mail goes to `admin@`.
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
5. Deletion: nothing is deleted on a schedule, in the code or in the mailboxes. §20 promises
   periods. Needs scheduled deletion in the workspace and Microsoft 365 retention rules on
   `info@`, `online@`, the contact person's mailbox and the sender's Sent Items.
6. Host families: by which channel they receive the learner's details, and whether they sign
   a confidentiality undertaking.
7. Longer storage of applications "for future vacancies" (§14) needs a consent box that does
   not exist yet — build one or drop the sentence.

**For a lawyer**

8. Legal bases throughout, the allergy consent (Art. 9(2)(a) GDPR), and whether submission
   under a server-enforced consent is enough proof or a stored timestamp is needed.
9. No cookie banner: the § 25 TDDDG reasoning in §5.
10. Placement test and Art. 22 GDPR (§15, §26): a teacher decides, the system recommends.
11. Data protection officer: none is named. Check § 38 BDSG (20+ people constantly
    processing personal data, counting teachers who use the workspace or the mailboxes).
12. Whether the DGD generator licence needs the credit kept for the carried-over sections.
13. Facebook and Instagram pages: a separate notice for possible joint controllership with Meta.

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
retention period is a change to this policy: check §10–§20 in the same PR.
