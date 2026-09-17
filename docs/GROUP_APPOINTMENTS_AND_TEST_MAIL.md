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
- CASA uses Microsoft 365. Change recipients before public-domain launch.

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
  Ina's confirmation**, not Outlook events. No video link or automatic confirmation is invented.
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
  503 if **neither storage nor delivery succeeded**. No applicant confirmation mail is sent.
  Career CVs stay in the database; their notification includes metadata, not the attachment.
- `/admin/settings` shows test/live mode and whether the Microsoft connection is configured.

## Verified connection state — not delivery-ready

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
2. Complete the Microsoft connection above and verify actual receipt at admin@ for every form.
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
