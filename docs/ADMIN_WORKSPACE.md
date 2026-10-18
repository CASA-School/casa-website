# The CASA staff workspace

`admin.casa-bremen.de` · `/admin` in this repository

Read this before touching anything under `src/app/(admin)`, `src/lib/admin` or
`src/components/admin`.

---

## What it is, and what it is for

An internal tool for CASA's administrative staff. Everything a visitor sends
through the public site now lands in a queue here with a **status** and an
**owner**, instead of leaving the building as a webhook POST that nobody could
query.

Five queues, one job each:

| Screen | Answers |
| --- | --- |
| **Overview** | Is anything waiting on me? |
| **Enquiries** | Who has written to CASA and not been answered? |
| **Registrations** | Who has signed up, for which cohort or sitting, and what do they still need? |
| **Placement** | Which Einstufungstest recommendations is a teacher yet to confirm? |
| **Applications** | Where is each job application in the pipeline? |

Plus three reference screens: **Courses & exams** (live demand against the
published catalogue), **Activity** (who changed what), **Team** and
**Settings**.

### What it is not

- **Not a replacement for FileMaker yet.** It is the system that will replace
  it, growing around it (`docs/FILEMAKER_BRIDGE.md` §0). Since migration 0007
  the workspace keeps its own person register and a `filemaker_links` table
  for the bridge to point rows at their FileMaker counterparts; nothing writes
  those links yet. Until it does, the workspace and FileMaker are two records
  of the same person.
- **Not the removed portal.** The role-based student/teacher portal that used to
  live in this repository is gone and is not coming back. This is a
  staff-facing operations tool with three roles, no learner-facing surface, and
  no relation to that code.
- **Not a mail client.** Every "Reply" button is a `mailto:`.

---

## Running it locally

```bash
npm run db:up        # Postgres 17 in Docker, on port 5433
npm run db:migrate   # schema, including 0006 to 0011
npm run db:seed      # baseline catalogue, plus CASA's rooms and locations
npm run db:seed      # baseline public data (courses, exams)
```

Then put the connection string in `.env.local`:

```
DATABASE_URL=postgres://casa:casa_local_dev@127.0.0.1:5433/casa
```

### Without a password, on your own laptop (2026-10-15)

`ADMIN_DEV_LOGIN=1` in `.env.local` (git-ignored) and `next dev`: opening
`http://localhost:<port>/admin` signs in as the first active owner — no password
(an address instead of `1` picks that account). It is an ordinary session, so
every check behind sign-in still runs. It does nothing in production, nothing on
`127.0.0.1` (the real sign-in stays there, and the e2e suite uses it), and
nothing for a connection from another machine. `next dev` listens on the local
network, though, and a client can fake the two headers it reads, so switch it
off on a shared network. Binding the dev server to `127.0.0.1` would close that
but crashes Next 16's dev runtime on server actions. `src/lib/admin/dev-login.ts`.

### Your first account

There is no bootstrap route and no default password. The first account is
created deliberately, from a shell, by someone who already has the database
credentials:

```bash
ADMIN_EMAIL=you@casa-bremen.de ADMIN_NAME="Your Name" npm run admin:seed
```

With no `ADMIN_PASSWORD` it generates one and prints it **once**. Pass
`ADMIN_PASSWORD=...` to choose your own. Running it twice reports that the
account exists rather than resetting anything — use the Team screen for that.

That account is an **owner**, the workspace's super admin: on the Team screen
an owner adds accounts (one at a time, or the office team in one go), sets
anyone's password, its own included, changes roles and deactivates. Only an
owner can make or remove another owner, and the last active owner cannot be
removed.

**When no owner can sign in**, set a new password from the shell. It changes
the password and closes that account's sessions, nothing else:

```bash
ADMIN_EMAIL=you@casa-bremen.de npm run admin:password
```

On Azure the same runs inside the network as a job:
`ADMIN_EMAIL=… ADMIN_PASSWORD=… ./infra/azure/db-job.sh password`.

Sign in at `http://localhost:3000/admin`, with your full name or your address.

### Plausible records to look at

```bash
node scripts/admin/seed-demo.mjs            # 6 enquiries, 8 registrations, 3 placement attempts
node scripts/admin/seed-demo.mjs --clear    # remove exactly those again
```

This is **not** in `db/seeds/`, and that is deliberate: that directory gets
applied to real databases, and fake people do not belong in a real queue. Every
row it writes is tagged `source = 'demo-seed'` and every person it creates
`created_by = 'demo-seed'`, so `--clear` removes those and nothing else. One
exam candidate is deliberately seeded with a demonym ("Turkish") so the
`nationality_unmatched` flag path is visible.

It refuses to run with `NODE_ENV=production`, or when `DATABASE_URL` points
anywhere but `localhost`, `127.0.0.1`, `::1` or the compose service `postgres`,
and prints the target host before it writes. The go-live runbook runs
`db:migrate` and `db:seed` from a shell aimed at the production server; this
keeps a mistyped command in that shell from filling real queues with fake
people. For a deliberate demo on a staging server, pass
`--i-know-this-is-not-local`.

### Everything from scratch

```bash
npm run db:reset     # drops the volume, re-migrates, re-seeds, recreates the owner
```

---

## How the two products share one application

There are two products in this repository. Both are one Next build and one
container.

```
src/app/
├── (site)/        the public marketing website — its own root layout
├── (admin)/       the staff workspace — its own root layout
│   └── admin/
│       ├── sign-in/          OUTSIDE the gate, or it redirects to itself
│       └── (workspace)/      everything behind the gate
└── api/           public route handlers (no layout)
```

`src/app` has **no `layout.tsx` of its own**, and that is what makes the split
possible: Next allows a second root layout only when the app root has none. Both
groups therefore declare `<html>` and `<body>` themselves. Route groups are not
URL segments, so every public path is unchanged and the workspace answers on
`/admin/...`.

They share the design tokens in `src/app/globals.css` and nothing else — no
navigation, no footer, no locale provider, no structured data.

### Host routing

