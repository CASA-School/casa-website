# Group appointments and test email — 2026-09-17

Branch: `codex/groups-appointments-test-mail`, based on main `e588d07`.

**2026-09-17 release authorization: user has now requested push, merge and deployment of this version to the existing Azure website.**
Microsoft activation is deferred; the earlier permission question was not approved.

## User decisions

- Make the Town Musicians package names more prominent, without a decorative redesign.
- Ina's consultation popup: **Monday–Thursday, 10:00, 10:30, 13:00 and 13:30**;
  each appointment lasts 30 minutes, in Europe/Berlin time.
- All website form notification recipients are **admin@casa-bremen.de during testing**.
  Preserve applicants' entered addresses in their records. Do not send to them during testing.
  (Still true in test mode: a confirmation meant for the sender goes to admin@ instead.)
- CASA uses Microsoft 365. Change recipients before public-domain launch.

### What the notification email looks like — 2026-10-01

Built by `buildFormMail` in `src/lib/notifications/form-mail.ts`; `notifyForm` only delivers it.

- **Language of the form.** A German form writes a German email, an English form an English one,
  including the reply it prepares. The group-enquiry fields use the contact form's own wording
  (`src/config/forms/organiser-brief-copy.ts`), so staff read the words the sender chose.
- **Brand.** The CASA logo, rendered from the master SVG in `src/components/ui/logo.tsx` to a PNG
  (`src/lib/notifications/casa-logo.ts`) and sent as an inline attachment (`cid:casa-logo`), so
  Outlook never blocks it as a remote image. One accent, CASA blue; the red, blue and sun triad
  stays in the logo, as on the website. Headline in a serif (Georgia, standing in for the site's
  display face), body in Arial.
- **Structure.** The form and the time received; a headline; one sentence saying who wants what
  („Maria Rossi hat sich für den Kurs „Intensivkurs Deutsch“ angemeldet.“); highlights such as
  „Visum benötigt“ or „Gastfamilie gewünscht“; one button; then labelled sections with empty
  fields left out. Footer: reference, language, whether the workspace also stored it, and the
  CASA address.
- **The button.** „Maria antworten“ opens a reply to the sender, greeting them by salutation
  („Sehr geehrte Frau Rossi,“). For an appointment it is „Termin bestätigen“: a confirmation in the
  guest's language with the date, time and duration filled in and one bracketed line, how the
  conversation takes place, for the contact person to complete before sending. Job applications
  and placement results have no button; they point to the workspace.
- **Subjects** say what and who: `Kursanmeldung: Maria Rossi – Intensivkurs Deutsch`,
  `Terminanfrage: Jonas Becker – Donnerstag, 8. Oktober 2026, 10:30 Uhr`, `Bewerbung: <Stelle>`,
  `Einstufungstest: Empfehlung B1.1`. `[TEST] ` in front, and a yellow line in the body, while
  testing. No access key or token in any subject.
- **Responsive.** Up to 640px wide; below 620px the rows stack (label above value), the margins
  narrow and the card runs edge to edge. A ghost table holds the width in desktop Outlook.
  Light mode only (`color-scheme: light only`). Everything the sender typed is escaped.

Previews of all seven emails in both languages, desktop and phone: `output/review/form-emails/`
(gitignored).

### Confirmation to the sender — 2026-10-01

Rahman: „we have to send a confirmation, a nice one, it shows we care and we are working on it."
Contact, group and company enquiries, course and exam registrations, appointment requests and job
applications now send the person a branded confirmation in the form's language
(`confirmToSender` in `forms.server.ts`, copy in `src/lib/notifications/confirmation-copy.ts`).

- **Who receives it.** In test mode `admin@`, with a yellow line naming the address it would have
  reached. In live mode the sender. Sent only once the route has accepted the submission.
- **Replies** go to the team mailbox for that form (`FORM_RECIPIENT_<KIND>`), so the sender mailbox
  stays the one address Exchange lets the website use. No new Exchange permission needed.
  Applications are the exception: their alert goes to the shared info@, so an applicant's reply
  goes to `FORM_REPLY_TO_CAREERS`, a management mailbox. **Live, a form with no reply mailbox
  sends no confirmation** (set `FORM_RECIPIENT_*` and `FORM_REPLY_TO_CAREERS` before go-live).
- **Launch gate:** do not switch to live mode before `casa-bremen.de` serves this build; the
  footer and privacy link name that domain.
