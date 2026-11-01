# Work board

The open work on the CASA website after go-live, cut into units that separate agents can take
on in parallel. Each unit says what to read, what it owns, when it is done and where it needs
Rahman. Last updated: 2026-11-01.

The August board (design system, typography, content units, all done) is archived in
`docs/archive/PARALLEL_AGENT_WORK_BOARD_2026-08.md`.

## Assigning a unit

Paste this to a new agent, with the unit's id:

> You are picking up unit **‹ID›** from `docs/PARALLEL_AGENT_WORK_BOARD.md` in the CASA website
> repository (`~/Downloads/CASA-site`, remote `casa`, GitHub CASA-School/casa-website). Read
> `CLAUDE.md`, the board's „Rules for every unit" and unit ‹ID›, then the documents the unit
> lists under „Read first". Work in your own worktree from `casa/main`. Stop and ask Rahman at the
> unit's „Needs Rahman" points; do nothing in production or in an outside account beyond what
> the unit allows. When you finish, update the unit's status on this board in your PR.

## Rules for every unit

1. **Read order:** `CLAUDE.md` → this board → the unit's „Read first" → `docs/OPERATIONS.md` if
   the unit touches the live site or an outside account.
2. **One unit, one worktree, one branch.** From the main checkout:
   `git -C ~/Downloads/CASA-site fetch casa && git -C ~/Downloads/CASA-site worktree add ~/Downloads/CASA-‹unit› -b ‹type›/‹unit› casa/main`,
   then clone the dependencies with `cp -cR ~/Downloads/CASA-site/node_modules ~/Downloads/CASA-‹unit›/`
   (an APFS clone, seconds). Never `git switch` in someone else's worktree; never a bare
   `git stash`.
3. **Ports:** pick a free port for `next dev` (3030 and up; 3001, 3017, 3018, 3020, 3021, 3027,
   3029 are often taken) and always `E2E_PORT=‹port› npm run test:e2e`, or Playwright reuses
   another worktree's server.