`src/proxy.ts` (Next 16.3's replacement for `middleware.ts`) does two things:

1. On `admin.casa-bremen.de`, `/` **rewrites** to `/admin`, so the browser stays
   on `admin.casa-bremen.de/enquiries` and never shows `/admin`.
2. On the public host, `/admin/*` **404s in production**. This is the important
   one: without it, `casa-bremen.de/admin/sign-in` is a login form on the domain
   every prospective learner visits. It rewrites to `/de/admin/…`, the site's
   German 404, which is where any unknown German path is rewritten too, so the
   `x-middleware-rewrite` header does not single it out. Until 2026-09-23 the
   target was a fixed `/de/_casa-not-found`, a marker no real missing page had.

The proxy's matcher skips paths that look like files, for speed on the public
site, so `/admin/:path*` is a second matcher entry: until 2026-09-23
`/admin/enquiries/x.y` skipped the proxy and reached the workspace on the
public host. `host-routing.test.ts` calls `proxy()` for that path.

Before either rule, `www.casa-bremen.de` is sent to `https://casa-bremen.de`
with a 308, path and query kept; the apex is the canonical host.

`next.config.ts` adds `X-Robots-Tag: noindex, nofollow` to every response on
any host other than `casa-bremen.de` and `www.casa-bremen.de` — so the admin
host, the Container Apps FQDN and any staging name are never indexed,
including `/robots.txt` and files the proxy does not see.

Local development is exempt from rule 2, because there is no `admin.localhost`
by default and requiring one would mean editing `/etc/hosts` to open the
dashboard. `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true` reopens it on a production
deployment — for the window between shipping the container and pointing the
admin DNS record at it, and no longer.

**`proxy.ts` is not authentication.** It decides which host serves which tree.
It runs before the request reaches the app, with no database connection, and
cannot verify a session.

---

## Security model

Four checks, and each is load-bearing on its own.

### 1. The layout gate

`src/app/(admin)/admin/(workspace)/layout.tsx` resolves the session and
redirects to `/admin/sign-in` when there is none. Every workspace screen is a
child of it, so a page cannot forget to check. So is a path no screen claims:
`(workspace)/[...rest]` only calls `notFound()`, so signed out it redirects to
sign-in like any screen, and signed in it gets `(workspace)/not-found.tsx`
inside the shell. Without it the public site's `[locale]/[...rest]` took
`admin` for a language and answered with the site's head.

Since 0014 there is a second entry with the same gate:
`src/app/(admin)/admin/(focus)/layout.tsx`, which renders the shell in focus
mode (icon rail, no 1180px measure) for the course-planning board. Since 0019
there is a third, `src/app/(admin)/admin/(editor)/layout.tsx`, with no shell at
all, for the website editor (docs/WEBSITE_EDITOR.md); Offers used it too until 2026-10-17 and are in
`(workspace)` now. All three layouts call
the one `requireStaff()` in `src/lib/admin/guard.ts`, so "signed in" is still
defined once; what differs is the chrome, never the check.

The website editor adds one public route, `/api/cms/preview`, which switches
draft mode on for the editor's iframe. It sits on the public host because the
iframe's page is served there, and it opens nothing without a short-lived token
the editor page signed for a colleague holding the `website` module
(src/lib/cms/preview-token.ts). Draft mode shows drafts, never workspace records.

### 2. Every server action checks again

A server action is a public HTTP endpoint. Nothing about a POST to one goes
through the layout that rendered the form, so the gate does not protect it.
Every exported action in every `'use server'` file under `src/app/(admin)`
(`actions.ts`, `team/actions.ts`, `kursplanung/actions.ts` and the rest)
resolves the actor through `requireModule(<module>, <level>)` from
`src/lib/admin/guard.ts` before it awaits anything else, and asks for `full`
when it deletes, removes, voids or cancels. `src/lib/admin/__tests__/host-routing.test.ts`
finds the action files itself and asserts all of this, so a new file cannot be
forgotten.

### 3. The CV download route checks for itself

`applications/[id]/cv/route.ts` is a route handler, not a page, so it is not a
child of the layout either — nor of `applications/layout.tsx`. It checks the
session AND the Applications module itself (a colleague without the module gets
a 404, the same answer as for an id that does not exist), logs the access, and
serves the bytes as `application/octet-stream` with `Content-Disposition:
attachment` and `X-Content-Type-Options: nosniff` — never the uploader's own
MIME type, because an SVG or an HTML file masquerading as a CV would otherwise
be stored XSS against every signed-in colleague.

The download name is not the uploaded name either: the extension is the one
the file's bytes justify, and anything but letters, digits, spaces and `._-`
is replaced (`src/lib/admin/cv-file.ts`). The upload itself is refused unless
the declared type, the extension and the leading bytes all agree on PDF
(`%PDF-`), DOC (`D0 CF 11 E0 A1 B1 1A E1`) or DOCX (`PK 03 04`).

Activity is open to every colleague and applications are not, so the Activity
screen lists applicants, and trail entries about applications, only for
someone who holds the Applications module.

### 4. Sessions are server-side

`staff_sessions` holds the SHA-256 of a 32-byte random token, never the token.
A signed self-contained cookie cannot be revoked before it expires — signing
out would be cosmetic, and a laptop left on a train would stay logged in.
A session ends **twelve hours after sign-in**, the cookie's own lifetime, and
use does not extend it. Until 2026-09-23 `expires_at` slid forward on every
request, so a copied token replayed at least twice a day never expired;
`last_used_at` is still written, at most once every five minutes.

### Sign-in throttling

`signIn` writes the attempt to `staff_sign_in_failures` (0016) and then counts
the recent rows, **before** it looks up the account or runs scrypt, and refuses
with the ordinary sign-in error when either limit is exceeded:

| Keyed on | Limit |
| --- | --- |
| The address typed, trimmed and lower-cased | 10 failures in 15 minutes |
| The client address (the last `X-Forwarded-For` hop, which the Container Apps ingress appends) | 30 failures in 15 minutes |

**Written first, counted after, as two statements.** The first version counted
first and wrote the failure after the ~100 ms scrypt, so every attempt sent
while an earlier one was being checked read the same count: in the 2026-09-23
review, 100 parallel wrong passwords for one address all got through. Now each
attempt's row is committed before it counts, so no more than the limit get past
however many arrive at once. Repeated bursts of 30 parallel wrong passwords for
one address against a local server never left more than 10 rows. Under
contention it errs towards refusing.

A refused attempt deletes the row it wrote, so it leaves nothing behind, costs
an insert, a count and a delete instead of a 64 MiB scrypt, and says nothing
about whether the account exists. A failed attempt's row stays: the address
typed, the client address and the time — never anything typed as the password.
A successful sign-in deletes that address's failures, and every successful
sign-in deletes failures older than a day. The per-client limit is the higher
one because the whole office signs in from one address.

**Two password checks at a time per replica** (`SIGN_IN_MAX_CONCURRENT_VERIFICATIONS`).
Each check is a 64 MiB scrypt on one of libuv's four threadpool workers, on the
replica that also serves the public site, and the limits above do not bound a
burst spread over many addresses typed. An attempt that finds both slots taken
is refused at once with the ordinary error, and its row deleted, rather than
queued.

The trade-offs, accepted:

- Someone who knows a colleague's address can keep it locked by failing ten
  times every fifteen minutes. The lock lifts by itself fifteen minutes after
  the attempts stop, and nothing in the workspace lifts it sooner. Two-factor
  sign-in, not a higher limit, is the answer to that.
- During a flood, a colleague with the right password can be refused because
  both slots are taken. Trying again works once the flood stops.
- The per-client limit counts whatever address is typed, so thirty failures
  from one public address refuse every sign-in from it for fifteen minutes,
  correct passwords included. Nobody on the internet can do that to CASA's
  address — the client address is the hop the ingress appends — but anyone
  behind it can. **ASSUMPTION: CASA's learner Wi-Fi reaches the internet
  through the same public address as the office** (`src/lib/api/rate-limit.ts`
  assumes a class shares one), so one learner device could lock the whole
  office out. Check the egress addresses before go-live; if they are shared,
  split them, or count the per-client limit only against addresses typed that
  match no account.

The check **fails closed**: if the row cannot be written or the table cannot
be read, nobody can sign in and the server log says `sign-in throttle check
failed`. Apply 0016 before deploying a build that contains it.

### Response headers

`next.config.ts` sends, on every response of both products:
`X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`
(the confirmation dialogs cannot be clickjacked from a frame), HSTS for a year
without `includeSubDomains` (other casa-bremen.de subdomains are not this
deployment's to bind), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy`
denying camera, microphone, geolocation and payment. `X-Powered-By` is off.
No script-src policy yet: that needs a nonce strategy for Next's inline
scripts.

### Passwords

scrypt from `node:crypto` (`N = 2^16`, `r = 8`), encoded with its own
parameters so the cost can be raised later without a migration:

```
scrypt$65536$8$1$<salt base64>$<hash base64>
```

One rule: **8 characters, of anything** (`MIN_PASSWORD_LENGTH`, 2026-10-10;
it was 12). The office team keeps the password it already uses for FileMaker,
which an owner sets on the Team screen, and Microsoft — CASA's tenant, with its
own policy and MFA — is the stronger way in. No composition rules — they
measurably push people towards `Casa2026!` and are not in NIST 800-63B any
more.

`signIn` returns null for every failure — unknown name or address, wrong
password, deactivated account, an account with no password yet — and verifies
against a throwaway hash when no account matched, so an unknown name costs the
same ~100 ms as a real one. Response time leaks nothing and the form is not an
account-enumeration oracle.

### Signing in (2026-10-10)

A colleague types **their full name or their Outlook address**, and their
password — or uses **Sign in with Microsoft**.

- **By name.** Migration 0020 gives every account a `username` (the full name
  by default; the Team screen can change it) and a folded `username_key`:
  lower case, accents and spacing folded, ß as ss (`src/lib/admin/sign-in-names.ts`).
  „natalia sostres" finds „Natália Sostres"; „Mueller" finds „Müller", the exact
  spelling winning if both exist. Two active accounts cannot share a key.
- **By address.** Matched case-insensitively against `email`.
- **No password yet.** An account can be created without one
  (`password_set_at` is null): the colleague signs in with Microsoft until an
  owner sets a password. The Team screen marks it „No password yet".
- **Microsoft** (`src/lib/admin/microsoft.ts`, routes under
  `/admin/auth/microsoft`). OpenID Connect against CASA's own Entra ID tenant,
  authorization code with PKCE; state, nonce and verifier ride in a signed
  ten-minute cookie. The id token's signature is checked against the tenant's
  published keys, then issuer, audience, tenant, expiry and nonce. No Microsoft
  token is kept. The account is found by `microsoft_oid` once linked, and on a
  first sign-in by the Outlook address, which links it. An address no active
  account has is refused: Microsoft proves who someone is, the Team screen
  decides whether they are staff. „Unlink Microsoft" on the Team screen undoes
  a link.
- **Configuration.** `AUTH_MICROSOFT_TENANT_ID`, `AUTH_MICROSOFT_CLIENT_ID`,
  `AUTH_MICROSOFT_CLIENT_SECRET` (and `AUTH_MICROSOFT_REDIRECT_URI` to pin the
  callback). Without them the button is not shown. `infra/azure/entra-workspace-app.sh`
  creates the single-tenant app registration „CASA Workspace" (scopes `openid
  profile email`, admin consent) and puts the secret on the Container App;
  `--local` also writes the three values to `.env.local`.
- **The office team.** Owners add them on the Team screen, one line per person
  („Full name, Outlook address") in „Add the office team": staff role, the
  website editor at the chosen level, no password. They sign in with Microsoft
  at once, or by name once their password is set.

### Roles, modules and levels

The workspace is a set of **modules**, registered once in
`src/lib/admin/access.ts`: overview, enquiries, registrations, placement,
applications, people, private_data, bookings, offers, organisations, groups, accommodation, rooms, prices, catalogue,
kursplanung, website, staff, staff_private, activity, team, settings. For each
module a person holds a **level** — `none`, `view`, `edit` or `full`. `view`
opens the screens, `edit` creates and changes, `full` also deletes and does
the irreversible things. A role sets the default level per module; a
per-person exception (`staff_module_access`, 0008/0009) overrides one module
for one account. Three places read the resolved access and nothing else
decides it: the sidebar (what to show), each module's `layout.tsx` (what to
serve — every module directory has one, asking for `view`), and every server
action (what to execute, asking for the level the mutation needs). Hiding a
link is not access control.

| Role | Default |
| --- | --- |
| `staff` | `view` on Overview and Settings; `edit` on Enquiries, Registrations, Placement, Students, Bookings, Organisations, Groups, Accommodation, Courses & exams, Activity; `none` on Applications, Rooms, Prices, Kursplanung, Website, Offers, Staff, Staff records and Team |
| `admin` | `full` everywhere, and sets other people's levels on the Team screen |
| `owner` | The above, plus granting the owner role |

Overview and Settings never drop below `view`; Team is never granted by
exception. Changing someone's levels ends their sessions, so a narrowed set
takes effect at once. The Team screen shows the matrix and edits it for
`staff` accounts.

### The booking wizard

`/admin/people/<id>` → **New booking**, and the same wizard from a course
registration with the cohort already chosen. Five steps, each narrowing the
next, because that is the order a colleague asks a learner:

1. **What** — a course, or an exam on its own.
2. **Which** — the course types that have upcoming cohorts, then only that
   type's cohorts, each with its weeks, session, seats free and price.
3. **Level & books** — the level (prefilled from the cohort when it has one),
   then *how much of it*: `A2` is taught as `A2.1` then `A2.2` and one book
   covers one half, so "the whole A2" adds both books and "A2.1 only" adds one.
   Then: do they want the book? The right books appear, priced, and any one of
   them can be unticked.
4. **Accommodation** — no, or a bookable type with room, catering and dates
   prefilled from the cohort.
5. **Review** — every line with its amount, the total, and the few remaining
   fields under *More*.

**No prices on this screen, deliberately.** A colleague booking a learner is
choosing what they get, not quoting them, so the wizard shows no amounts and no
total. Every price is already set in Settings; showing it here would be noise
and a chance to disagree with the record. The cost appears **once the booking
exists** — per line and as a total — on the booking itself and in the student's
Bookings list.

`priceSelection()` on the server decides every amount: the enrolment fee, each
book and an exam entry from `rates`; the course fee from the cohort's rate, or
the catalogue's published price when no rate covers it yet.
`booking_charges.rate_id` records which rate produced each line, which is why a
rate that has priced a booking cannot be deleted. `bookingOffer()` reads the
catalogue for the wizard's choices — and carries no money the wizard can show.

**Bildungszeit is booked into two intensive classes (2026-10-17).** Rahman:
Bildungszeit is not a course of its own; a learner with a Bildungsschein sits in
a morning and an afternoon intensive course at once (SchoolMan's
*Superintensivkurs*, the same pair of bookings). In the wizard, „Bildungszeit
German" asks for the week (KW, Monday to Friday, closures left out) and one or
two weeks, then „In welche Kurse?": the two intensive classes running that week
— the newest start at its first half (`B1.1`) and the previous start at its
second (`B1.2`), the morning one first — each level with its free places for
exactly those weeks. Choosing one half takes the same level's other half for the
other class. A full class is marked and said in the review; „Trotzdem buchen"
stays possible, as for any course (no waiting list: it is a week, not a course).
The booking is of the Bildungszeit course and has one period per class, each on
the course whose class it is; when a new course starts within two weeks, the
second week is its own part with that week's two classes (four periods). The fee
is Bildungszeit's for the weeks, or else what it is: the intensive course's
price for twice the weeks (one week 280 €, two 520 €). Places count it in its
weeks only: a level's booked places are now **the most learners in any one
week** (`BOOKED`, `waitlist.ts`), which for a full-course booking is the same
number as before. Code: `bildungszeit-rules.ts` (pure, tested),
`bildungszeit.ts`, `createBildungszeitBooking` in the bookings actions.

**What the front desk audit changed (2026-10-17).** A walk-in: „+ Neu →
Buchung" asks who (`/admin/people?new=1&then=book`), creates the person and
opens the wizard (`/admin/people/<id>?book=1`; the person page also reads
`sitting`, `parts`, `cohort` and `level`, so an exam sitting's „Buchen", an
enquiry's or an accepted offer's „Buchung anlegen" arrive with their choice
made). A web registration opens the wizard with its wish chosen — the level, „Das
ganze A2" for „A2 komplett", and the accommodation („Gastfamilie" is
`with_germans`, „bei Deutschen"; „WG" is `shared_flat`). The list of starts says
what staff choose by: Vormittag or Nachmittag, an evening term's weekdays, free
places, and „geschlossen" for a closed level. „Das ganze …" is offered only on an
intensive start from a `.1` step; „Nur A2.1" books its four teaching weeks, and
joining at a `.2` step books to the end of the running course; the server works
the dates out itself (`bookedPeriod`, `booking-levels.ts`). The enrolment fee is
charged once: the tick starts unticked for a learner who has studied here before
(the offers module's rule). The stay defaults to the day before the course to the
Saturday after (`stayAround`), so an 8-week course pays 8 weeks of rent, priced
by the offers module's rule (`rentPrice`). Cost lines are written in German
(`name_de`), and a letter in English translates them; a whole level reads
„Intensivkurs A2.1–A2.2" on the booking and its letter.

**Joining a running course (2026-10-17).** A start that has begun is offered with „läuft, noch N
Wochen" and asks **„Einstieg ab"**: its remaining Mondays (closures skipped), the next one chosen. The
server decides the period from that Monday (`bookedSpan`, `booking-levels.ts`) and refuses a week that
is not offered. In an intensive course weeks 1–4 teach `X.1` and weeks 5–8 `X.2`: from the fifth
teaching week the step is `X.2`, on **that start's own course** (`resolveCourse` with the period's
dates; changing a booking's level passes them too). The fee is the price list's for the weeks from the
join; a course with its own price (an evening term, a module) is charged its share of class days —
pending Rahman's confirmation. Links: `/admin/people/<id>?book=1&cohort=<start>&level=<code>&from=<monday>`
(`from` only for a running course). Not yet: free places from the join week on (the wizard reads the
course's busiest week overall), and a waiting-list place for a joiner.

**Accommodation is part of the booking, not only a cost line** (0013). The type,
room, catering and dates are columns on `bookings`, so the answer is kept even
though CASA has published no accommodation rate yet; a `booking_charges` line
appears once a rate does cover it.

The booking's edit dialog holds the stay too (type, room, meals, arrival,
departure); saving replaces the rent line the workspace priced, and leaves lines
typed by hand. Once a period sits on a course start, the booking's course type is
locked. A stay booked here keeps one stay record in step with the booking (0070,
`syncOwnStay`), so it is on **Aufenthalte** with SchoolMan's and is placed there
(§Accommodation); the bookings list has no stay view of its own any more. A payment is recorded with an empty amount (a
chip fills what is open) and what it is for: Anzahlung, Restzahlung, Kurspreis,
Unterkunft or Sonstiges. A booking's money says what it is: Offen, Anzahlung
erhalten, Ohne Kosten, Bezahlt, Überfällig.

### Create, edit, delete

Every module that holds records offers the three, the way FileMaker does, with
two differences. Forms open in a **dialog** (`FormDialog` in
`src/components/admin/dialogs.tsx`) from a button in the page header, so a list
stays a list. And every destructive action goes through **`ConfirmSubmit`**: a
button inside the form that opens a confirmation, and on confirm submits the
form with a hidden `confirmed=1` that the server action checks — a request that
skipped the dialog is refused, so the confirmation is not only visual.
**Dialogs (2026-10-17).** One shape for every popup. A form dialog has a head
(title, an optional line on what it is about, an optional subject icon on its
tint), the form, and the form's **`DialogFooter`**: Cancel and the one primary
action on the right, a quiet secondary action (`start`, e.g. „Zurück" in the
booking wizard) on the left. The footer is pinned to the foot of the window
while a long form scrolls, and while the form is being sent its submit button
shows a spinner and takes no second click (`useFormStatus`). Outside a dialog
the same footer is a plain right-aligned row. A confirmation names the
consequence beside a red or ink icon; Cancel has the focus, and the final
destructive button is solid red. Widths: `sm` 440 px (confirmations), `md` 512
(a handful of fields), `lg` 672 (two columns, the wizard). The panel lets what
opens inside it overflow — a date picker's calendar is never cut off — and the
window scrolls, not the panel. A date field opens its calendar on a click or ↓,
not on focus, so a dialog that focuses its first field does not cover the form;
typing a date (`17.10.`) works as before. Triggers carry `data-dialog` (`form`
or `confirm`), which the popup inventory script uses to open every popup.

Deletes are soft where history matters (`people.deleted_at`,
`bookings.deleted_at`; a room is removed outright because nothing refers to it
once its cohorts are moved; a payment is voided, never deleted). Today: people
(add, edit, delete), bookings (create, edit, extend, cost lines, payments,
cancel, delete), cohorts (schedule, assign room), rooms (add, edit, delete),
staff accounts (add, deactivate with confirmation).

**Deleting a person hides them; it never erases (2026-10-16).** „Person
löschen" (people `full`) marks the row with who deleted it and when; every
list, the search and the matching of new website registrations leave it out.
It is refused while other records are linked into the person, and while the
person has bookings — the bookings list and what is owed skip a deleted
person's bookings, so a learner who still owed money would vanish with it; the
button is not offered then. Teilnehmende → **„Gelöscht"** (the same right)
lists who was deleted, when and by whom, with „Wiederherstellen", which brings
the person back with everything that pointed at them. A real erasure for a
data-protection request is not built: it waits for a named privacy owner and a
retention period (Open items).

### Navigation

**Today** on its own at the top, then three collapsible groups:

| Group | Holds |
| --- | --- |
| **Inbox** | Enquiries, Registrations (→ Courses, Exams) — what the public site sent, waiting to be worked |
| **School** | Students (→ Placement tests), Bookings, Offers, Courses, Exams — the records the school keeps. Offers sit in the frame like the rest since 2026-10-17 (docs/OFFERS.md) |
| **Management** | Applications, Activity, Team, Settings (→ Prices, Lists, Rooms) |

Nine top-level items, and the placements are the argument:

- **Setup is not navigation.** Rooms, the type lists and the price list are
  defined once and left for a season — a room's capacity does not change on a
  Tuesday — so they live under **Settings**, at the bottom, sharing one tab
  strip. Rooms moved from `/admin/planning` to `/admin/settings/rooms` and the
  module is called `rooms`, because "planning" described a screen that turned
  out to be setup.
- **The placement queue appears only where the test runs (2026-10-16).** It
  reviews CASA's own online placement test, which is closed on the live site
  (the Klett tests are used), so a rail item for it was a screen nobody's day
  passes through — Rahman asked why it sat under Students at all. The item and
  the overview's card now show only where a deployment has switched the test on
  (`placementTestSwitchedOn()`, the explicit `CASA_ENABLE_PLACEMENT_TEST`, not
  the development default), and then under **Posteingang**: its results come in
  from the website and wait for a teacher, like an enquiry. A learner's own
  placement results stay on their page under „Anfragen & Buchungen", and the screens stay
  reachable by address.
- **Courses and Exams are two items, not one screen with a tab strip.** A term
  of courses and a telc sitting share a catalogue table and almost nothing
  else. The old `CatalogueTabs` is gone: the rail makes that choice now, and
  offering it twice was the clutter.
- **Job applications sit in Management**, and `staff` accounts do not get that
  module by default — an administrator grants it per person.
- The register is labelled **Students**, the word the team uses, and the screen
  says the same. A rail label and a page title that disagree is a bug.

### Overview — the start page (2026-10-14)

`/admin` is a clean start page: a greeting, and shortcut cards into every area
the colleague may open, grouped as the sidebar is (Inbox, School, Management).
Cards follow access: someone without Offers sees no Offers card.

A card (made premium on request the same day): an icon on a soft gradient tile
with a fine inner edge, the area's name, and **one live figure** — "5 open",
"18 in the register", "1 current", "20 cohorts ahead", "Next sitting 16 Oct",
"Planned to September 2026", "In force since 1 Jan 2026", "6 colleagues",
"8 changes today" — plus a pill when something is waiting: new enquiries and
registrations (blue), offers to follow up and website releases to approve
(amber). Every figure is counted as its own screen counts it
(`getOverviewFacts` in `overview.ts`, one round trip), so a card and the list it
opens never disagree. Layered shadow, a 3px lift and a navy arrow on hover
(none with reduced motion); two columns on a phone, four on a wide screen.

Rahman, 2026-10-14: "delete the today page for now, i think, we have been
looking at things the wrong way … both today and rota, delete it. Instead we
need a overview or a start page that is basically like any other dashboard,
just a clean interface with some shortcut cards". So the day board, the week
"control room" modelled on FileMaker's home calendar, the day view and the
rota were removed on that date. **Their tables stay**: `day_tasks` (migration
0012) holds whatever the team wrote; the rota's migration was never deployed
and was withdrawn. More goes on the overview later, one thing at a time.

The fortnight trend and the newest inbound records moved to **Activity**. Both
look backwards, and a daily screen that also carries last week's chart is a
screen nobody reads twice.

CASA cannot be left with no active owner; the workspace refuses the change that
would do it. **Deactivation, not deletion** — a deleted account takes its name
out of every `assigned_to` and leaves the activity trail pointing at nobody.
Deactivating revokes access on the spot (every live session is closed) and
keeps the history readable. There is no delete button.

Every colleague changes their own password on **Your account** — their name in
the foot of the sidebar opens it (`/admin/account`, 2026-10-10): current password, new one
twice; the session in use stays open and every other one is closed. An account
with no password yet sets its first one there without the current field. There
is no emailed reset link: it would need outbound email the workspace does not
have, and a reset link from an address nobody monitors is a security hole
dressed as a feature. A forgotten password is reset by an owner or admin on the
Team screen, and an owner's from the shell (`npm run admin:password`).

---

## Progressive disclosure

Every form asks first for what makes the record valid and useful, and reveals
the rest on demand. The plain-form convention makes this cheap: a collapsed
`<details>` element needs no JavaScript. Concretely — creating a room asks for
location and name; nickname, floor, kind and capacities open under *More*, and
everything is editable on the room's own page. Screens follow the same rule:
a list shows the summary, the record page shows the detail. FileMaker's
layouts with every field visible (`Course` has 173) are what this replaces.

## Forms reveal themselves

There is no "More / Less" toggle anywhere. A toggle asks a colleague to decide
whether they want to see fields before they know what the fields are, and then
to click — the interface admitting it does not know what matters.
`OptionalSection` (`src/components/admin/optional-section.tsx`) watches the
fields that *do* matter and opens once they hold a value: type a name and an
email into **Add a person** and salutation, date of birth, nationality and
phone are simply there.

It reads the form's DOM through a `useSyncExternalStore` snapshot rather than
holding form state, so the fields it wraps stay server-rendered and
uncontrolled — any form can use it by naming its required inputs. The server
snapshot is open, so a render without JavaScript shows every field.
`alwaysOpen` is for editing and for a final review step.

## The sidebar is the frame (2026-10-13)

Rahman, on the white sidebar with the large logo and "Workspace" under it, and
the pale-yellow active item: "do you think professional saas dashboards
sidebar looks like this … this is very bad". The frame is now what every
professional tool looks like (`shell.tsx`):

- **A deep navy sidebar** (`--ws-rail`, a step deeper than FileMaker's navy,
  which the team knows), so the white pages read as the lit work area and the
  frame recedes.
- **The head:** the word "CASA" set in the workspace's display serif, nothing
  else (Rahman, 2026-10-14: "for the logo, just write CASA and nothing else at
  this point"; an app icon and the school's logo were both tried first), and the
  collapse toggle. Folded, the word sets smaller over the toggle. The sidebar's
  navy deepens from top to bottom (`--ws-rail-top` → `--ws-rail`).
- **Navigation:** 32px rows, icons at 17px, labels at 68% white; one highlight
  on the screen — the item you are on, a soft fill with its icon in CASA's light
  blue; a parent whose sub-page is current reads as the branch in white, not as
  a second filled row; chevrons only on hover or when a branch is open; group
  labels in sentence case with air above them.
- **The foot:** Settings (rooms, the lists, the prices — set up once a season,
  so at the foot as in every tool; on a phone it stays in the strip).
- **A slim top bar on a desktop (2026-10-14, Rahman: "a top nav but very sleek
  and elegant for some of the functionalities"; `top-bar.tsx`).** 56px of glass
  over the canvas — the page's own ground, a fine line under it — aligned with
  the page's 1180px measure. On the left the search (`command-search.tsx`, ⌘K,
  Ctrl K or "/"): a name, an email address or a number, and Enter opens
  the record — students, enquiries, registrations, offers, bookings, job
  applications, and since 2026-10-18 groups, organisations (also by a contact) and
  places to stay (also by someone of the family), each only for a colleague who
  holds that module (`src/lib/admin/search.ts`), five a kind. On the right „Neu" (a
  booking, an offer, a person, a cohort, a group, an organisation, a place to stay —
  what this colleague may create; `?new=1` opens the form on its page), DE | EN, and who is signed in: their initials and first name open
  a menu with Your account, the website and sign-out. Navigation stays in the
  sidebar, which is now navigation and nothing else. On a phone the navy band is
  the top bar: the logo, the language, search and the initials (the same account
  menu), then the destinations as a scroller.

**There are no counts in the sidebar.** The numbers beside Enquiries,
Registrations and Placement were queue backlogs, not notifications, and a
permanent number next to a label reads as nagging (the overview's cards carry
what is new, once). When a notification system has a real source
— something happened, to a record you own, since you last looked — it belongs
in the top bar, beside the person. Until then there is no bell.

### Collapsing

`SidebarToggle` (in the sidebar's head) writes `data-workspace-nav` on the root element
and the folding is CSS in `globals.css`; `src/app/(admin)/layout.tsx` applies
the stored value before first paint, so a colleague who works collapsed never
watches the rail fold itself. The rail's links and groups know nothing about
it — they carry `data-nav-label` on whatever is text — which keeps a piece of
chrome out of a dozen components.

**Smoothness is the point.** The aside animates its width (200ms, ease-out) and
labels *fade* (120ms) rather than vanish: `display: none` would snap the text
away a frame before the rail moved, which is exactly the jolt a collapse must
not have. Each link clips its own overflow, so a fading label is cropped by the
shrinking rail instead of wrapping under its icon. Only things with no icon to
fall back on — group headings, nested lists — are removed, and those go a beat
*after* the width settles. Collapsed, the rail is 4.25rem of centred icons with
hairlines where the group headings were, and every link carries its label as a
tooltip. The word "CASA" sets smaller and stays; search keeps its icon, the
foot Settings, the avatar and sign-out.

Desktop only: on a phone the rail is already a scrolling strip.
`suppressHydrationWarning` on `<html>` is required and deliberate — the
pre-paint script writes an attribute the server render does not have.

## Design standards

**The look is the offers module's (2026-10-13).** Rahman asked for the whole
workspace to be restyled the way Offers was built (docs/OFFERS.md §Design):
white framed cards on the canvas, headings in the sans at 800, an icon chip in
a meaning colour on a card's header (red the course and level, blue dates,
stay and status, yellow notes and the programme, green a person or money in,
ink the rest), and records that open with a framed head — `RecordHeader` in
`ui.tsx` — whose bar of facts holds the four or five things a colleague looks
for first. A value that changes is shown as a value and changed in a small
panel (`popover.tsx`: status and owner in the record rail), and every date is
typed or picked in the workspace's own field (`date-picker.tsx`), never the
browser's. The sidebar is white, like the toolbars of the editor and Offers.

The rules, each of which came from a real defect on a real screen.

1. **A section is one white block; the canvas between sections separates
   them.** A card's header is white with a rule under it. It used to be
   `--ws-sunk`, which was within 1.01:1 of the page canvas — so the gap above
   a card and the header of the next card resolved to the same grey and two
   stacked sections merged into one strip. The surface ladder is now white 1.0
   → `--ws-sunk` 0.90 → `--ws-canvas` 0.84 in relative luminance, roughly
   1.08:1 a step, and `--ws-sunk` appears only *inside* a card (table headers,
   toolbars, a card footer) where it reads as a sub-level.
2. **A field title is a label, not an eyebrow.** `DetailList` and a
   `Table`'s column heads are 12px sentence case in `--casa-muted`. They were 10.4px bold
   uppercase with letter-spacing — decoration doing a functional job, slower
   to read and, beside a value and a badge, genuinely hard to parse. There are
   no uppercase eyebrows left: a page's title says where you are, and the way
   back above it says where from.
3. **One primary button per screen.** Two dark buttons in a header make the
   consequential action and the routine one look equally weighty.
4. **Plumbing does not get a badge.** A counter in the rail, or a titled card
   above a search box, advertises a problem the team may not have — there is
   one open record flag in the database, a demonym. Flags show on the record
   they belong to and as one quiet line on the register.
5. **No raw identifier, and no raw value, on a screen** (tightened 2026-10-13).
   A uuid is not shown at all, not even in a card footer. A machine value
   gets its label: an exam is "telc Deutsch C1 Hochschule", not
   `telc_c1_hochschule`; a placement background answer reads "Some courses",
   not `some_courses`; an activity is a sentence, not `week.saved`.
6. **Say a thing once.** A record's facts bar does not repeat what the rail
   changes (owner and status live in the Status card); a card does not repeat
   the facts bar (a booking's dates); a list does not repeat what its tab
   already says (no "Needs a teacher" badge on every row of *Awaiting a
   teacher*); a badge marks the exception, not the normal case (no "Bookable"
   on every room, no "scheduled" on every cohort); the same thing done again
   and again in a row is one line in Activity, with how often.
7. **Destructive actions do not shout.** A record's header holds its one
   primary action and a few quiet ones; Delete and Cancel sit at the foot of
   the page as quiet buttons, and only their confirmation is red.
8. **A list reads by time.** Cohorts group by month, placement attempts by day
   (the latest 25, then *Show all*); an inbox row is the topic with its
   message under it. A list never carries a grid of inputs: a cohort's room is
   text that opens a small panel, and a colleague's access is a dialog per
   person (Team), not a matrix of selects.
9. **No subtext the team already knows** (Rahman, 2026-10-13). A choice is
   its name: "Intensive German", "Afternoons", "26 Oct 2026", "B2 complete" —
   not "20 lessons a week · from 520 €", "Mon–Thu 13:00–17:30", "until 18 Dec",
   "· 8 weeks". No page subtitle under a page title, no card description, no
   panel subtitle that restates its label ("Of the letter", "Only staff see
   these"). A line under something stays only when it carries what the
   colleague cannot see or know otherwise: which books, why the enrolment fee
   applies, how many days an offer still holds, a confirmation's consequence,
   an input's format. The letter to a learner still states hours and dates in
   full — that is for the learner, not the team.

### FileMaker's navy (2026-10-13)

Rahman asked for the colours to lean "a little towards filemaker so staff don't
feel too strange". What stayed after the control room was withdrawn: FileMaker's
navy `#1f3e6c` is the workspace's primary action and its colleagues' initials
(`--casa-ink-deep` inside `.casa-workspace`; text stays near-black), and the
sidebar is a deeper navy (`--ws-rail`). The public site is untouched.

## The top of a page, and a record's head (2026-10-14)

Rahman: "now improve the top of the pages and the lists too". A list page's
head is the title at 28px, tight, with its actions level with it. A record's
head (`RecordHeader`) is clean white — the tinted wash it had is gone — with
the person's initials large and tinted beside the name (`avatar`), the status
as a soft pill, and the facts bar on a faint ground under a hairline. The way
back is a small rounded pill ("← All bookings"). Badges everywhere are soft
rounded pills with a fine edge instead of solid blocks of colour.

In lists, a record's initials are softly tinted — the same tint for the same
name, so a person is recognisable down a list; a colleague's stay navy. A list
without views says what it holds where the tabs would be ("18 students"), and a
row shows a quiet arrow at its end when pointed at.

### A record in tabs (2026-10-16)

Rahman: the person page, and the teacher, staff and organisation pages to come,
should not put everything on one screen — a few tabs, the most important
information in the first, and it should feel advanced. `record-tabs.tsx` is the
pattern: `RecordTabs` wraps the page and holds the open tab, `RecordTabList` is
the strip on the head's lower edge (`RecordHeader`'s `tabs` slot: icon, label, a
count where it helps, a navy line that slides to the open tab), and each
`RecordTabPanel` is one tab. The head stays the same on every tab — name, how to
reach them, the figures, the actions — so a colleague never loses whose record
it is.

- Every panel is server-rendered and stays mounted, only hidden: switching is
  instant, and a half-typed note survives a look at another tab.
- The open tab is in the address (`?tab=details`), so a reload or a shared link
  lands on it; the first tab has a clean address. A form sent from a tab
  redirects to the record's plain address, and the page reopens on the tab it
  came from (remembered for the visit, in memory only).
- Keyboard: arrows, Home and End move along the strip; the line does not slide
  under `prefers-reduced-motion`. On a phone the strip scrolls sideways.
- A tab a colleague may not see is not rendered at all, not hidden: with the
  bank right withdrawn there is no „Bankverbindung" tab and no data in the page.
- **Names in the team's words** (Rahman, 2026-10-16: "use terms that are clear
  and understandable for staff"). A tab says what is in it — „Anfragen &
  Buchungen", „Bankverbindung" — never a word for how it is handled
  („Vorgänge", „Geschützt"). Access is the server's business: it is checked
  there and never announced on the screen.

The learner's tabs: **Übersicht** — the course they are in (week 3 of 8, as a
line) or the next one and how soon, what else is open, the last three closed
with „Alle anzeigen", and beside them anything to check and the notes;
**Anfragen & Buchungen** — everything under their name (enquiries,
registrations, placement results, offers, bookings), open and closed;
**Persönliche Daten** — person, contact, addresses, and the record itself
(created, source, FileMaker, linked records); **Bankverbindung** — the accounts
for a refund, which any colleague adds and corrects. The head's last figure is
„Offen", in words: „1 Anmeldung · 1 Buchung". A teacher's or an
organisation's page uses the same parts with its own tabs.