- **What it prints.** The greeting name (checked: letters only, no links, digits or mixed scripts)
  and only what the server produced or checked: catalogue labels (course, dates, classes, location,
  accommodation type, exam, exam date, exam part), the validated appointment slot, the published
  position title (looked up by slug, not taken from the request), the reference. Never the
  message, notes, topic, allergies or any other free text. A name with a link, digits or an
  address in it gets the neutral greeting.
- **Abuse limits.** At most three confirmations per inbox in 24 hours (`+tags`, Gmail dots and
  googlemail.com count as one inbox; per replica, in memory, deleted after 24 hours), and at most
  30 an hour and 200 a day per replica overall, on top of the per-client rate limits. A failed send
  gives its slot back. Over a limit the submission still succeeds; only the receipt is skipped.
- **No copy kept.** Confirmations are sent with `saveToSentItems: false`; the staff alert keeps
  its Sent Items copy as before.
- **Wording.** A receipt, never an acceptance: a course or exam registration becomes binding only
  with CASA's own confirmation, and an appointment only once the contact person confirms it.
  There is no fixed time promise: the copy says „so bald wie möglich" / "as soon as we can" (the
  on-screen messages say „zeitnah"). Written by three independent drafts,
  judged and checked for truth, German and English (2026-10-01).
- **On screen** the form adds „Eine Eingangsbestätigung ist per E-Mail zu Ihnen unterwegs." only when
  the confirmation really went to the sender (never in test mode).
- Privacy policy §14, §16, §17 and §20 describe it.

### Recipients after testing — Rahman, 2026-09-30

| Form | `FORM_RECIPIENT_*` | Mailbox |
| --- | --- | --- |
| Contact | `CONTACT` | `info@casa-bremen.de` |
| Group and company enquiries | `GROUPS` | `info@casa-bremen.de` |
| Course registration (incl. accommodation) | `COURSE` | `online@casa-bremen.de` |
| Exam registration | `EXAM` | `online@casa-bremen.de` |
| Placement test result | `PLACEMENT` | `online@casa-bremen.de` |
| Appointment request | `APPOINTMENT` | the contact person who holds the consultations — for group consultations, **Ina Eismann's mailbox** (address still to come). She confirms each appointment herself by email |
| Job application alert | `CAREERS` | `info@casa-bremen.de` in the first phase. The alert names the position and a reference only; the application itself is read in the workspace by management |

`bewerbungen@` is being retired. The privacy policy (§17) states this routing, so a change here
is a change there (`docs/PRIVACY_POLICY.md`).

## Evidence, cause and implementation

The decision-rail booking buttons were inert. There was no calendar service or email sender
connected. Contact/course/exam endpoints could return success after only logging a submission;
registration routes also logged simulated confirmation emails.

- Package names now use the existing display face as larger headings; descriptors are secondary.
- Ina's button opens a bilingual, responsive Radix dialog with month navigation, disabled
  unavailable days, four half-hour starts, contact details, privacy acknowledgement and receipt.
  Keyboard focus moves between steps; Escape restores focus to the trigger.
- `/api/appointments` validates dates and inputs on the server. PostgreSQL's unique slot constraint
  arbitrates concurrent requests. Reservation, person, staff enquiry and activity trail commit
  together. The availability response contains only unoccupied times; occupied times and
  all personal details are omitted.
- Appointments appear in the existing group enquiries queue (`source=group-appointment`).
  The message contains the local time, duration and visitor's note. They are **requests awaiting
  Ina's confirmation**, not Outlook events. No video link is invented; since 2026-10-01 the request itself is acknowledged automatically,
  and the appointment is still confirmed only by Ina's personal email.
- ASSUMPTION: dates run from tomorrow through six weeks ahead. `GROUP_APPOINTMENT_BLOCKED_DATES`
  accepts comma-separated local dates for holidays/closures. Confirm these with Ina before launch.
- To cancel during the pilot, staff records the cancellation in the enquiry; an operator removes
  only that request's row from `group_appointments`. Keep the enquiry/activity history.
  There is no self-service cancellation, rescheduling or Outlook calendar synchronisation yet.
- `notifyForm` centralises Microsoft Graph mail for contact, group/company, course, exam,
  careers, placement and appointments. Test mode is the default and always selects admin@.
  Legacy webhooks are bypassed during testing because their downstream recipients are uncontrolled.
- Microsoft email uses the Azure Container App managed identity, with no new password or package.
  Graph's 202 response means accepted for sending, not verified inbox delivery.