4. **Claim it:** add a row to `~/.agentic/TASKS.md` (the laptop's coordination file) with the unit
   id, your branch and worktree. Stay inside the unit's „Owns"; if you need a change elsewhere,
   say so in your report.
5. **Gates:** `npm run lint && npm run typecheck && npm run test && npm run build && npm run knip`;
   `E2E_PORT=… npm run test:e2e` when routes or flows change; `npm run admin:check` after any SQL;
   `npm run cms:extract` after copy changes. Say which gate you skipped and why.
6. **Ship:** PR to `casa/main`; merge with `gh pr merge ‹n› --repo CASA-School/casa-website --rebase`
   once CI is green, unless the unit says to wait. **Merging does not deploy.** A release is
   Rahman's call (`docs/OPERATIONS.md`).
7. **Report** in the order of `AGENTS.md` §7 (evidence, root cause, fix, files, verification), and
   update this board (status line of the unit) and, for a significant change, `MEMORY.md`.

## Status at a glance

| Unit | What | Kind | Status |
| --- | --- | --- | --- |
| A1 | Ad Grants: measure sign-ups with consent | code | **waiting for Rahman** (decision 1) |
| A2 | Ad Grants: account setup and Bremen campaigns | Google Ads | ready to draft; publishing needs approval |
| A3 | English page „Learn German in Bremen" | code + copy | waiting for Rahman (decision 5) |
| A4 | Ad Grants: international campaign | Google Ads | after A1–A3 |
| A5 | Open Turkish and Spanish on the site | code + review | later (month 3) |
| G1 | Placement appointment deep link + second booking link | code + Business Profile | ready |
| G2 | Business Profile: monthly post, reviews, attributes | Business Profile | recurring |
| H1 | Remove the old server's redirect to neu | Plesk | ✅ done 2026-10-30 |
| H2 | Remove `relaunch.casa-bremen.de` | Plesk | ✅ done 2026-10-30 (DNS record; the Plesk site stays) |
| H3 | Branch protection on `main` | GitHub | with Rahman's go |
| H4 | Switch off the „new website" notice | code | between 10 and 24 Dec 2026 |
| H5 | Search Console and Bing after the switch | Google/Bing | ready (check first) |
| H6 | Database maintenance window | Azure | offered, waiting for Rahman |
| H7 | Next release | Azure | photography release authorized by Rahman, 2026-10-31 |
| UI | Workspace interface follow-up | code | ✅ contextual booking/list refinement implemented and verified 2026-11-02 (`codex/contextual-booking-lists`); production release separate from the completed revision120 release |
| P1 | Privacy: specialist review pack | docs | ready |
| P2 | Scheduled deletion (retention) | code, both products | needs a privacy owner |
| X1 | Site and workspace as two apps | Azure + code | later, Rahman will come back to it |

---

## Marketing: Google Ads and the Business Profile

### A1 · Ad Grants: measure sign-ups with consent
**Status:** waiting for Rahman's yes to „way A" (asked 2026-10-30). Without it, Google pauses the grant.
**Read first:** `docs/GOOGLE_ADS.md` §Measuring sign-ups; `docs/PRIVACY_POLICY.md`; `docs/ADMIN_WORKSPACE.md` (the record pages); CLAUDE.md „Runtime modes".
**Goal:** a `gclid` from an ad survives the visit in memory only; every lead form shows an unticked consent box; when ticked, the gclid is stored with the record; a signed HTTPS endpoint serves Google's offline-conversion CSV for the Data Manager; nothing is stored or logged when unticked.
**Owns:** a small client module that reads `gclid` on landing (no storage), the consent field in the forms (`src/components/forms`, `src/components/registration`, `src/components/appointments`, `src/components/courses/interest-dialog.tsx`), the API handlers that receive them (`src/app/api/{registration,contact,appointments,placement-appointments,interest}`), a migration for the column/table, a new route such as `src/app/api/ads/conversions/route.ts`, the privacy text (`src/lib/content/published-legal.json` via the usual path, `docs/PRIVACY_POLICY.md`).
**Must not touch:** cookies, `localStorage`, any Google script on the page.
**Done when:** a test conversion from a real ad click (or a hand-made `?gclid=TEST…` URL) appears in the CSV only when the box was ticked; unit tests cover both paths; the fallback mode (no database) still submits; the privacy draft is ready for the specialist.
**Needs Rahman:** decision 1 (way A), decision 2 (who checks the text), decision 3 (call forwarding); the secret for the endpoint is set on the Container App only with his go; release only with his go.

### A2 · Ad Grants: account setup and Bremen campaigns
**Status:** in progress. „Deutsch am Abend" and „Deutsch intensiv" are live since 2026-10-31 (GOOGLE_ADS.md §State); the other Bremen campaigns and the conversion actions (after A1) are left. Nothing is published without Rahman's approval of the texts.
**Read first:** `docs/GOOGLE_ADS.md` (§Working on the account first, then rules, campaigns, drafts, negatives; an agent without the repository, such as Gemini, gets that file and its paste-in prompt); `docs/VOICE_AND_TONE.md`; `docs/OPERATIONS.md` §Accounts.
**Goal:** in account 343-341-7137 (Chrome „Browser 1"): auto-tagging on, the final URL suffix, survey notifications on, first the evening campaign „Deutsch am Abend" (GOOGLE_ADS.md §First campaign, Rahman 2026-10-31), then the other Bremen campaigns, all built **paused** with ad groups, keywords, negatives, sitelinks and callouts as drafted; conversion actions created once A1 is live.
**Owns:** the Google Ads account only.
**Done when:** Rahman has approved the texts and switched the campaigns on (or told you to); the campaigns satisfy every rule in `docs/GOOGLE_ADS.md` §The rules; the doc's „State" section is updated.
**Needs Rahman:** decision 4 (texts and keywords); go before any campaign is enabled. Never accept terms, link accounts or enter payment details.

### A3 · English page „Learn German in Bremen"
**Status:** waiting for Rahman (decision 5: the page and the first countries).
**Read first:** `docs/GOOGLE_ADS.md` §Learners abroad; `docs/I18N_ROUTING.md` (every route needs a German path too); `docs/WEBSITE_EDITOR.md` (copy through `say()`); `docs/COURSE_FACTS_SOURCE_OF_TRUTH.md`; `src/config/content/faq.ts` (visa answers); `docs/VOICE_AND_TONE.md`; CLAUDE.md „Cards have a text budget".
**Goal:** one page for people abroad: intensive course with live dates and prices (`{course.…}` facts), who needs a visa and what missions ask (linking official pages, no advice of our own), the registration letter, postponement and refund rules, accommodation, the placement test, steps from abroad, CASA as a non-profit. No „visa service" wording.
**Owns:** a new route and its entry in `src/i18n/pathnames.ts`, its page component, sitemap and CLARA knowledge entries.
**Done when:** gates pass, `cms:extract` run, the page renders in both languages, Rich Results test clean, translations re-run per `docs/TRANSLATIONS.md`.
**Needs Rahman:** decision 5; copy approval; release.

### A4 · Ad Grants: international campaign
**Status:** after A1, A2 and A3.
**Read first:** `docs/GOOGLE_ADS.md` §Learners abroad and §Visa wording.
**Goal:** one English campaign (India, Pakistan, Nigeria, Egypt, Indonesia, Vietnam, USA) to the A3 page, built paused; then a monthly look at registrations from abroad, visa refusals and office workload.
**Needs Rahman:** country list, texts, go.

### A5 · Open Turkish and Spanish on the site
**Status:** later (month 3), only if A4 shows people from abroad register.
**Read first:** `docs/TRANSLATIONS.md`, `docs/I18N_ROUTING.md` §Adding a language.
**Needs Rahman:** the decision, and a human review of the machine translations before they go public.

### G1 · Placement appointment deep link and a second booking link
**Status:** ready.
**Read first:** `docs/GOOGLE_BUSINESS_PROFILE.md`; `src/components/resources/tandem-dialog.tsx` (the pattern: open a dialog when the URL hash matches, also on in-page links).
**Goal:** `/anmeldung/einstufungstest#termin` (and `/en/placement-test#termin`) opens the placement appointment popup (`src/components/appointments/placement-appointment-dialog.tsx`). Then, with Rahman's go, add it as a second booking link in the Business Profile with `utm_source=google&utm_campaign=gbp-termin`.
**Owns:** the dialog component and a constant for the anchor.
**Done when:** a unit or e2e test opens the dialog from the hash; the profile link is live (or handed to Rahman).

### G2 · Business Profile: monthly post, reviews, attributes
**Status:** recurring, monthly.
**Read first:** `docs/GOOGLE_BUSINESS_PROFILE.md`.
**Goal:** a post each month (next intensive start, exam dates, the language café) with a `gbp-post` link; reply drafts for new reviews; the attributes Google changed confirmed by the office.
**Needs Rahman:** every text before it is published.

---

## After go-live: housekeeping

### H1 · Remove the old server's redirect to neu
**Status:** ✅ done 2026-10-30 at Rahman's request, once every resolver (Google, Cloudflare, Telekom, Quad9, the office's `10.0.60.1`) answered `20.79.72.159`. The redirect block came out of `t3-web/htdocs/.htaccess`; the file is again identical to the original (`~/Downloads/htaccess`, SHA-256 checked). Recorded in `docs/GO_LIVE.md`.

### H2 · Remove `relaunch.casa-bremen.de`
**Status:** ✅ done 2026-10-30 at Rahman's request: its A record (`195.34.167.82`) is out of the zone; both name servers answer NXDOMAIN (caches may hold the old record for up to a day, its TTL). The Plesk site `relaunch.casa-bremen.de` (16.6 MB of files, a TYPO3 that answered „Page Not Found") still exists; deleting it erases its files and is Rahman's call.

### H3 · Branch protection on `main`
**Status:** with Rahman's go. Deferred until go-live on purpose; due now.
**Goal:** require the `quality` workflow before merging; keep rebase merges; no required reviews (one maintainer). Update CLAUDE.md „Known open items".

### H4 · Switch off the „new website" notice
**Status:** between 10 and 24 December 2026 (six to eight weeks after 29 October).
**Goal:** `enabled: false` in `src/config/site-notice.ts`; check the contact topic „Feedback zur Website" still makes sense; release with the next one.

### H5 · Search Console and Bing after the switch
**Status:** ready. The domain property `sc-domain:casa-bremen.de` and the sitemap were done on 2026-10-29; Bing and the Rich Results check are not recorded as done.
**Read first:** `docs/SEO_AND_GEO.md` §At go-live.
**Goal:** Pages → Not found checked in Search Console for old URLs the redirect map missed (`src/i18n/legacy-redirects.ts`, `docs/LEGACY_REDIRECTS.md`), from about a week after the switch; Bing imported from Search Console; one course, one exam and the job page through the Rich Results Test; findings fixed in a PR and recorded in `docs/SEO_AND_GEO.md`.

### H6 · Database maintenance window
**Status:** offered on 2026-10-30, waiting for Rahman.
**Goal:** move the Postgres server's custom maintenance window to Sunday 03:00 Europe/Berlin (`az postgres flexible-server update --maintenance-window "Sun:3:0"` on `psql-casa-website-f8d745`), so Azure's restarts happen at night.

### H7 · Next release
**Status:** Rahman authorized the reviewed photography release on 2026-10-31. Its baseline is revision 0000114 (`35b926ed`); the approved selections, retained originals, delivery hashes and framing rules are in `docs/MEDIA_LIBRARY.md`. Merge after green CI, then deploy through the runbook. Later releases still require Rahman's go; ask Azure for the live revision rather than relying on this historical baseline.
**Released 2026-11-01:** the workspace's PR #227 and PR #221 with migrations 0112–0114, as revision `0000119` (main `67d730a3`); the SchoolMan job was removed and recreated around it.
**Read first:** `docs/OPERATIONS.md` §Releasing.

---

## Privacy and legal

### P1 · Privacy: specialist review pack
**Status:** ready. A data protection specialist is not named yet (CASA has no DPO).
**Read first:** `docs/PRIVACY_POLICY.md` (the open questions 2, 5–14), `docs/GOOGLE_ADS.md` §Measuring sign-ups.
**Goal:** one short document for the specialist: the open questions, the Ads consent design, the § 38 BDSG question, PR #214's step counts. No legal conclusions of our own beyond what the docs already state.

### P2 · Scheduled deletion
**Status:** needs a named privacy owner and periods (§ 19 promises them; nothing deletes today).
**Read first:** `docs/PRIVACY_POLICY.md` open question 5; `docs/ADMIN_WORKSPACE.md`.
**Note:** touches the workspace too; agree the split with the admin thread before starting.

---

## Platform

### X1 · Site and workspace as two apps
**Status:** later; Rahman will come back to it. `docs/AZURE_DEPLOYMENT_PLAN.md` §Later has the shape.

---

## Waiting on people, not agents

- **Social posts for the new site:** ready in `~/Downloads/CASA-site/output/social-launch/` (DE and EN, captions in `texte.md`). The team posts them.
- **Team guide:** `~/Downloads/CASA-site/output/team-leitfaden/CASA-Website-Leitfaden-Team.pdf`, for Rahman to send to the team.
- **Business Profile attributes:** the office confirms on site.

## In flight elsewhere: do not start

| Work | Who | Where |
| --- | --- | --- |
| The staff workspace (`/admin`) and its open items | the admin thread | Its work of 2026-10-31/11-01 is in `main` and live (PR #227, PR #221, revision `0000119`). New workspace work branches from `casa/main` in its own worktree; `docs/ADMIN_WORKSPACE.md` §Open items is the list (the „Record pages" request first). PR #169 (an e2e fix) is theirs |
| Photo modernisation, local review | Codex | `~/.codex/worktrees/bettina-portrait/CASA`, branch `codex/photo-modernisation-local`; owns photo files under `public/media/casa/` until it lands |
| Statistics: registration step counts (PR #214) privacy review | Codex | switched off (`REGISTRATION_METRICS`) |
| Statistics navigation link | Codex | branch `codex/statistics-navigation`, release pending |
| SchoolMan sync and bridge | the service on the office server (CT 103) + the Azure job | `docs/schoolman/MIGRATION.md` |
| CASA-Förderverein website | separate repository | `~/Code/local/casa-foerderverein` |
| Klassenbuch | separate repository | `~/Code/local/casa-klassenbuch` |

`~/.agentic/TASKS.md` is the laptop-wide list of who is doing what; check it before starting.