## Lists

**One design for every list (Rahman, 2026-10-13: "this list interface all over
is so basic and bad").** The Offers list showed why: one column held dates *and*
group sizes, the status column held a badge with a name and a date under it,
two money columns were half dashes, and the tabs counted zeros. The parts are
in `src/components/admin/list.tsx`; `Table`, `TableRow` and `Cell` in `ui.tsx`
are the body. Offers (`(workspace)/offers/page.tsx`) is the reference.

10. **A list is one white card.** Its views (tabs, underlined) and its search
    sit across the top of the card (`ListBar`); the rows follow; an empty view
    is one calm line inside the same card (`ListEmpty`), so the views stay in
    reach. Search is a magnifier until it is wanted, then a field that
    opens beside it and stays open while a search is in force, with a cross to
    clear it (2026-10-14); it submits on Enter — no Search button. A tab with nothing in it
    shows no count; a tab that only repeats a group of another view goes.
10a. **Views are few, clear, and each answers one question (Rahman, 2026-10-18: "don't add unnecessary
    filters but clear and useful filter in each section").** The default view comes first — what staff
    act on now, or „Alle" on a register —, the views a record moves through follow in that order, the
    archive (Inaktiv, Ehemalige, Storniert, Gelöscht) comes last, and „Alle" closes a work list. A record
    stands in one stage view, never in two that overlap. A view never repeats another screen's job:
    who needs a room is „Aufenthalte", not a bookings view; what is open under a person is worked in the
    inboxes, not a register view. One thing has one word everywhere („Zahlung offen" in Buchungen and
    Teilnehmende). A second dimension is a row of chips above the card (the kind of place on
    „Aufenthalte", the colleague on „Aktivität"), not more tabs. The lists as they stand:

    | List | Views (default first) | Also |
    | --- | --- | --- |
    | Anfragen, Anmeldungen, Bewerbungen | Letzte 7 Tage · Verlauf | the inbox design (§Lists 16); search finds everything |
    | Einstufungstests | Wartet auf Lehrkraft · Test läuft noch · Bestätigt · Alle | |
    | Teilnehmende | Alle · Kommend · Neu · Im Kurs · Letzter Kurs · Abgeschlossen · Zahlung offen · Gelöscht | |
    | Buchungen | Laufend · Kommend · Zahlung offen · Unter Beobachtung · Wiedervorlage · Vergangen · Storniert · Alle | search by name, booking number or course |
    | Angebote | Offen · Angenommen · Nicht angenommen · Alle | |
    | Gruppen | Kommend · Angefragt · Vergangen · Abgesagt · Alle | |
    | Unterkünfte | Alle · Gastfamilien · CASA-WGs · Weitere · Inaktiv | |
    | Aufenthalte | Kommen bald · Wohnen jetzt · Reisen bald ab · Bleiben nach dem Kurs · Noch ohne Unterkunft | chips: Alle · CASA-WGs · Gastfamilien |
    | Organisationen | Alle · Agenturen · Firmen · Schulen & Behörden · Weitere · Inaktiv | |
    | Kurse | Intensiv · Abend · Weitere · Kursarten | Aktuell / Vergangen |
    | Wartelisten | Platz frei · Wartend · Angeboten · Kurs begonnen · Abgeschlossen | |
    | Prüfungen | — (coming sittings, then the past) | |
    | Mitarbeitende | Aktiv · Unterricht · Büro · Ehemalige | |
    | Aktivität | — (by day) | chips: Alle · each colleague in the feed |
    | Räume | In Nutzung · Inaktiv | |

11. **A column holds one kind of thing.** The record — its initials, its name,
    a quiet reference beside the name, and under it what it is about
    (`RecordName`) — then when, how much, who has it, how recent. Never a
    status with a name and a date under it, never dates and group sizes in one
    column, never two money columns where one says it. Money is one figure, in
    whole euros when there are no cents (`euros`); dates are a range in short
    months with the year only when it is not this one (`dayRange`).
12. **Group by what to do; then the group is the status.** An open queue reads
    in groups (`ListGroup`): to follow up, sent, drafts; new, in progress,
    waiting on them. No row repeats its group's word in a status column. Where
    a status column remains (a list that cannot group), it is a dot and the
    word (`Status`), not a boxed badge; a badge marks an exception on one row
    ("Room needed", "Group brief").
13. **People are initials.** The record's initials are light; a colleague's
    are ink, small, with the name on hover and for a screen reader (`Owner`),
    so "who it is about" and "who has it" never read alike.
14. **An empty value is an empty cell**, not a dash; a row of dashes is noise
    that hides the one value that is there. Relative time ("Today", "3 days
    ago") for what happened; the date for what is planned.
15. **The head is a band; rows alternate (Rahman, 2026-10-14: "give them a clean
    background color so they look more prominent … use two colors, one per each
    row"; then "don't take the background blue color, take something else that
    matches the branding").** The column head sits on a band of CASA's warm
    cream (`--ws-head`, the site's `--casa-warm-soft` family, quieter) with its
    labels in a warm dark brown; rows are white and every other one a breath of
    that cream (`--ws-row-alt`), with no ruled lines between them, and a row
    that opens a record deepens on hover (`--ws-row-hover`). Cream against the
    navy frame, not a third blue. The alternation is counted past
    the group headings, which are white with a hairline above and their count
    in a small pill. It lives in `.ws-table` in globals.css, so `Table` and the
    catalogue's `OpenTable` share it; Kursplanung keeps its own tables.
16. **The three inboxes are one design (Rahman, 2026-10-15: "make them look
    more like enquiries and share same design pattern … if we change something
    it gets reflected all over these three similar interfaces too").** Enquiries,
    registrations (course and exam) and applications read the same way: the
    period, the state and the counts come from `src/lib/admin/inbox.ts` (one
    definition of the week, of open and closed, including the applications'
    older words „submitted" and „interview"), the list is `InboxScreen`
    (`src/components/admin/inbox.tsx`), and a record's page is built from
    `record-parts.tsx` — `StatusBar`, `OwnerControl`, `SubmissionCard`,
    `FactGrid`, `MetaLine`, `Timeline` — with the reply from
    `src/lib/admin/reply.ts`. A page only maps its records to an `InboxItem`
    (the title, two lines of preview, its badges) and chooses its facts. Change
    the inbox there, never in one page. What follows was first written for the
    enquiry queue and now holds for all three.
    The enquiry queue: the last seven days by day, the rest a history
    (Rahman, 2026-10-14: "per day format … when things are taking care of we
    could do completed so it doesn't show in the number of open enquiries", then
    "display only one week history and the rest should be more like a history
    that is hidden from interface but if the team wants to go back it should be
    possible").** „Letzte 7 Tage" is today and the six days before, one section
    per day on Bremen's calendar (`src/lib/admin/days.ts`: „Heute", „Gestern",
    then the date with how long ago), newest first; today always has its
    section, so a quiet morning says so. Each day is a card of inbox rows: who
    wrote, the topic, two lines of the message, the time, the language when it
    is not German (the one to reply in), who has it. A blue dot on the initials
    marks a new one; a new one older than two days shows its time in amber.
    „Erledigt" on a row closes it in one click (`updateStatusAction`, no
    confirmation — „Wieder öffnen" on the same row undoes it, setting it in
    progress); it stays under its day, quieter, and leaves every open count, so
    a day reads as what came in and what was dealt with, and its heading says
    „2 offen" or „alle erledigt". „Verlauf" is everything before the week, by
    month, one line each, filtered Alle / Offen / Erledigt, in pages. An enquiry
    from before the week that is still open is unfinished work, not history, so
    the week shows one amber line — „5 ältere Anfragen sind noch offen" — that
    links to them. A search looks through every week. The tallies under the
    title are the open states of any age. Spam is never listed. Rule 12's status
    groups still hold for the other queues.
17. **An enquiry's page (2026-10-14).** The head says who wrote and about
    what — the organisation and group size for a group, the address, the
    language — and its bar holds what a colleague changes most: where it stands
    (`StatusBar` in `record-parts.tsx`: Neu, In Bearbeitung, Wartet auf Antwort,
    Erledigt in one row, the current one lit, any other one click; Abgelehnt and
    Spam in the „Mehr" menu; two by two on a phone) and who has it
    (`OwnerControl`: „Zuständig: …", changed from a menu, „Übernehmen" takes it).
    Both menus are `ChoiceMenu` (`choice-menu.tsx`): Radix menus that float over
    the page and align to their trigger — a panel inside the header card was
    cut off by its edge (2026-10-15) — and post the choice to the same server
    action a form would. The message
    reads as an email — sender, address, date, subject, the text at reading
    size — with „Antworten" under it, a `mailto:` opened with „Re:" and a
    greeting and sign-off in the language the enquiry was written in, signed by
    the colleague. A group's or company's brief is grouped as a coordinator
    reads it (the group, the stay, the lessons, the invoice). Beside it: the
    person, earlier enquiries from the same address, and `Timeline` — notes and
    changes in one line of time, newest first, ending with the arrival: a note
    as the colleague's words in a cream card, a change of state as its two
    states in their colours, a change of owner as one short line, each with its
    mark; today's entries by the clock, older ones by the day. Secondary text on
    this page is `--casa-muted` (7.8:1), not the subtle grey. A registration's
    and an application's page are the same parts (2026-10-15): the sent
    registration is a `SubmissionCard` with a `FactGrid` (dates, level, room,
    visa; for an exam the name on the certificate first, marked until it is
    confirmed, then the sitting and the parts), the cover letter one with the
    CV beside „Antworten"; on a registration „Buchung anlegen" is the main
    action, so „Antworten" is a quiet one there.
18. **A person's page is the hub (2026-10-15).** Every enquiry, registration,
    offer and booking leads to it, so it answers the first questions about anyone
    without a search: the head names them with their address, phone,
    nationality and birthday as `MetaLine`, and its bar holds four figures — the
    level a teacher confirmed, their bookings, what they still owe („Zu
    zahlen"), what is open. Everything under their name is
    in one list — enquiries, registrations, placement results, offers, bookings
    — open first, then „Abgeschlossen", each with its kind's mark, where it
    stands and, for a booking, what is open or paid. Beside it what needs a look,
    their details („Angaben", every address and number, FileMaker links), the
    records linked into this one with an undo, and the same `Timeline` as the
    inbox records: notes on the person (migration 0026) and the changes to it,
    ending with how it came to be. The Übersicht's inbox cards count with
    `inboxCounts`, as the lists do.
19. **Einstufungstests in the same design (2026-10-15).** The placement queue
    is not an inbox — an attempt has no name until a teacher attaches a person,
    and its states are awaiting a teacher, confirmed, still testing — so it uses
    the inboxes' building blocks rather than `InboxScreen`: the tallies, the
    views in a bar, `DaySections` and `CardRow` from `inbox.tsx`. A row leads
    with the level where an inbox shows initials (blue recommended, green
    confirmed, grey still testing), then how sure the test is, how much was
    answered, and the learner's own account of their German. An attempt's page
    has the figures bar (`StatBar`: confidence, answered, the spoken check,
    whether it may settle by itself) in place of five tiles, the background
    answers as a `FactGrid`, and the shared `Timeline` in place of its own
    notes and history. The pilot line under the title stays (rule 6).
20. **Buchungen (2026-10-15).** The list keeps its table — money reads in
    aligned columns — and gains the counts line every list has: what is
    running, what is coming, and what is still owed across all bookings
    (`bookingsOwed`). A booking's page: the course, the dates and weeks, the
    stay and who pays as `MetaLine` under the name; the header's bar is the
    money (`StatBar`: total, paid, open) with a line that fills as it is paid;
    the periods, costs and payments stay ledgers; beside them what else
    belongs to the booking (where it came from, the stay's dates, its own note)
    and the shared `Timeline`, which gives each kind of change its own mark
    (money for payments and costs, a calendar for an extension).
    `Timeline` takes `canWrite`: a colleague who may only look sees the line
    of time without the note box, on every record page.

    **The team's colours (2026-10-16, migration 0028).** Every booking shows the
    colour the team knows from SchoolMan (`docs/schoolman/bookings.md`), worked
    out by `bookingLight()` and never typed: red when cancelled, yellow while a
    colleague has it *unter Beobachtung* (with a reason — Niveau, Visum,
    Anwesenheit, Unterlagen fehlen, Sonstiges — and a note), grey *Unklar* until
    the charges are paid in full, green when all is well. Only yellow is stored
    (`observation_reason`, who and when); setting and ending it are lines in the
    booking's history. The list has a „Stand" column (a dot beside the name on a
    phone) and the team's work lists: Laufend splits into „Enden bald" and
    „Laufen weiter", Kommend into „Starten bald" and „Später" (two weeks), plus
    the views *Unklar* and *Unter Beobachtung*. The booking's head shows the
    colour as a pill; a lifecycle badge only for Reserviert and Abgeschlossen.
    A cancelled booking's leftover is not shown as owed.

    **Booking numbers (2026-10-16, migration 0033).** Rahman: "give bookings
    their own numbers". „B-2026-0042": the year a booking was made and a running
    number in that year, like an offer's 2026-014 with a B so the two never read
    alike, and unlike SchoolMan's „1 | 23456 | 26" so the two systems' numbers
    cannot be confused while both run. A trigger hands it out on insert under an
    advisory lock (`assign_booking_number`), so every booking has one however it
    is made; `bookings.number` is the formatted, generated column. It stands
    beside the course on the booking's page, in the list's rows, on the
    learner's page, in the carry-over choices and in the letters, where it is the
    payment reference; the bookings list and the search find a booking by it.

    **Carry-over (2026-10-16, migration 0030).** A booking that holds a credit —
    paid over, or what is left of a cancelled one — says „… Guthaben" in its
    head pill and offers „Guthaben übertragen" (the payments card's primary
    button then): the credit goes to another booking of the same learner, linked
    records included, that is not cancelled. `carryOverCredit` writes two
    payment lines in one transaction — minus here, plus there, method
    `carryover`, one `transfer_id`, each naming the other booking as
    `counterpart_booking_id` — after locking both bookings, so a credit cannot
    be spent twice; it refuses more than the credit. Each line links to the
    other booking, and voiding either voids both (`docs/schoolman/money.md`).
    A payment recorded by
    hand with the method „Übertragen" remains for a credit that sits in
    FileMaker.
21. **Teilnehmende, the register (2026-10-15).** The views answer what staff
    bring to a register — Alle, then the learner stages in the order a learner goes
    through them, each learner in one (Kommend, Neu, Im Kurs, Letzter Kurs,
    Abgeschlossen; 2026-10-18), and Zahlung offen — with the counts line above them
    („im Kurs" there counts all three stages in a course), and a row says,
    beside the name and the course or address, the level a teacher confirmed
    (a green chip), what is open under the person (enquiries, registrations,
    offers in play, counted across linked records) and what they still owe.
    The birth date went to the person's page. `peopleCounts` and the
    `OPEN_CASES` / `OWED` / `IN_COURSE` fragments in `people.ts` are the one
    definition of each.

    **Learner stages (2026-10-16).** FileMaker's Rookie, Runner, LastDance and
    Unicorn, worked out from the booked periods by one SQL fragment (`STAGE`
    in `people.ts`) instead of typed: *Neu* (in a course whose first day was
    in the last four weeks), *Letzter Kurs* (in a course, nothing booked after
    it — the list to ask about extending), *Im Kurs*, *Kommend* (booked, not
    started), *Abgeschlossen* (all over). They are views of the register, a
    word in each row's line (left out where the view already says it) and a
    badge in the head of the person's page; the person's bookings carry the
    booking colours (§20).

    **What a list carries (Rahman, 2026-10-16).** A list shows what staff act on;
    the rest is on the record's page. The register lost its Nationality column
    for the dates of the course a learner is in or about to start; nationality
    and birth date are on the person's page, and an unrecognised nationality is
    still a flag above the list.

    **Everything about a learner (2026-10-16, migration 0029).** Rahman: all the
    information SchoolMan holds comes along, some of it is required for telc.
    The person's page shows second surname, nickname, place and country of
    birth, a birth year where the date is missing, mother tongue, occupation
    and passport number in „Angaben" (edited in the same dialog as the name);
    „Adressen" holds one address in Bremen and one at home, each changed in its
    own small dialog. Bank accounts (`bank_accounts`) have their own module,
    `private_data` („Bankverbindungen" on the Team screen), which the team holds
    since Rahman's correction the same day ("the staff should be able to write
    the information of the students like bank details"): `edit` adds and
    corrects an account, `full` removes one after a confirmation, and a
    colleague whose right is withdrawn does not see the tab at all. The history
    says that an account changed, never the number. The same migration's
    `person_private` — tax, pension and health-insurance numbers — is staff data
    from SchoolMan's employee records, not a learner's: it is not on the learner
    page and comes back on the staff pages, under a right of its own.
22. **Kurse and Prüfungen (2026-10-15).** They keep their month-grouped
    tables and gain the counts line: for courses the dates ahead, the places
    taken (as the seat bars count them) and the next start; for exams the
    sittings ahead, the entries and the next registration deadline, amber in
    its last week. A course type's format is stored as free words („Intensive
    Block", „evening") and is read through a bilingual map. The exam list keeps
    the last fortnight's sittings for what follows them, greyed and marked
    „Vorbei".
23. **The management screens (2026-10-15).** Aktivität reads as the record
    pages' timeline does: a section per day as the inboxes read, each change
    with its mark (`activityIcon`: by what it did, else by what it was done
    to), a change of state as its two states in their colours, the line a link
    to its record, runs of the same change counted. Listen shows each
    vocabulary's German names where the table keeps them (`name_de`), so the
    German view no longer reads „morning, afternoon" or „Enrolment fee". Dein
    Konto carries the language as a setting of the account (Deutsch | English,
    the same `/admin/lang` the top bar uses). Team, Einstellungen, Preise and
    Räume were already in the shared design and kept as they are.

## Organisations (2026-10-18, migration 0057)

The agencies, companies, schools and offices CASA works with, in „Organisationen" under Schule (module
`organisations`). An organisation has its name and kind (Agentur, Firma, Schule, Behörde, Sonstige),
address, country, the language CASA writes to it in, e-mail, phone, whether CASA still works with it, an
agency's agreement and a note; its contacts (`organisation_contacts`: salutation, name, job title,
e-mail, phone; one e-mail address per contact of an organisation); an agency's commission
(`agency_commissions`: a percentage of a kind of charge, „20 % auf Kurspreis"). A booking knows who
pays it (`bookings.payer_organisation_id`); a company's own course its company
(`courses.organisation_id`); a letter whom it went to. Imported ones are linked to SchoolMan in
`filemaker_links`; no screen shows that.

**List.** Views Alle, Agenturen, Firmen, Schulen & Behörden, Weitere and Inaktiv, with counts; a search
by name, e-mail or a contact's name or e-mail. A row: the name, its kind where the view does not say it
and the contact written to last; the country; how many contacts; how many bookings it pays that run
today or are still to come (`payer_organisation_id`, not cancelled or deleted, a day ending today or
later). Inactive ones are muted and listed last. „Neue Organisation" asks for the name and kind;
country, language, e-mail, phone and address open once both are in.

**An organisation's page.** The head: name, kind, „Inaktiv", country and language, e-mail, phone,
address; the figures Laufende Buchungen, Teilnehmende (distinct learners of those bookings), Kontakte
and, for an agency, Provision. Tabs: **Übersicht** (contacts and commission, each added, changed and
removed in a dialog; Vereinbarung and Notiz when written), **Buchungen** (those it pays: running and
coming, then the latest 25 earlier ones with „Alle anzeigen"; each with the booking's colour and what is
open), **Kurse** (a company's own courses), **Angebote**, **Briefe**. A tab shows only when it has
something in it, and only to whoever holds that module (bookings, catalogue, offers, and for a letter the
module its page asks for). A booking's page names the organisation that pays and links to it.

**Rights.** `view` reads; `edit` creates and changes an organisation, a contact or a commission term,
and sets it inactive or active again; `full` deletes an organisation, removes a contact or a commission
term, each after a confirmation. Staff hold `edit` by default; owners and administrators `full`.

**Rules.** An organisation CASA no longer works with is set inactive, never deleted: it keeps everything
and moves to „Inaktiv". „Löschen" is for one entered by mistake and is offered only while nothing names it — a booking, an
offer, a group, a course, a letter, an invoice, a commission, a payout, an internship place or a book
order (2026-10-18: a delete would unlink each one silently) — and it did not come from SchoolMan (the
import would bring it back); the action refuses otherwise and says what names it. Its contacts and commission terms go with it. Every
change is a line in Aktivität („hat eine Organisation angelegt", „hat die Provision einer Agentur
eingetragen", …); the trail says that a contact changed, never who.

**From SchoolMan (2026-10-18).**
`python3 -I scripts/filemaker/read_organisations.py | node scripts/filemaker/import-organisations.mjs [--dry-run]`,
after the learners: the agencies and companies the learner sample's bookings name, and the companies of
company courses ahead (the sample rule is `scripts/filemaker/sample.py`, shared with the learners'
reader). SchoolMan's party is a `Management` record with roles — `Agency`, `Corporate`, the name in
`Institution`; one organisation here per party, linked to all of them. Its own e-mail, phone and address
(the rows of no person), the people who work there with their job title, an agency's general commission
terms (`CommissionDetail`), who pays which sample booking (an agency over a company), the company
course's company and the letters that name it. Never `Management`'s comments (they hold credentials). A
match on SchoolMan's ids, else the same name and kind made here; fields fill only where empty. First
run: 12 agencies, 40 companies, 66 contacts, 12 commission terms, 1,164 bookings, 2,311 letters
(docs/schoolman/organisations.md). Since 0061 an organisation can also say what it is to CASA beyond a
client (`relation`: Praktikumsbetrieb, Multiplikator, Ausflüge und Aktivitäten, Lieferant oder
Dienstleister, Krankenkasse, Tandem-Schule, Handwerk und Umbau, Förderverein) — on its page under the kind,
in the list in place of it, „Für CASA" in the edit dialog; the reader brings SchoolMan's 71 such parties.
Since the group visits
(below) it also reads the schools, companies and agencies of all 52 of SchoolMan's groups: 17 agencies,
60 companies, 102 contacts in all. A second person at an organisation with an address another contact
there already has (a shared office mailbox) comes without it.

## Groups (2026-10-18, migration 0058)

Group visits — a school class, a company's team, an agency's group that comes together — in „Gruppen"
under Schule (module `groups`), between Angebote and Organisationen. A visit (`group_visits`) has its
name, its state (Angefragt, Bestätigt, Abgesagt), the school or company that sends it and the agency
that books it (both `organisations`), how many learners and escorts, their ages, the course type and band
(A1 … C2, B1+), the country, the stay (Anreise, Abreise) and the lessons in it, how it travels, and a
note. Its participants are learners with their own bookings (`bookings.group_visit_id`); a group with its
own class has its own courses (`courses.group_visit_id`). Whether a confirmed visit is over is read from
its dates, never stored.

**List.** Views Kommend (confirmed, not over — the default), Angefragt, Vergangen, Abgesagt and Alle,
with counts; a search by name, school, company or agency. A row: the name, the school or company and
„über" the agency; the country; the dates (the stay, else the lessons); how many come („20 + 2") and how
many of them are booked. Over and called-off ones are muted. „Neue Gruppe" asks for the name; who, when
and how many open once it is in.

**A visit's page.** The head: name, state („Vorbei" once a confirmed visit is over), the school or
company and the agency (linked for whoever holds Organisationen), country, ages, course type and band;
the figures Personen, Gebucht, Zeitraum and what the participants' bookings still owe. Tabs:
**Übersicht** (the details, Notizen und Verlauf with SchoolMan's comments and work log, and An- und
Abreise and Notiz when written), **Teilnehmende** (each booking: the learner, the booking's colour,
number, dates, where they stay, what is open), **Angebote** (those made for it, with what each asks per
person), **Kurse** (the group's own). A booking's page names its
group and links to it; an organisation's page has a Gruppen tab with the visits it sends or books.

**Rights and rules.** `view` reads; `edit` creates and changes a visit and confirms, cancels or reopens
it, each after a confirmation; `full` deletes. Staff hold `edit` by default. Calling a visit off changes
nothing else — its participants' bookings keep their own state. „Löschen" is for a visit entered by
mistake: offered only while no booking or course names it and it did not come from SchoolMan; its notes
go with it. An organisation a visit names is no longer deletable (set it inactive). Every change is a
line in Aktivität („hat eine Gruppe bestätigt").

**From SchoolMan (2026-10-18).**
`python3 -I scripts/filemaker/read_groups.py | node scripts/filemaker/import-groups.mjs [--dry-run]`,
after the learners and the organisations. All 52 `Group` records (2022–2027): `_ID_StatusGroup`
1 ja → Bestätigt, 2 nein → Abgesagt, 4 u.B. → Angefragt; `_ID_Level` is SchoolMan's band number (1 A1,
2 A2, 3 B1, 3,5 B1+, 4 B2, 5 C1); a number of people typed as a range („4-6") is planned at its top, the
range kept in the note; the lessons are SchoolMan's tuition dates, else the span of the participants'
booked periods. The comments on the group become notes, its work log its history. While no colleague has
changed a visit here a re-run takes SchoolMan's values; after that, SchoolMan only fills what is empty.
The learner sample takes in the participants of this year's groups (`sample.py`), so their bookings are
linked: 82 bookings on four visits. SchoolMan's group courses all ended before the course import's
window, so none is linked yet. A group's offers came across with the offers (0059; its page's Angebote
tab, docs/OFFERS.md §From SchoolMan) and its bed reservations with the accommodation (0060; its page's
Unterkünfte tab). Not across: its letters and invoices — docs/schoolman/groups.md.

## Attendance (2026-10-18, migration 0064)

Attendance is the Klassenbuch's: teachers record it there and it writes into SchoolMan
(docs/schoolman/klassenbuch.md). The workspace reads it beside a booking (`booking_attendance`): per lesson
day there or not, why not (ill, excused, unexcused), a sick note (doctor's certificate or their own),
minutes late, the lessons, a comment. The booking's page shows „Anwesenheit": the rate („91 % · 29 von 32
Tagen da"), lateness, and the latest eight absences with their reason. Nothing writes it.

`read_attendance.py | import-attendance.mjs`, after the learners and the lesson days: the sample's
bookings' lesson days up to today — 34,568 rows, 4,722 absences (385 ill, 462 excused, 53 unexcused, the
rest with no reason), 1,526 late; 9,627 on a lesson day the workspace has (the rest on courses before its
window). When the workspace reads the Klassenbuch directly (planned), this import goes.

## Money from SchoolMan (2026-10-18, migration 0063)

The rest of SchoolMan's learner ledger, read as it is beside the charges and payments (0054). SchoolMan's
money tables are a ledger of what learners are charged and pay; finance keeps the accounts in DATEV
(docs/schoolman/money.md), so these are shown, not worked into a balance, and nothing here writes them.

- **Payment plans** (`booking_instalments`, `Instalment`): each part with its day, amount and whether
  SchoolMan marks it paid — the booking page's „Ratenplan".
- **An agency's commission per charge** (`booking_commissions`, `Commission`): the share, the charge's
  amount, the commission, paid out or not — „Provision der Agentur", with its total.
- **Money paid out** (`payouts`, `PaymentOut`): rent to a host, commission to an agency, a payment straight
  to an agency — „Auszahlungen" on the booking, „Miete" on the host's page (with this year's total),
  „Auszahlungen" on the agency's page. A refund to the learner is a payment below zero (0054), not here.
- **Invoices** (`invoices`, `Invoice`): number, day, recipient, subject; the charges an invoice covers carry
  its number (`booking_charges.invoice_number`) and its total is theirs unless SchoolMan stored one —
  „Rechnungen" on the booking and on the organisation's page.

`read_money.py | import-money.mjs`, after the learners, the organisations and the accommodation: for the
sample's bookings 412 instalments, 890 commission lines, 920 payouts (447 rent — 435 with their host, found
through the stay on the newer ones —, 463 agency commission, 10 without a kind), 267 charges stamped with
their invoice; 642 invoices (124 on the sample's bookings, the rest to the agencies and companies here).

## Follow-ups (2026-10-18, migration 0062)

A booking's „Wiedervorlage": a day to look at it again, and why (`booking_follow_ups`). On the booking's
page, a card lists the open ones by day (amber once due) with who set it, „Erledigt" marks one done, and
„Setzen" adds one (day and reason); the done ones are counted under it. The bookings list has a view
„Wiedervorlage": bookings with an open follow-up due today or before. Setting and completing one are
lines in the booking's history; `edit` on Bookings does both.

**From SchoolMan.** SchoolMan's letter scripts set a follow-up when a letter goes out
(`SingleDateControl`, 7,539: after a booking confirmation, a payment reminder, a cancellation …). It holds
no text and no done mark, so the reason is said from the script („Nach der 2. Zahlungserinnerung") and one
more than two weeks past comes in done. `read_follow_ups.py | import-follow-ups.mjs`, after the learners:
1,683 on the sample's bookings, 128 open. The workspace's letters already work out what is due next
(„Als Nächstes"); a follow-up is for what no rule knows.

## Accommodation (2026-10-18, migration 0060)

Where learners stay, in „Unterkünfte" and „Aufenthalte" under Schule (module `accommodation`; Rahman:
"we are fine with host family privacy"). A place (`accommodations`) is a host family, a CASA flat or
another place (a hotel), with its contact, e-mail, phone and address, its descriptions in German and
English, smoker, pets, washing machine, SchoolMan's grade, whether it is still used, and a note; the
family who lives there (`accommodation_members`: name and role only — no birth date, no papers); its
rooms (`accommodation_rooms`: name, room type, beds, in use or not); the beds held there for a group
visit (`accommodation_reservations`). A learner's stay (`booking_stays`) points at its place and room.

**Unterkünfte.** Views Alle, Gastfamilien, CASA-WGs, Weitere, Inaktiv; a search by name, host, address or
someone of the family. A row: the name, the host and the town; the rooms; who stays there today; the next
arrival. „Neue Unterkunft" asks for the name and kind; how to reach it opens once both are in.

**A place's page.** The head: name, kind, the host, phone, e-mail, address; Zimmer, Wohnen jetzt,
Nächste Anreise. Tabs: **Übersicht** (the house; the family, added, changed and removed in a dialog; notes
and history with SchoolMan's comments), **Zimmer** (each with who is in it today, or „frei"), **Belegung**
(the stays now and coming, then the latest 30 earlier, each to its booking), **Gruppen** (beds held for
group visits, each to its group). A booking's page links its stay to the place; a group's page has an
Unterkünfte tab with the beds held for it.

**Aufenthalte.** The accommodation colleague's work list (docs/schoolman/accommodation.md §The work
lists): Kommen bald (the next two weeks), Wohnen jetzt (the default), Reisen bald ab, Bleiben nach dem Kurs
(more than a weekend beyond the course's last day), Noch ohne Unterkunft; all, CASA flats or host families;
a search by name, booking number or place. In Kommen bald and Noch ohne Unterkunft each row places the
stay — or moves it — at a place and a room of it („stay_placed" in the booking's history).

**Rights and rules.** `view` reads; `edit` adds and changes a place, its family and rooms, sets a place
inactive, and places a stay; `full` deletes a place (only while no stay or reservation names it and it did
not come from SchoolMan), a room (only one nobody stayed in; else it is set „nicht mehr vergeben") or a
family member. Staff hold `edit` by default.

**From SchoolMan (2026-10-18).**
`python3 -I scripts/filemaker/read_accommodation.py | node scripts/filemaker/import-accommodation.mjs [--dry-run]`,
after the learners and the groups. All 142 `Accommodation` records: the name from SchoolMan's search field
(„Name | Person" — a host family's name is the host's own, another place's an institution's), a CASA flat
when flagged (`_ID_SchoolFlatShare`, three), offered as „CASA – WG", or when most of its stays were booked
so (five more WGs CASA rents); the place's own channels, else its host's; pets from `AnimalAtHome`; the
family from the `Person` rows with a role (`_ID_Status_Family`); the rooms (`_ID_TypeRoom` 1 single,
2 double, 3 triple); the group reservations (`DateRent`, linked to their visit); the comments. First run:
131 host families, 8 CASA flats, 3 others; 108 family members, 169 rooms, 542 reservations (338 linked to
their group), 99 comments; 424 of the 448 imported stays placed. While no colleague has changed a place
here a re-run takes SchoolMan's values; after that SchoolMan only fills what is empty. Not across: rent
paid to hosts (`PaymentOut`) and the letters to them (`StatementLandlord`) — finance and letters;
the keys and the flats' cleaning plan.

## Courses (2026-10-17, migration 0041)

Rahman chose SchoolMan's model: a **course is one level of a start** —
„B1 · Intensiv · Vormittag · ab 26. Okt." — or one module, exam preparation,
group's or company's course. SchoolMan's live data (counts only): an intensive
`Course` is one level for one start in one shift, eight weeks (nine or ten with
a closure), 14 places it never enforces (204 of 351 courses since 2025 hold
more, because one course is the level's whole cohort, split into groups only in
practice); an evening course one level for a term, Mon/Wed or Tue/Thu; a
special course one module of 9–12 weeks with its own price; an exam
preparation 4–5 weeks. 5,404 of 5,424 intensive bookings since 2025 sit on one
course with one period; a learner who goes on gets a new booking on the next.

**`courses`** takes over 0031's places per start and level: a start's course per
level (`level_code` the step it starts at, `B1.1`) or a named one (`title`), with
its groups and places per group, room, whether it is offered (`bookable`),
`status` (`cancelled` keeps it with its history), an evening or special course's
own price and lessons, a group's or company's organisation, and SchoolMan's
`filemaker_course_id`. A **booked period** and a **waiting-list place** name
their course (`course_id`); their `level_code` stays the learner's own step.
`resolveCourse` (`courses.ts`) is the one rule for which course a step at a
start means: the start's own course at that step, made if missing; for an
intensive start's second half (`B1.2`) the course of the start before, still
running — the learner sits in it from their first day to its end, as in
SchoolMan, and the wizard says so („im laufenden Kurs bis …").

**Kinds (0042).** Besides intensive, evening and special courses, groups' and
companies' courses: exam preparation, private lessons, junior and online
courses, as unpublished types (`is_active` false: not on the website), with
SchoolMan's type numbers. „Termin planen" makes a start's courses as SchoolMan
plans them: an intensive start one per level, A1.1 to C1.1; an evening start
its level; any other kind one named course (the start's title, its places). A
start of named courses books onto its course whatever the learner's level.
A course's own price (an evening term, a module, an exam preparation) is what a
booking charges; the price list decides where it has none. A closed course
(`bookable` false) counts as full in the wizard, which says so („geschlossen").

**From SchoolMan (2026-10-17).**
`python3 -I scripts/filemaker/read_courses.py | node scripts/filemaker/import-courses.mjs [--dry-run]`
reads the courses still running or ahead, read-only, and writes them in one
transaction; counts only. An intensive or evening course lands on our start of
its type with the same first day (none is made: the starts are the website's
dates, already from SchoolMan); a level SchoolMan has twice on one start, or
with 28 places, is one course with two groups. An exam preparation, special
module or company course becomes its own start — not on the website
(`course_instances.on_website`, 0043; the website's lists and registration form
read only starts that are) — with its course. The level comes from `LevelShort`
and, for an evening term, `LevelShown`: `LevelStepReference` is a stale text
copy (an evening B2 course reads `B2.1` or `A1.1` alike). Matched on SchoolMan's
course number, then the start and level; what the workspace has wins. First
run: 158 courses, 125 courses here, 22 own starts; 18 courses of three intensive
starts beyond our twelve months (Oct 2027 – Jan 2028) and one evening course of
14 Sep 2026 wait for a start of ours.

**The course list (2026-10-17).** Kurse is a view per kind of work (Rahman): **Intensiv** — the
morning and afternoon courses on one page, the running ones of both at the top, then those ahead by
date, the shift in each start's head — **Abend** — level and special courses held in the evening, in
sections **Montag + Mittwoch**, **Dienstag + Donnerstag** and weitere Abende (a one-evening course by
its day) — **Weitere** (exam preparation, company and daytime special courses), and Kursarten; each
**Aktuell** (running first, then six months ahead) or **Vergangen** (the last year), the switch on the
right. Under each start (type, shift, dates, days, hours, „Woche 4 von 8" while it runs, „ab 26. Okt."
before) its courses. A course is known by its **course number** (SchoolMan's, „Kurs-Nr."), and a
level's parallel groups are one row each, by their numbers — they sit in their own rooms with their own
teachers — with the **main teachers** (the week's own pair — this week while it runs, its first or last
otherwise — a covered day counting for the teacher it was covered for, at most two), the room, and the learners now against the places with a
bar per week (this week in ink; amber when over — SchoolMan never enforced its cap). The course's level,
its waiting list and „Buchen" span its rows; the number of groups is not written out (Rahman: not
important). A level SchoolMan has not yet split into its groups (one record, 28 places) is one row;
groups whose own learners are not known (bookings made here name no group) show „–". Each number links to its own page
(§Lesson days, „The course page"). **Not held** (Rahman, 2026-10-17: hide them or find out what is
wrong): SchoolMan has no cancelled state, so a course planned and never held stays „running" there — on
2026-10-17 a company course (5034) and a special course (5043), begun weeks before with nobody booked and
no lesson day generated. A course begun with no learner and no lesson day sits apart at the end of its
view, „Nicht zustande gekommen", out of the running ones and the counts above the list; its page says so.
A parallel group begun the same way (4886, 4945: a level's second record never filled) is left out of
its course. A course still to be taught with learners and no lesson day says „Keine Kurstage" under its
teachers (5001, 5041, 5050: nothing planned for them in SchoolMan either). One SchoolMan course ends
before it starts (5074) and was not imported. Every view reads the same: a start of one named
course (a module, an exam preparation, a company's course) says the name in its head, at full width —
the type left out when the name says it — and its row, like an intensive course's, shows the level
badge (when it has a level; no made-up initials), the number (a link to the course), teachers, room,
learners and „Aktionen".

**A course's actions** (Rahman, 2026-10-17: one action button instead of „Buchen", the „Geschlossen"
badge gone): „Aktionen ▾" at the end of a course's row (`course-actions.tsx`) — **Teilnehmende buchen**
(the course with „Wen buchen?", `?book=1`: a learner found by name or address, or a new person, then the
wizard at that course, from the next Monday when it already runs, `from=`; the picker,
`components/admin/person-picker.tsx`, is the exam sitting's too), **Kurs bearbeiten …**, **Kurstage &
Lehrkräfte**, **Warteliste**, and the switch **Für Buchungen offen** (SchoolMan's „Buchbar"; a closed
course counts as full, and „Trotzdem buchen" stays possible). „Kurs bearbeiten" is one editor for the
whole list: groups, places per group, room, open for booking, note (and a named course's name, price and
lessons), with „‹ Vorheriger · 2 / 48 · Nächster ›" stepping through the courses in the list's order;
moving on saves what was changed, as SchoolMan commits a record when it is left. Editing and the switch
are the course planners' (`rooms` at `edit`); booking needs bookings `edit` and people. The waiting
lists are their own item in the rail.

**Learners from SchoolMan (0050).** While bookings are made in SchoolMan, its learners count:
`python3 -I scripts/filemaker/read_course_learners.py | node scripts/filemaker/import-course-learners.mjs`
reads its booking periods of the courses running or ahead (counts only — no name, no booking number)
into `course_week_learners`, learners per course, group (0051) and week. A week's
learners are the bookings made here plus SchoolMan's, in the list, on the course page and in **booked
places** everywhere (`BOOKED`, Bildungszeit's weeks), so free places, „voll" and the waiting list are
right while both systems are used. Each read replaces the last; run it again to refresh. First read:
916 course weeks of 97 courses, 586 learners this week. Since 2026-10-17 a booking that did not work
out („nein", „storno", which keep their periods in SchoolMan) is not counted — the learners brought
across showed it: 989 course weeks, 11,166 learner-weeks (was 12,959), 506 learners this week.

**Learners from SchoolMan (2026-10-17, migrations 0052–0053).** Rahman: bring some learners across to
see the workspace work with real data.
`python3 -I scripts/filemaker/read_learners.py | node scripts/filemaker/import-learners.mjs [--dry-run]`
— after the courses and the counts — takes everyone in a course this week or starting one in the next
four weeks, on a booking not „nein"/„storno" (whole courses, so a course's names match its count), with
all they have in SchoolMan: the person (names, salutation, birth date, nationality from `Flag`'s ISO
prefix, birth place and country, mother tongue, occupation; not the passport number), e-mail addresses
(not the agency's), phones (not fax), the newest address abroad as home and the newest in Germany as
local, and every booking with its periods and its money. Not attendance (the Klassenbuch's), not exam
bookings (their own module). One transaction, counts only, nothing personal in a file.

- *Matching.* A person by their SchoolMan person, then student id (`filemaker_links`, now one row per
  SchoolMan record); never by name or address — a likely twin gets `duplicate_candidate`. Fields fill
  only where empty. Made at SchoolMan's creation date (`created_by` `migration-schoolman`: „Importiert").
- *Bookings* keep SchoolMan's number (`filemaker_booking_id`) and get a workspace number in the year
  SchoolMan made them. „nein"/„storno" → cancelled; „u.B." → under observation („Sonstiges") while it
  still runs, a colleague's own observation kept; „ja"/„???" → confirmed, completed once over.
- *Periods* keep SchoolMan's number (`filemaker_date_booking_id`), its course mapped through the course
  numbers, its group from the group's number (`booking_periods.group_index`, 0053: a number's page lists
  its own learners and those booked here), its step the course's (`.2` from an intensive course's fifth
  week, closures ignored). A period of a course from before our twelve months keeps its dates without one.
- *Counted once.* SchoolMan's weekly counts already hold every imported booking, so a course's learners
  each week are the bookings made here plus the greater of SchoolMan's count and the imported bookings —
  in `BOOKED`, the course list, Bildungszeit; Kursplanung's „Gebucht" counts only bookings made here.
- *Money* (Rahman, 2026-10-17: bring the money too; 0054). Each charge (`CostDetail`; a reversing line
  stays a line below zero) with its charge type through `charge_types.filemaker_id` (Storno, 21, by
  hand), each payment received (`PaymentIn`, the method from its label: Überweisung, Karte, bar,
  Übertrag, Verrechnung; what it paid as its subject) and each refund to the learner (`PaymentOut`
  „Rückzahlung Student", a payment below zero) keeps SchoolMan's number. Rent paid to hosts and agency
  commission are not the learner's account and stay out. Sums are never carried: SchoolMan's
  `cal_CostGross`/`cal_PaymentIn` on a booking are auto-entered at the time of writing, not live (the
  DDR: `fieldType="Normal"`), and are stale on about one booking in twenty; the lines are what counts.
  First run: 8,554 charges, 6,779 payments, 95 refunds; per learner 251 even, 189 owing (242,051 €,
  much of it for courses ahead), 88 in credit (8,972 €).
- *What SchoolMan says about them* (Rahman, 2026-10-17: all the data related to students, including
  the comments; 0055). Notes on the booking or the person under their SchoolMan author: a booking's
  final note, a period's comment, the `Comment` table, tests (`TestStudent`: online placement tests and
  certificates) and learning agreements with their full text. The work log (`WorkFlow`), where most
  comments about a learner are, becomes the record's history („… in SchoolMan", `schoolman_log`, kept
  out of the workspace's own activity feed). The letters with their text (`Letter.FreeField`, read in
  ranges): a kind the workspace writes keeps it, so a booking's next letter is worked out from what
  SchoolMan sent; the rest are „Brief aus SchoolMan". A payment's comment is its reference, a charge's
  follows its name; bank accounts are theirs. A booking whose course is over asks for no letter but a
  payment reminder.
- *Re-runs* update status, type, visa and payer, the periods, the money, the notes and the letters, and
  read the work log afresh; a period or a money line SchoolMan dropped goes.

- *Exam bookings* (Rahman, 2026-10-18; 0056) go on their sitting: found by SchoolMan's exam
  (`exam_sessions.filemaker_exam_id`), else by the exam and its day, else made from SchoolMan's at the
  hours of its exam's other sittings — the sittings before August 2026 (never on the website, which
  reads those ahead). All parts; TestAS and TestDaF, which the workspace does not hold, are left out.
- *Stays* (`booking_stays`, 0056): each `DateAccommodation` with its dates, kind, room type, meals,
  called off and departure confirmed, and where — a CASA flat and its room by name, a host family not
  (its people come across only with a hosts module and a privacy decision). The booking page lists
  them; they fill the booking's accommodation fields, and „Aufenthalte" (0060) shows who is staying now,
  arriving soon or leaving, where.

What cannot come across yet — attendance, host families, instalments, invoices, commission, intake
records, follow-ups — is listed with the sample's counts in `docs/schoolman/learner-transfer.md`.

**Kursplanung's learners are live** (Rahman, 2026-10-17). A board group of a course shows its course's
learners in the planning month's busiest week — SchoolMan's for that group, or the bookings brought
across into it if more, plus the bookings made here for a course of one group — on the board and on the
Kurse screen, where only a group of no course still has a number to type. Until then the typed
„Anmeldungen" were kept, being the only figure there was.

First run (with the notes, log and letters on 2026-10-18): 1,125 notes, 10,977 log lines, 9,500 letters,
62 bank accounts; and 528 learners, 543 e-mails, 494 phones, 523 addresses; 2,146 bookings (95 exam bookings and
9 without a period left out), 2,151 periods, 1,069 of them on courses from before our horizon; 5 likely
twins flagged. A second run changes nothing.

**The learner list at that size.** Every count under a learner used `canonical_person_id(x.person_id) =
p.id`: a recursive lookup for every row of the table, which would not have loaded with real data. It is
now `x.person_id = ANY(family)` (`person_family()`, 0052, called only for a person someone was merged
into) on the index; the view counts work the stage out once per person (`OFFSET 0` keeps Postgres from
repeating it per count: 1.5 s → 0.14 s). Pages are ordered with a tiebreak (an import makes many rows in
one instant); search finds a whole name either way round; the level is the confirmed one, else the
course's; course types read in German.

**Planning a start (2026-10-17, migration 0049).** „Termin planen" keeps what was
typed and answers in the dialog when something is wrong. Hours are read however
they are written („09:00–12:30", „9-12.30", „bis 12:30 Uhr") and fill from the
Tageszeit when left empty (Vormittag 09:00–12:30, Nachmittag 13:00–17:30, Abend
18:30–20:00; `course-starts.ts`). „Plätze pro Gruppe" (14) goes to every course
the form makes. A planned start is **not on the website** until „Auf der Website
anbieten" is ticked, and the dialog lands on the new start's page. On the start
page: „Bearbeiten" (`rooms` edit: dates, Tageszeit, days, hours, title, room,
website — dates move only for a start planned here with nothing booked and no
lesson days; Tageszeit, days and hours lock once lesson days exist), „Termin
absagen" (`rooms` full, nobody booked or waiting; cancels its courses) and
„Termin löschen" (only a start planned here and never used;
`course_instances.created_by` tells it from seeded and imported starts). The
heading is the start's own title with the German type name, and a start off the
website says so. Every course card can open a further group; the button is
prominent only when the course is full, open and someone waits.

Places, the queue, Bildungszeit's weeks and Kursplanung's „Gebucht" all count
by course. The course start page lists its courses as cards — places and room,
who is next, the queue, the booked — with „Bearbeiten" (places, room, offered,
a named course's price and lessons), „Weitere Gruppe eröffnen" (also on the
board), and „Absagen" or „Löschen" (`rooms` at `full`; never with anyone booked
or waiting, and only an unused course is deleted). „Kurs hinzufügen" makes one.

## Lesson days (2026-10-17, migrations 0045–0046)

SchoolMan generates every lesson day of a course (`SingleDateCourse`) from its
weekly plan (`WeekDay`: each weekday's hours, lessons, teacher, room), and the
day is where things change: another teacher when someone is ill (962 of ~5,650
days in 2026 differ from the plan; 445 record who was replaced,
`_ID_PersonSubstituted`), another room (its room calendar
`SingleDateOccupancy`, `_ID_ClassroomSubstituted`), a day called off. Rahman
chose the same here, in one table, with Kursplanung's board on top of it.

**Tables.** `course_week_plans` is a course's plan per group and weekday
(hours, lessons, teacher, room). `course_days` is every lesson day of every
course: course and group, date, its own hours and lessons (null: the plan's),
teacher, room, who and which room were replaced, the board's marks
(`is_substitute`, `is_tentative`), called off with a reason, merged, a note,
`filemaker_id`. The view `course_day_times` gives a day's hours as they are:
its own, else the plan's, else the start's, else the board group's shift —
what a clash is checked against. Lesson content, homework and attendance stay
the Klassenbuch's.

**The board is a view of the same rows.** What 0014 called an assignment
(`plan_assignments`, dropped) is a lesson day with a teacher. A board group
names its course (`course_groups.course_id`, set by `link_course_groups()`):
the intensive start opening that month for phase 1, the one before for phase
2, in the group's shift, at the level's `.1`. `link_course_days()` keeps a
day's two keys together: a course's day in a group's planning month
(`planning_month_start()`) gets the group, a board day gets the group's course.
Both run after the board makes groups and after days are generated. Removing
an empty group deletes only days of no course.

**The course page — one per course number** (2026-10-17, Rahman: „each course
its own page, even of the same level"). SchoolMan keeps a level's parallel
groups as courses of their own (4775, 5054, 5055), each with its room, teachers,
lesson days and learners, so each has its own address: the first at
`/admin/catalogue/courses/[id]`, the others at `/[id]/[n]` (`courseHref`; the
old `?group=n` redirects). Where the list shows a course as one row (SchoolMan
has not split it), it has one page. The page is `courses/course-page.tsx`; it
reads the course as the list does (`courseListRow`), so both say the same.

*The head* says what the team reads on SchoolMan's course list: the title with
the course number, the dates (a link to the start) and „Woche 7 von 8", the
shift, days and hours, and the level's other numbers as links with their
learners („5054 10/14"). Its figures: learners now against the places, with the
weeks as bars (SchoolMan's per number, plus bookings made here; where a number's
own are not known, the course's); the main teachers (the week's pair; a covered
day counts for the teacher it was covered for, in the list too); the room;
lesson days and lessons; who waits (a link); „Buchung offen/geschlossen"; days
ahead without a teacher. „Aktionen" is the list's menu without the two items the
page already is — edit the course, Kursplanung (intensive), the waiting list,
the open/closed switch — and „Buchen" stays the primary button. „Kurse" goes
back to the view the course is listed in (intensive, evening, other; past).

*Kurstage*: the days week by week — „KW 42 · Woche 7", this week marked —
opening at this week, the weeks gone folded („Vergangene Wochen (6)"; a course
that has ended shows all). Date, hours (bold when the day's own), lessons,
teacher („für X" when someone replaced the plan's), room („statt Y"), called
off; „Kurstage erzeugen" / „Fehlende Tage erzeugen" makes what is missing from
the plan, leaving the school's closures out and a planned teacher off a day they
are away; a day that exists is never touched. An intensive course's generation
also makes its two board groups (`make_course_board_groups()`, 0047), so
Kursplanung shows it. „Ändern" on a day opens its dialog: teacher and room
choices name who is away, teaching elsewhere or holding the room then, free ones
first. *Wochenplan*: the plan read as lines — the days that follow each other
with the same hours, teacher and room together („Mo–Mi · 09:00–12:30 · Mikis
Weber · Lübeck"), the lessons a week under them — „Bearbeiten" opens the grid;
it defaults to the start's days and hours; „Lehrkräfte übernehmen" / „Räume
übernehmen" put the plan's on every day ahead (a day called off stays off).
*Teilnehmende*: the learners week by week against the places (the dashed line),
and who was booked here by name.

**Rights.** The page is `catalogue`; a day's teacher and the plan's teachers
are Kursplanung's (`kursplanung` at `edit`), rooms, hours, calling off and
generating are the course planners' (`rooms` at `edit`) — the same split as
the board and the course cards.

**Merged (0048).** SchoolMan's „Zusammenlegung": a group taught together with
another that day, most often because its teacher is away — it then has no
teacher of its own, or its teacher takes both. Not called off, and not a day
waiting for a teacher: the page says „Mit einer anderen Gruppe
zusammengelegt" and leaves it out of „Ohne Lehrkraft", which counts only days
ahead. Ticked in the day's dialog (Kursplanung's right, with the teacher).

**From SchoolMan (2026-10-17).**
`python3 -I scripts/filemaker/read_lesson_days.py | node scripts/filemaker/import-lesson-days.mjs [--dry-run]`
reads the weekly plans (`WeekDay`) and lesson days (`SingleDateCourse`, with
the room calendar `SingleDateOccupancy` for a day's room and the room it
replaced) of the courses still running or ahead, read-only; numbers, dates and
hours only. Run the course import first: `courses.filemaker_group_ids` holds
the SchoolMan number of each parallel group, so a group's days land on it. A
plan comes across only for a group with none here; a day read before is updated
only while nobody here has changed it (`changed_by` empty); a day the workspace
already has on that date gets SchoolMan's number and only the teacher and room
it lacks. A day's hours and lessons are its own only where they differ from the
plan. SchoolMan's marks: Vertretung → a substitute (with who was replaced),
Zusammenlegung → merged, Ausfall → called off, Verschiebung → a note; a day
inside a closure (`_ID_Holiday`, Easter 2027) is left out, as generation does.
Its rooms match ours by the city name, then the name, then the number; its
teachers by staff number. A replaced room or teacher that is the same one (93
of 102 room records) is not a change. First run: 5,017 days of 158 courses,
4,317 on our 125 courses (700 belong to starts beyond our twelve months), 543
plan rows, every teacher and room matched; a second run changes nothing.

**Known edge.** A start on the last Monday of a month (26 Oct) has its first
week in the previous planning month, where the board has no group of it: that
week shows on the course page, not on the board.

## Waiting list (2026-10-16, migration 0031)

Rahman: "do it properly and better than FileMaker — it is an important thing".
CASA's waiting list is a queue per course: when an upcoming course is full, a
learner waits; when a place frees up, the next one is taken; when the queue for a
level is long, a second course of that level opens (`docs/schoolman/intake.md`).

**What fills up is a level group within a course start** — "B1.1, Intensive
mornings from 26 Oct" — Rahman's choice of the two models offered. Its places
are groups × places per group, **14 by default** (SchoolMan's `CapStudent`),
changed per start and level (`course_level_places`; „Plätze ändern", module
`rooms` at `edit`, the right that schedules a start). A booked period now
records its level (`booking_periods.level_code`): the wizard stores the level it
asks for, an extension asks for one, and the booking page sets or corrects it
(„Niveau · Festlegen"). Bookings from before have none: a start's page lists
them under „Ohne Niveau", and they count for no level until one is set.

**Nothing that can be counted is stored** (`src/lib/admin/waitlist.ts`). Booked
places are counted from bookings that are not cancelled; a place offered to a
learner is *held* for them; free = places − booked − held, never below zero. A
learner's position is worked out from the queue's order on every read.
`freePlaces`, `placeForNext` and the wizard's `levelFree` / `waitingAhead` are
the whole of "full", "free" and "who is next" (unit-tested).

**An entry** (`waitlist_entries`) names its start and level, the person, the day
they joined, how they came (office, website registration, continuing after a
course) and a note. Its order is a `rank` — the join time, unless a colleague
moves someone, which always takes a reason and is a line in the learner's
history. States: *wartet* → *Platz angeboten* (no deadline, Rahman's choice: the
team decides when to move on, and „Angebot zurücknehmen" puts the learner back
in their place) → *gebucht* | *abgesagt* | *von der Liste genommen* (with a
reason). **A booking closes the entry by itself** — `createBooking` and
`extendBooking` close every open entry of that person in that start, in the same
transaction — so the list never keeps someone already booked, which is how
SchoolMan's lists filled up (87% of its entries sit at the default status).

**Where it shows**

- **A course start's page** (`/admin/catalogue/[id]`, from the course list):
  the start in its head with booked, waiting and free in the bar; one card per
  level — the places as a line (booked, then held), „1 Platz frei · als Nächste
  dran: …" with „Platz anbieten" when a place is free and someone waits, the
  queue in order (place, name, since when, how they came; „Platz anbieten",
  „Buchen" into the wizard with start and level chosen, „Verschieben" — another
  place with a reason, or another start or level keeping the join day — and
  „Von der Liste"/„Abgesagt"), the booked learners and the history of the queue.
  When a level is full and someone waits, „Zweite Gruppe eröffnen" adds a group.
- **Wartelisten** (`/admin/catalogue/waitlist`, its own item in the rail since 2026-10-17; each course's
  count also shows in the Kurse list):
  every queue, grouped by start and level, with the views *Platz frei* (opens
  there when there is one), *Wartend*, *Angeboten*, *Kurs begonnen* (learners
  whose start has begun while they waited — move them or take them off) and
  *Abgeschlossen*.
- **The booking wizard** marks full levels, says how a level stands in the
  chosen start, and at the end — when the level is full, or others already
  wait — offers „Auf die Warteliste" with the learner's would-be position,
  „Trotzdem buchen" staying possible. A place held for the learner being booked
  counts as free to them.
- **A course registration** has „Auf die Warteliste" beside „Buchung anlegen";
  the registration is answered (done) and the entry remembers it.
- **The learner's page** lists their waiting places among „Anfragen &
  Buchungen" and in the Übersicht („Platz 2"), and „Offen" counts them.
- **The course list** shows per start how many are booked, „Platz frei", how
  many wait, and which levels are full. **The Übersicht** has a Wartelisten
  card: how many wait, and „Platz frei" when a place is free for someone.

**Rights.** Putting someone on a list, offering, booking, moving and closing are
bookings work (`bookings` at `edit`); places and groups are the course
planners' (`rooms` at `edit`); seeing the lists needs `catalogue`.

**Letters (2026-10-16, 0032):** each row has „Brief" — on the list, a place is
free (which holds the place), no place this time (which takes the learner off)
— and says which letter went last (`docs/LETTERS.md`).

**Exam sittings have their own queue (2026-10-17):** the same table and rules,
an entry about a sitting instead of a start's level — see Exams below.

**A closed course counts as full (2026-10-17).** A course closed for booking
(`bookable` false) or cancelled has no free place (`freePlaces`), on the start
page, in Wartelisten's „Platz frei", in the wizard („geschlossen") and in
Bildungszeit's classes. A learner who waits at a second half (`A2.2`) waits on the
running course of the start before (`resolveCourse`); the start they asked for
shows them too, as „A2.2 · im laufenden Kurs A2.1 · …", and counts them.

## Exams (2026-10-17, migrations 0036–0037)

Rahman: "yes build the exam bookings". SchoolMan books exams on their own
business line (`NationalAirport`, ~400 bookings a year: telc B2 and telc C1
Hochschule, about 20 sittings a year). Its study (`docs/schoolman/courses.md`)
found what not to repeat: places shown and never enforced; a cancelled candidate
still counted, still invited and still on the telc export; no deadline stored;
the candidate's day a copied row; nothing noticing a freed place.

**An exam booking is a booking** — the same number, cost lines, payments,
observation, letters and history — whose `exam_session_id` names the sitting and
`exam_parts` what is sat: the whole exam, or the written or the oral part only
(telc sells them separately). It has no course and no period: its day is the
sitting's (`booking_days`, a view over periods and sittings, gives every booking
its days, so the bookings list and its filters show an exam on the day it is
sat). `bookings_exam_check` keeps the two kinds apart.

**Places are enforced.** A sitting's places are `exam_sessions.capacity`; booked
are its bookings that are not cancelled, an offered place is held, the rest are
free (`freeSeats`, `src/lib/admin/exams.ts`). `createBooking` locks the sitting
row while it counts, so the last place cannot be booked twice, and refuses a
full one — the wizard offers the waiting list instead, without „Trotzdem
buchen": a sitting's places are the room's and the examiners'. More places are
„Plätze ändern" on the sitting (`catalogue` at `edit`), never fewer than booked.

**Booking.** The wizard's „Eine Prüfung": the exam (with how many sittings it
has) and the parts, then the sitting (free places or „Voll · n auf der
Warteliste", the deadline or „Anmeldeschluss vorbei"), then the review. After
the deadline it says the entry to telc is a late one. The fee is the exam's
rate for the parts on the sitting's day (`priceSelection`), the exam's name as
the line. An exam registration from the website has „Buchung anlegen" with the
exam, sitting and parts already chosen; the registration is then done, and its
page links to the booking. On a booking, „Termin ändern" moves it to another
sitting of the same exam with a place, or changes the parts — which re-prices
the fee from its rate and, for another sitting, undoes the report to telc.

**The sitting's page** (`/admin/catalogue/exams/[id]`, from the Prüfungen list):
the exam, day and hours and the deadline with the days left; booked, reported
to telc, waiting and free in the bar; the candidates — tick and „Ausgewählte als
gemeldet markieren", and per candidate the money's colour and what telc still
needs from the record („Fehlt: Geburtsort"); the queue with the course queue's
actions; the website registrations for the sitting nobody has answered yet.
**„Liste für telc"** is SchoolMan's export — surname, first name, gender, date
and place of birth, country of birth, mother tongue, email, parts — of the
bookings that stand, a gap marked „fehlt", copied as columns in one click.

**Reported to telc** is `exam_filed_at`/`_by` on the booking: SchoolMan had no
such field, and the Prüfungen list's deadline column is about exactly this.

**The learner's page** lists exam bookings among „Anfragen & Buchungen" (the
course spotlight stays a course) and their exam queues.

**Letters** (`docs/LETTERS.md`): the exam's confirmation, invitation and
„Ergebnis ist da"; receipt, reminder, overview and cancellation as for any
booking; the queue's three letters with the sitting.

**Rights.** Booking, changing, reporting and the queue: `bookings` at `edit`.
The sitting's places: `catalogue` at `edit`. The telc list (personal data):
`bookings`.

**The sittings themselves (2026-10-17, 0038).** „Neuer Termin" on the Prüfungen
list (`catalogue` at `edit`): the exam, the day, the hours and the places start
from that exam's last sitting; the deadline follows the day — the day before the
same day a month earlier, as CASA's deadlines fall (13.11. → 12.10.) — until it
is changed by hand. „Auf der Website zur Anmeldung anbieten" makes it
`scheduled`, which the public registration form offers until the deadline;
unticked it is a `draft`, prepared and not public. „Bearbeiten" on the sitting
changes all of it; with bookings, the exam stays the same and the places never
fall below the booked. „Termin absagen" (`full`, confirmed, before the day) takes
it off the website and keeps it — not while anyone is booked or waits: they are
moved, cancelled or told first. „Termin löschen" only for a sitting made in the
workspace and never used: the seeds run again on every release and would put a
seeded one back (`ON CONFLICT DO NOTHING` keeps edits, not deletions).

**Results (0038).** telc sends them about six weeks after the sitting, and
SchoolMan records none. „Ergebnisse eintragen" (after the exam day,
`bookings` at `edit`): per candidate, per part sat, *Bestanden*, *Nicht
bestanden* or *Nicht erschienen* — never free text (`exam_results`). The whole
result is worked out, not stored (`overallOutcome`): every part passed is
*Bestanden*, one passed and one not *Teilweise bestanden* (telc lets the other
part be sat again), none came *Nicht erschienen*. The sitting's page shows it
per candidate with „Abgeholt" — the result handed over at the office, with who
collected it when it was someone with an authorisation — and the booking's page
shows it too. Points stay on telc's certificate.

**Letters to all (0038).** „Briefe an alle" on the sitting: the invitation, „Ergebnis
ist da" (only once the result is entered) and the confirmation of participation
(only for the parts the candidate came to). Ticked are those it can go to and who
have not had it; each gets their own, in their own language, kept on their
booking, with the same rules as one sent from the booking. Then all of them on
one page: „Alle drucken / PDF", a letter a page (`@page letters`), and one email
to all with the addresses in BCC — SchoolMan's circular put every address on
the letter.

**Booking from the sitting (2026-10-17).** „Buchen" in the sitting's head
(a scheduled sitting not yet past; bookings `edit` and people) asks „Wen
buchen?": a learner found by name or email (colleagues, deleted and merged
records left out; one already booked is marked „Schon gebucht"), or a new person
from what was typed, then the wizard opens with this sitting chosen. The list of
sittings puts past ones in their own „Vorbei" group, and „kommende Termine" and
the next deadline leave out past and cancelled sittings.

**Not yet:** points per part; TestDaF and TestAS, which are not in the catalogue
(only the two telc exams are); a full sitting still shows on the public form,
where a registration becomes a waiting-list place.

## Staff (2026-10-17, migration 0039)

Rahman: "we need to build courses and staff so we could assign teachers to courses
but remember that teachers logic will also be connected to kursplanung". Decided:
everyone at CASA is on the register; it is management's, with the HR part a
separate right; a course start's level group and the Kursplanung group are one;
examiners and their licences come with it.

**What SchoolMan does, and what not to repeat.** One person is spread over
`Person`, `Management`, `StaffMember`, a second identity `StaffSchool` and
`Hades` for those who left — one staff id even sits on four people. Roles,
levels, course types, a course's teachers and an exam's examiners are lists
packed into single fields. Contracts carry no dates of their own. Teachers are
copied down four levels (course → ranked list → weekday → lesson), and a bulk
"replace" overwrites earlier choices. Examiner licences are stored, but matched
to exams through two lists whose numbers line up only by luck.

**One colleague, one person.** `staff_members` (Kursplanung's `teachers`,
renamed) points at one `people` row: name, contact, address, the tax, pension
and health-insurance numbers (`person_private`) and bank details are the
person's, edited with the people module's own forms. The staff row holds the
board's short name, the teaching rules Kursplanung reads, the workspace account
if they have one, and active or left. **Roles** are rows from a vocabulary of
sixteen (`staff_roles`: Unterricht, Prüfer:in, Einstufung,
Prüfungsorganisation, Empfang, Verwaltung, Leitung, …), never a packed field.
**Contracts** are dated periods (`staff_contracts`: angestellt, Honorar,
Minijob, Aushilfe, Bundesfreiwilligendienst, Praktikum; from–until, hours and
teaching units a week); the one that runs today is the current one, and
Kursplanung's employed/freelance is read from it. **Absences** are any
colleague's (`staff_absences`).

**Absences from SchoolMan (2026-10-17).**
`python3 -I scripts/filemaker/read_absences.py | node scripts/filemaker/import-absences.mjs [--dry-run]`
reads SchoolMan's day per colleague (`SingleDayStaff`, generated for the year)
from ninety days back to a year ahead: a day marked ill is „Krank", one marked
holiday — the approved `DateHoliday` requests, closures included — „Urlaub".
Staff number, date and which of the two only. A day keeps its SchoolMan
reference (`SingleDayStaff:<id>`), so a re-run brings it up to date and removes
one SchoolMan no longer marks (a holiday taken back); a day entered here is
never touched. First run: 689 days of 43 colleagues (62 ill, 627 holiday, 282
ahead); three who have left are skipped. It showed 24 lesson days in November
and December whose planned teacher is on holiday — SchoolMan does not mark
that; the course pages and Kursplanung now do („abwesend · Urlaub", „Ohne
Lehrkraft").

A person on the register is not a learner: the learner list leaves them out,
`/admin/people/[id]` sends them to their staff page (or 404s without `staff`),
and the people module's actions refuse them.

**Screens.** „Mitarbeitende" in Verwaltung: the register with views Aktiv,
Unterricht, Büro and Ehemalige (SchoolMan's `Hades` is a view here), name,
short name and roles, the contract for those who see it, and „Neu" (name and
roles; contact, short name and the first contract open once a first name is
in). A colleague's page in tabs: **Übersicht** (the next four weeks on the
board, days away, roles, workspace account); **Unterricht** (the board's days,
absences to add or take back, the rules); **Prüfungen** (sittings and
licences); **Persönliche Daten**; **Vertrag** (contracts, tax and insurance);
**Bankverbindung**. The foot: „Ausgeschieden" / „Wieder aktiv", and „Löschen"
for an entry made by mistake — refused once Kursplanung or an exam names them.
The old Team screen is now „Zugänge": accounts and rights, not people.

**Examiners.** A licence is for one exam (`staff_licences`: number, valid
from–until). On a sitting, „Prüfende": a colleague for the written supervision,
the oral part or both (`exam_session_examiners`). The oral part needs a licence
for that exam valid on the sitting's day — refused without one, and flagged on
the sitting and the colleague's page if it has run out by then. The choice
lists the licensed first, then those with the role Prüfer:in or Aufsicht.

**Kursplanung.** Who teaches what is decided on the board, nowhere else. Its
teachers are the register's colleagues with Unterricht; „Lehrkraft anlegen"
there creates one. A course start shows its classes' teachers, groups count in
both places, and Kurse shows the workspace's bookings per level:
docs/KURSPLANUNG.md §Course starts.

**Rights.** `staff`: the register — `view` reads, `edit` creates, changes roles,
rules, absences, licences, the person and leaving, `full` deletes. `staff_private`:
contracts, tax and insurance numbers, bank details — `edit` writes, `full`
removes. Owners and administrators hold both; a colleague has neither until
given one on Zugänge (finance gets `staff_private`). Linking a workspace account
also needs `team` at `edit`. Examiners on a sitting are the catalogue's
(`catalogue` at `edit`).

**From SchoolMan (2026-10-17).** Rahman: the colleagues SchoolMan marks as
active staff, with everything, the HR part restricted.
`python3 -I scripts/filemaker/read_staff.py | node scripts/filemaker/import-staff.mjs`
reads them read-only through FileMaker Pro on the office Mac and writes them in
one transaction; the JSON goes through the pipe, never to a file, and both print
counts only (`--stats`, `--dry-run`). It matches on SchoolMan's staff number,
then its person, so it can run again without twins. Person, salutation, birth
date and place; e-mails, phones and home address (SchoolMan marks no main one:
the work address and the mobile first); tax, pension and health-insurance
numbers and bank accounts; roles from `Purview` that have not ended, Unterricht
for an active teacher and Verwaltung for an office colleague with no task named;
contract periods from `DateTargetWorkTime`, adjoining identical periods merged
(252 rows became 127); licences for the two telc exams the catalogue has
(TestDaF, B1, Medizin/Pflege and the BRF C1–C2 licences have no exam here). What
the workspace already has wins: a field is only filled where empty, contracts
only come in for a colleague without dated ones, and nobody marked as having
left is made active again — SchoolMan's flag is not always kept up (Werner is
still active there). Six colleagues have no person in SchoolMan; their names come
from its search fields, which hold the name twice in two orders. First run,
local database: 56 colleagues, 38 of them Kursplanung's teachers, 18 new.

A colleague's Overview and Unterricht read 4, 8, 12 or 26 weeks ahead
(`?weeks=`). Search (⌘K) lists colleagues in their own group, „Mitarbeitende",
and never among the learners.

**Not now:** time sheets, holiday entitlement and pay — the teachers' side is
the Klassenbuch's, the rest finance's (DATEV), and SchoolMan calculates no pay
either; the contracts' weekly hours are the base for it later. Which course
types a teacher may teach.

## Copy on screens — labels, not explanations

**In two languages (2026-10-14).** Every label is written in German and English,
German first; German is the default and each colleague can switch with DE | EN.
`docs/ADMIN_I18N.md` has the API, the rules and the glossary.

The product is used daily by staff and must stay presentable. A screen shows
labels, values, badges and controls. It does **not** carry explanatory notes —
why a value is kept as written, what a declared level is not, which module is
not built yet. That reasoning belongs here, in `docs/`, or in a code comment.
The test in `placement-containment.test.ts` checks the placement screen for
forbidden *labels* rather than for the presence of a disclaimer for this reason.

---

## Data flow from the public site

`src/lib/admin/intake.ts` is the write path. Three rules:

1. **The webhook stays.** Persisting was added *alongside* the fan-out, never
   instead of it. CASA may have automations wired to those webhooks that nobody
   has inventoried.
2. **Neither failure loses the other.** The row is written before the fetch, so
   a webhook timeout does not lose the record; and the store functions never
   throw, so a storage failure does not tell a visitor their enquiry failed when
   the fan-out succeeded. Each route reports `stored: true|false` in its own
   response and the server log names the cause.
3. **Status is staff-owned, content is visitor-owned.** Nothing in the workspace
   rewrites what a person submitted.
4. **Every submission creates a person, in the same transaction.** Since 0007 a
   queue row is never written without a `people` row, its email and phone as
   typed channels, and the flags for whatever intake could not settle
   (`duplicate_candidate`, `nationality_unmatched`, `level_unmatched`,
   `birth_date_unparsed`). Text that types is typed alongside the raw column;
   text that does not is kept verbatim and flagged, never corrected. Intake
   never decides two rows are the same human — it raises the question, a staff
   member answers it by linking (`docs/FILEMAKER_LESSONS.md` §1, §2.4, §11).

| Public route | Table |
| --- | --- |
| `POST /api/contact` | `enquiries` |
| `POST /api/registration/course` | `course_registrations`, and `exam_registrations` for an exam booked with the courses |
| `POST /api/registration/exam` | `exam_registrations` |
| `POST /api/careers/apply` | `career_applications` + `career_application_files` (pre-existing) |
| `/placement-test` | `placement_attempts` (pre-existing) |

**One course registration, several rows (2026-10-05).** The public form takes
up to three courses, a learning path (one intensive term per whole level, "A2
bis B2") and an exam. `storeRegistration` in `src/lib/admin/intake.ts` writes
them in one transaction: one person, a `course_registrations` row per course or
path term, an `exam_registrations` row for the exam, each with its own
`request_id`. The rows belong together through the `person_id` they share; the
learner's reference is the first course's. The person's flags (duplicate
candidate, unmatched nationality or birth date) go on the first course and on
the exam only, so one person is not flagged three times in one queue.
`declared_level_raw` holds what the learner chose ("A1 komplett (A1.1 + A1.2) ·
8 Wochen"), `declared_level_code` the half level it starts at. A path term the
catalogue lists no date for yet is stored without an instance and with the
label "Termin wird noch festgelegt": CASA plans it with the learner.

---

## Placement review — read this before changing that screen

`db/migrations/0005_placement_test.sql` says in its own header that it carries
no staff-review tables because review "belongs to the CASA dashboard
workspace". `placement_reviews` in `0006` is that table.

**CLAUDE.md hard rule 6 applies to this surface.** The workspace is a client:
its HTML goes to a browser on a shared office machine like any other. So
nothing here reads `placement_responses.value`, joins against the item bank, or
imports from `src/config/placement/content/`. A teacher gets the engine's own
output — band, confidence, skill profile, answered share, review reasons,
rationale, the learner's self-reported intake, and their writing in their own
words. That is a better basis for the decision than an answer sheet, and it
keeps the 163-item bank intact for the next candidate.

`src/lib/admin/__tests__/placement-containment.test.ts` asserts the
construction, and it is not vacuous — adding `item.answer` to
`src/lib/admin/placement.ts` fails it.

Two further rules the screens enforce in copy:

- The engine's recommendation is **never overwritten**. A confirmation is a new
  row, so "what the test said" and "what a teacher decided" stay two separate
  facts. That is the whole point of shadow mode.
- A note is **required** when the confirmed level differs from the
  recommendation. The schema cannot express that (a check constraint there
  cannot see the recommendation), and it matters: a disagreement with the
  instrument is the only evidence CASA will have for whether the pilot cut
  scores in `src/config/placement/policy.ts` are right.

---

## Design layer

Scoped to `.casa-workspace` in `src/app/globals.css`, so the public site keeps
exactly the palette it was designed with. A dense tool read at arm's length for
a whole working day needs three things the marketing site does not:

1. **Hairlines with real separation.** `--casa-sand` is a beautiful edge on a
   lone white card and disappears behind forty table rows. The workspace has
   three line weights — `--ws-line-firm` for structure, `--ws-line` for
   repetition, `--ws-line-soft` for nested boxes — plus `--ws-sunk` for a
   recessed band.
2. **A ground one step darker.** The site's canvas is 1.02:1 against white,
   which you can measure and cannot see once a card fills the viewport.
3. **15px body, not 17px.** A table of names, dates and money at 17px forces
   horizontal scrolling on a laptop.

Everything else is inherited, including the contrast discipline: accents still
resolve through `--casa-accent-text`, so they are AA on the white rail and the
white cards (the sign-in page's ink panel flips them, `.casa-workspace-panel`).

### Conventions

- **CASA's sun (`#ffd500`) is used once per screen**, as the marker on the nav
  item you are standing on. One accent, used once, so "you are here" registers
  before the label is read.
- **The sans for everything, headings at 800** (2026-10-13; it was Playfair
  for titles at 16px and up). The website editor, Kursplanung and Offers were
  already set that way, and the queues read as a different product beside
  them. `globals.css` sets it for `.casa-workspace-shell` and the dialogs
  (`.casa-ws-dialog`), over the public site's serif headings. Numerals in the
  workspace are tabular by default (`globals.css`), because every list here is
  a column of counts and dates read downwards.
- **Radius follows the three-tier scale** in `src/config/brand/tokens.ts` — 4px
  controls (`rounded-lg`), 6px tiles and panels inside a card (`rounded-xl`),
  8px cards on the canvas and dialogs (`rounded-3xl`). No fourth value.
- **Every primitive in `src/components/admin/ui.tsx` is a server component.**
  No hooks, no handlers. Every mutation is a plain `<form>` posting to a server
  action, so a screen keeps working when a chunk fails to load — and the
  interactions here (filter, set a status, write a note) genuinely are form
  submissions. The client pieces are the rail's links (`nav-link.tsx`, which
  needs the pathname), `popover.tsx` — which only opens and closes a panel of
  server-rendered forms whose choices are submit buttons, so the action gets
  what a select would have sent — and `date-picker.tsx`.
- **Icons are drawn in `src/components/admin/icons.tsx`**, on a 16-unit grid at
  1.5px. `lucide-react`'s are 24-unit at 2px and sit visually heavier than the
  labels beside them.

---

## The database

`db/migrations/0006_admin_workspace.sql`, `0007_people_and_flags.sql`,
`0008_rooms_and_module_access.sql`, `0009_access_levels_and_soft_delete.sql`, `0012_day_board.sql`, `0013_booking_accommodation.sql`,
`0010_bookings_and_payments.sql` and `0011_catalogue_types_and_rates.sql`.
Tables from 0006:

| Table | Holds |
| --- | --- |
| `staff_users` | Local accounts. Case-insensitive unique email via a functional index |
| `staff_sessions` | Server-side sessions, token hashed |
| `enquiries` | Contact submissions, including the organiser brief as `jsonb` |
| `course_registrations` | The public wizard's output |
| `exam_registrations` | Separate table — the two forms ask genuinely different questions |
| `placement_reviews` | One row per attempt: a teacher's decision |
| `staff_notes` | Polymorphic by `(entity, entity_id)`, constrained to five entity names |
| `staff_activity` | Who changed what. `staff_name` denormalised so the trail survives a deleted account |

Since 0016, `staff_sign_in_failures`: one row per failed sign-in, for the
throttle (§Sign-in throttling). No password; short-lived.

Plus two columns on `career_applications`: `assigned_to`, and a check
constraint that admits both the public route's `'submitted'` and the
workspace's vocabulary.

`work_status` is one enum for all four queues — `new`, `in_progress`,
`waiting`, `done`, `declined`, `spam` — rather than four text columns with four
spellings of "done".

Course and exam registrations record their product **twice**: by id, so the row
joins to the catalogue, and by the label the visitor actually saw. A cohort can
be rescheduled or withdrawn after someone registers for it, and "what they
signed up for" is not a question a live join can answer.

### Setup lives under Settings, not in the navigation

The vocabularies and the price list are values CASA fixes once and leaves for a
season, so they are nested items under Settings at the bottom of the sidebar:
**Prices** (`/admin/settings/prices`), **Lists** (`/admin/settings/setup`) and
**Rooms**. Lists needs `settings`, which everyone has.

**Prices** is its own module, `prices` (2026-10-13), because the price list is
finance's and management's: owners and administrators hold it by role, staff
do not, and a colleague in finance is given it on the Team screen — `edit`
changes prices and prepares next year's list, `full` also deletes a list that
has not started. It shows one price list at a time, the one in force first, in
CASA's own areas (the intensive course's weeks, the other courses, rent, fees,
exams, books), each with an Edit that opens its prices in one dialog. **Prepare
2027** copies the list in force into one valid from 1 January; its prices are
changed where they change, and it takes over on its date. A list that has
ended is read only. Offers and bookings are priced from the list in force on
the day each thing starts; what they were made with stays theirs.
docs/CATALOGUE_AND_PRICING.md §Price lists has the model.

Adding a new *kind* of list is a migration, deliberately: the vocabulary is
schema, and a screen that invents entity types is how FileMaker grew to 231
tables.

### 0011 — the school's vocabulary, and a real price list

Read live from FileMaker's 99 reference tables and written up in
`docs/CATALOGUE_AND_PRICING.md`. The vocabulary was ported nearly unchanged —
`charge_categories` (6), `charge_types` (32, FileMaker's `CostDetailReference`),
`accommodation_types` (6), `catering_options` (5),
`accommodation_room_types` (4), `day_times` (3, with their hours),
`materials` (36 books with ISBN and level), plus `name_de` / `short_code` /
`down_payment` / `teaching_mode` on `course_types`, `short_code` /
`parts_separable` on `exam_types` and `cefr_band` / `colour_hex` on `levels`.
Every row keeps its `filemaker_id`.

What FileMaker did not have is a price list: prices are typed per course, per
cost line, copied per group offer, or hard-coded in a `Case()` inside a script.
`rates` replaces all four. One row prices one thing — scope and target, the
conditions that narrow it (level, session, catering, room type, exam parts,
quantity band), the amount with its unit and VAT, and a **validity period**.
`applicable_rate()` returns the narrowest match on a date. `booking_charges`
gains `rate_id`, `quantity` and `unit_amount` but keeps its own `amount`,
because the rate is where the number came from and the charge is what was
agreed.

Seeded: the 36 book prices, the four exam fees recovered from the script, the
50 € enrolment fee. Course and accommodation prices are deliberately empty —
CASA enters them once, per period (`docs/CATALOGUE_AND_PRICING.md` §5 lists
the decisions).

### 0014 — Kursplanung

Who teaches which course on which day. `teachers` is the school's teaching
staff — a different set from `staff_users`, who are the people signing in
here — with the RULES that shape a person's piece on the board: shifts, days
per week, possible weekdays, levels. `course_groups` is one row per parallel
group of a level in a planning month, with the PAIR that normally holds it
(first half of the week, second half) and `filemaker_course_id` for the bridge.
`plan_assignments` was one teacher on one group on one date; since 0045 it is
a lesson day with a teacher in `course_days` (§Lesson days), with the
substitute and tentative marks the board draws yellow and with a `?`.
`teacher_absences` is one teacher on one date with a reason. No audit table:
mutations write `staff_activity` like everything else. The board and its
rules live in `src/lib/admin/kursplanung/`; the module is management-only by
default and is served in the shell's focus mode. Product rules, code map and
the plan of record: `docs/KURSPLANUNG.md`.

### 0039 — the staff register

`teachers` became `staff_members`, each with a `people` row (split from the old
`full_name`, last word the surname); `teacher_absences` became `staff_absences`.
New: `staff_roles` and `staff_member_roles` (everyone imported got Unterricht),
`staff_contracts` (the old `contract` column moved here, without dates),
`staff_licences`, `exam_session_examiners`. Kursplanung's column names
(`teacher_id`, `teacher_first`, `teacher_second`) stay. §Staff above.

### 0012 — the day board

No screen since 2026-10-14 (the day board went with Today); the table stays
with what the team wrote. One table, `day_tasks`: the date it belongs to, a title, an optional detail, an
area (students / courses / accommodation / exams / payments / anything else), an
optional owner, and who finished it and when. A task is not a workflow — no
stages, no dependencies, no recurrence — and `done_at` plus `done_by` answers
"who finished it" without a second table.

### 0010 — bookings, periods, cost lines, payments

The first phase-2 table, modelled on what the team does on FileMaker's
Booking screen (docs/FILEMAKER_LESSONS.md §11.6). A **booking** is a
person's place on a course: `bookings` (person, course type, status
reserved / confirmed / completed / cancelled, payer, visa, notes, the
registration it came from), `booking_periods` (the dates, each pointing at a
cohort — an extension is another period), `booking_charges` (cost lines:
enrolment fee, course price, books, a cancellation as a negative line) and
`payments` (amount, method, subject, date, who took it; **voided, never
deleted**). Balance = charges − payments, computed on read.

Screens: **Bookings** (`/admin/bookings`, tabs Current / Upcoming / Reserved /
Past / Cancelled / All, balance column) and a booking page: dates, cost lines,
payments, each with its own dialog to add and its own confirmation to remove
or void; Extend, Edit, Cancel and Delete in the header. A booking is created
from a **person** (New booking) or from a **course registration** (Create
booking — the cohort, dates and catalogue price are prefilled and the
registration is marked done). The catalogue gains **Schedule cohort**
(course, dates, seats; level, session, days, time, room, title under More) and
a Booked column; `course_instances` gains `level_code`, `session`, `title`.

Not ported yet from the Booking screen: teacher on the cohort, weekday
schedule rows and holidays, the accommodation booking, letters and receipts,
the learning-progress comment.

### 0008 — rooms, locations, module access

Ported from FileMaker's `Classroom` (29), `LocationReference` (8) and `Floor`,
read live on 2026-09-09 and seeded by `db/seeds/0002_locations_and_rooms.sql`
with `filemaker_links` rows for every row (§12 of the lessons doc has what was
cleaned on the way in).

| Table | Holds |
| --- | --- |
| `locations` | A site (`Am Dobben 14–16`, `Kinderklinik`…), client premises, or online. `kind` says which |
| `rooms` | `name`, `nickname` (the city name staff use), `floor`, `kind` (classroom / office / meeting / other), `capacity` (planning) and `capacity_max` (ceiling), `is_bookable`, `is_active` |
| `course_instances.room_id` | The room a cohort runs in. Optional. Only bookable active classrooms may be assigned |
| `staff_module_access` | Per-person `(module, level)` exceptions; see *Roles, modules and levels* |

Screens: **Rooms** (`/admin/planning`, by location, with an add form) and a room
page with an edit form — since 2026-10-17 its week (lesson days by weekday and
morning/afternoon/evening as each day's room is set, free slots and clashes
visible, week by week) and the course numbers taught in it from today on,
marked when they hold more learners than it seats; the list counts those
course numbers; the catalogue's cohort table gains a
Room column, with a picker for anyone who holds Planning and an *Over room
capacity* badge when a cohort's seats exceed the room's.

### 0007 — people, typed facts, flags, links

Written after reading FileMaker (`docs/FILEMAKER_LESSONS.md`), and every table
in it answers a measured defect there.

| Table | Holds | Answers |
| --- | --- | --- |
| `people` | One row per human. `merged_into` points a duplicate at its survivor; `canonical_person_id(uuid)` follows the chain at read time | 501 probable duplicate people across three tables that shared nothing (§1) |
| `emails`, `phones` | Typed contact channels, raw plus `normalized`, per person | Contact fields spread over five columns with no normalisation (§2.1) |
| `countries` | ISO 3166-1 alpha-2, `name_en` byte-identical to the public form's country list, `name_de`, and `filemaker_flag_id` for the import | Demonyms in a country field; a Flag table keyed by label (§4.4) |
| `levels` | CASA's eleven levels with `filemaker_level_step_id` | Levels as free text, 65% of test results unparseable (§3) |
| `record_flags` | `(entity, entity_id, code, detail)`, resolved by a named person; one open flag per code per row | Silent correction, and default statuses nobody ever changed (§11) |
| `filemaker_links` | `(entity, entity_id) → (source_database, source_layout, source_record_id, source_primary_key, mod_id)` | Replaces the single `external_ref` text column, which could name a record but not say in which file or layout (§1.4) |

Column changes on the queues: every `text` fact that can be typed now has a
**raw-plus-typed pair** — `birth_date_raw` + `birth_date date`,
`nationality_raw` + `nationality_code`, `declared_level_raw` +
`declared_level_code` — and `salutation` / `accommodation_type` are enums.
`current_level` was renamed to `declared_level_*` on purpose: it is what the
learner believes, and `placement_reviews.confirmed_level_code` is what a
teacher decided. The two are shown side by side on a course registration and
must never be conflated. `external_ref` is dropped; `source` is added to the
registrations so `'demo-seed'` rows are identifiable everywhere.

The backfill creates one person per existing row (`created_by =
'migration-0007'`), raises flags for anything that did not type, and links
nothing — identity is a staff decision, not a migration's.

The screens: **People** (`/admin/people`, the register, with the open-flag
band and its work list at `/admin/people/flags`), a person's own page with
everything that ever came in under them, and the **Person** panel at the top
of every queue detail rail — the linked person, the duplicate candidates with
a *Same person* button each, and the flags with a *Clear*. Linking sets
`merged_into` and resolves the flag; it rewrites no row and is undone from the
person page. A placement review can be attached to a person once a level is
confirmed; the attempt itself stays anonymous (rule 6).

### Driver

Both the workspace and the public site now run on one `pg` pool
(`src/lib/admin/db.ts`), replacing `@neondatabase/serverless`. That driver
talks to Neon's own endpoint and could reach neither the local container nor
the Azure Flexible Server, which is the blocker
`docs/AZURE_DEPLOYMENT_PLAN.md` §1 named. `pg` reaches all three.

`src/lib/db/server.ts` keeps Neon's result shape — `query()` resolves to the
rows, not a `QueryResult` — because around forty readers in
`src/lib/content/repository.ts` and `src/lib/placement/repository.server.ts`
were written against it and there is nothing in `QueryResult` they want.

`src/lib/admin/db.ts` imports `server-only`. Without it, a client component
that reaches it through a barrel fails with `Can't resolve 'util/types'` from
inside `node_modules/pg`, thirty lines of import trace from the actual mistake.
That exact error is how the barrel import in `contact-inquiry-form.tsx` was
found.

---

## Runtime modes

The public site has two modes and keeps both. **The workspace has one.** With
no `DATABASE_URL` it renders a "not connected" notice and refuses to run, and
that is deliberate: fixture queues would show zero enquiries and zero
registrations, which is indistinguishable from a quiet morning and would let
staff conclude nothing had come in.

---

## Verification

```bash
npm run build && npm run lint && npm run typecheck && npm run test && npm run knip
E2E_PORT=3017 npm run test:e2e
```

`E2E_PORT` exists because `reuseExistingServer` is on and several checkouts of
this repository run on one machine — a dev server left on 3001 by a different
worktree is silently reused, and the suite then tests somebody else's code.
That happened; three specs failed against a stale server that did not contain
the feature they were asserting.

`e2e/admin-workspace.spec.ts` covers the property that matters without a
database: `/admin/*` renders nothing to an anonymous visitor, in both modes.
Verifying the signed-in screens end to end needs a seeded staff account, which
CI does not have — CI does not run e2e at all.

---

## Open items

| Item | Note |
| --- | --- |
| **FileMaker bridge** | Designed, not built — `docs/FILEMAKER_BRIDGE.md`. FileMaker already models our pipeline as `Contact → PreBooking → Booking`; the bridge lands registrations as Contact+PreBooking pairs and never writes Bookings. Blocked on eight decisions listed there, the first being whether a write is wanted at all |
| **Retention policy** | Nothing is deleted on a schedule. Enquiries, registrations, placement attempts and CVs are all personal data and a period needs a named owner at CASA |
| **Outbound email** | No sending. Every reply is a `mailto:` |
| **Catalogue editing** | Read-only. `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md` is the authority on those numbers, and an edit form here would let the workspace contradict the published facts |
| **Self-service password reset** | Needs outbound email |
| **Owner-set passwords** | Give them in person or by phone, not by email |
| **`admin.casa-bremen.de`** | DNS record not created yet. Until it is, use `CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true` or reach it on the public host in development |
| **Placement fee and deposit on a booking** (2026-10-17) | The offers module adds the placement fee (50 €) and the deposit (580 €) on a learner's first stay; a booking does not. Rahman to decide |
| **Rent per type, room or meals** (2026-10-17) | The price list has one generic rent (SchoolMan prices every type alike); the Prices screen cannot enter one per type yet |
| **Closed levels on the website** (2026-10-17) | The public form offers every level of a start, also those SchoolMan has closed; a registration for one becomes a waiting-list place. Hide them? Rahman to decide |
| **Where a booking came from** (2026-10-17) | A booking made from an offer or an enquiry does not record it; needs a column such as `bookings.source_offer_id` |
| **Down payment** | 100 € (AGB) or 200 € — open since the booking letters |
| **Placing learners in flats and host families** (2026-10-17) | Buchungen → Unterkunft lists who arrives when; assigning a flat or a family (SchoolMan's `DateAccommodation`) is not built |
| **Back to the page after sign-in** (2026-10-17) | A sign-in always lands on the overview; the guard and the Microsoft callback would have to carry `next` |
| **Pro-rated own prices for joiners** (2026-10-17) | An evening term or module joined late is charged its share of class days (476 € × 18/34 → 252 €). Assumed; Rahman to confirm |
| **Past courses** (2026-10-17) | Kurse → Vergangen lists what has ended since the SchoolMan import; earlier courses were not read across |
| **Booking letters from offers** | „Buchung anlegen" on an accepted offer opens the wizard at the offer's start; the offer's prices are not carried over (the booking prices from the list) |