- Failed notifications do not discard stored enquiries. Contact/course/exam requests now return
  503 if **neither storage nor delivery succeeded**. Since 2026-10-01 the sender also gets a
  confirmation, see below.
  A job-application alert names only the position and a reference; the application and CV are
  read in the workspace.
- `/admin/settings` shows test/live mode and whether the Microsoft connection is configured.

## Connected and delivering to admin@ — 2026-10-01

- **Exchange:** Rahman signed in (device code, as r.shafiee@casa-bremen.de) and the commands below
  ran once. Service principal `CASA website`, management scope `CASA website test sender`
  (`PrimarySmtpAddress -eq 'admin@casa-bremen.de'`), role assignment `CASA website test Mail.Send`.
  `Test-ServicePrincipalAuthorization`: admin@ in scope; **info@ and online@ not in scope**.
  No Entra/Graph Mail.Send was granted.
- **Azure:** `FORM_DELIVERY_MODE=test`, `FORM_MAIL_FROM=admin@casa-bremen.de`,
  `FORM_MAIL_IDENTITY_CLIENT_ID` set on `ca-casa-website` (revision 0000022; kept by every
  `deploy.sh` run, which only swaps the image).
- **Received in admin@'s inbox** from revision 0000023: contact (German), course registration
  (German), exam registration (English), placement result (English). Outlook on the web renders
  the HTML as designed. Group appointments and job applications need the database; their emails
  were checked as rendered previews only.
- The sender shows as „admin“. For live mode a dedicated sender mailbox (for example
  `website@`) would read better in staff inboxes; it needs its own scope, as above.

## Connection state before 2026-10-01 — not delivery-ready

Read-only Azure checks on 2026-09-17:

- `ca-casa-website` in `rg-casa-website-prod` still has only NODE_ENV and NEXT_TELEMETRY_DISABLED
  configured. It has no production database or mail sender settings.
- Existing user-assigned identity: `id-casa-website-prod`.
- Client ID: `d49137f1-c4e0-41d0-bcf0-67e46e7aa99a`.
- Principal object ID: `258d9eb8-71b7-493a-bc5c-5e08067821b6`.
- Graph app-role assignments are empty. Exchange Application RBAC was not inspected or changed;
  its independent permissions cannot be inferred from that empty Graph response.
- **No actual notification email has been sent or verified. No Microsoft permission, production
  environment, DNS, live database or production code was changed in this task.**

### Concrete Microsoft connection to review

Use the website identity, not the separately scoped CLAP/student-app sender. The intended test
sender and sole test recipient are admin@casa-bremen.de. First verify this address resolves to
an Exchange mailbox, and inspect any existing Exchange assignment for the website principal.
Then grant only `Application Mail.Send` with a resource scope restricted to that mailbox.
Do not add an unscoped Entra Mail.Send grant alongside it.

Proposed commands for an authenticated Exchange administrator (not executed):

```powershell
Get-EXOMailbox -Identity admin@casa-bremen.de
# Create only if an equivalent pointer/scope/assignment does not already exist.
New-ServicePrincipal -AppId d49137f1-c4e0-41d0-bcf0-67e46e7aa99a -ObjectId 258d9eb8-71b7-493a-bc5c-5e08067821b6 -DisplayName 'CASA website'
New-ManagementScope -Name 'CASA website test sender' -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'admin@casa-bremen.de'"
New-ManagementRoleAssignment -Name 'CASA website test Mail.Send' -App 258d9eb8-71b7-493a-bc5c-5e08067821b6 -Role 'Application Mail.Send' -CustomResourceScope 'CASA website test sender'
Test-ServicePrincipalAuthorization -Identity 258d9eb8-71b7-493a-bc5c-5e08067821b6 -Resource admin@casa-bremen.de
Test-ServicePrincipalAuthorization -Identity 258d9eb8-71b7-493a-bc5c-5e08067821b6 -Resource info@casa-bremen.de
```

The first mailbox must be in scope; the second must not be. Then configure the approved deployment:

```text
FORM_DELIVERY_MODE=test
FORM_MAIL_FROM=admin@casa-bremen.de
FORM_MAIL_IDENTITY_CLIENT_ID=d49137f1-c4e0-41d0-bcf0-67e46e7aa99a
```

Azure supplies IDENTITY_ENDPOINT and IDENTITY_HEADER. Never copy tokens or headers into files.
Verify one synthetic submission per form and actual inbox receipt before calling delivery ready.
If notifications fail, review the saved workspace queues; there is no automatic mail retry queue.

Sources: [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0),
[Container Apps managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity?tabs=portal,http),
[Exchange Application RBAC](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac).

## Before public-domain launch

1. Connect the production database and apply migrations, including `0015_group_appointments`.
2. ~~Complete the Microsoft connection and verify receipt at admin@~~ done 2026-10-01 for contact,
   course, exam and placement; appointments and applications once the database exists.
3. Confirm Ina's closure dates and who handles confirmation/cancellation. If she wants automatic
   Outlook invitations and busy-time sync, connect her calendar before changing the request wording.
4. Obtain permanent recipients and set every FORM_RECIPIENT_* variable listed in `.env.example`.
   Set FORM_DELIVERY_MODE=live only after owner approval and delivery tests. Verify any retained
   legacy webhook's recipient rules separately. Record the approved addresses and change date here.
5. Finish the photo, operational-content and legal approval work. Review existing dependency alerts.
   Test the deployed website, back up TYPO3 and plan the casa-bremen.de domain cutover.

## Verification

- `npm run build`, `npm run lint`, `npm run typecheck`: passed.
- `npm run test`: 399 passed in 41 files, including schedule/DST, validation, double-booking response,
  strict test routing, Microsoft rejection and no false contact acknowledgement.
- `E2E_PORT=3000 npm run test:e2e -- --workers=2`: 40 passed; three existing planner database
  cases skipped because DATABASE_URL is not supplied to that test process.
- Local existing PostgreSQL: migration 0015 applied. Two simultaneous actual API submissions
  produced 201 and 409, one enquiry/reservation/activity entry, and removal from availability.
  All synthetic records were then removed by their test marker.
- Browser QA: desktop calendar, mobile date/time/details and receipt; real availability endpoint,
  stubbed submission only for the browser receipt test. Actual persistence tested separately above.
- Microsoft transport requests were mocked in unit tests. Actual inbox delivery remains blocked by
  the unconfigured sender connection; do not describe the mocked result as email delivery.

Verification logs, screenshots and the local concurrency check are archived outside deployment at
`/Users/rahmanshafiee/Archive/CASA/group-appointments-2026-09-17/`.
German 320px and English 390px checks showed no horizontal dialog overflow; focus returned to
the booking button after Escape (after the Radix close animation completed).

## Contact form follow-up — local only

Evidence: the form combined a decorative badge/gradient, prompt chips, uppercase labels,
long introductory copy and a three-stage receipt timeline. Its pale form and sidebar had little
visual separation. Group/company topics expanded every optional briefing field immediately.

Changes: plain white form against the canvas, dark contact panel with readable white text,
clearer input borders, sentence-case labels, shorter EN/DE copy and message placeholder, solid
submit button, optional briefing disclosure, privacy link and concise receipt. Removed the
unsupported one-business-day response claim. Browser autofill is enabled; validation focuses
and describes invalid fields and presents basic errors in German on the German page.

Files:
- `src/components/forms/contact-inquiry-form.tsx`
- `src/app/(site)/[locale]/contact/page.tsx`

Verification: build, lint and typecheck pass; 399 unit tests and 40 e2e pass. The same three
existing planner tests skip because DATABASE_URL is not configured in the test process.
Browser checks cover desktop EN, DE at 390px/320px, collapsed/expanded optional briefing,
validation focus, preserved draft after a simulated 503, and the concise receipt after a simulated
successful submission. No actual email or submission was sent. Evidence is in the `contact-form`
subfolder of the external verification archive above. No push, merge or deployment.

### Contact-page simplification, follow-up

Removed the large hero, trust badge and redundant jump button. Kept a compact H1 and
breadcrumbs, with the form immediately underneath. The contact panel is top-aligned on the
right from 768px, spans to the site's right gutter on wide screens and stacks below on phones.
Topics are now six categories in EN/DE: courses, exams, accommodation, groups, company courses
and other questions. Existing specialist topic aliases map into the relevant category; group
and company briefing behavior remains intact.

Updated the existing smoke assertions to check direct access to the form instead of requiring
a marketing hero. Build/lint/typecheck, 399 unit tests and 40 e2e passed; the same three
planner DB cases skipped (test process has no DATABASE_URL). Browser checks confirmed alignment
at 768/900/1440px, phone stacking at 390px, six options in both languages and representative
legacy topic mappings. No push, merge, deployment or email activation.
