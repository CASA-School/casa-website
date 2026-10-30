# Operations: the live site

How casa-bremen.de runs since the switch on 2026-10-29, and how an agent checks, reads and
releases it. Read this before touching anything outside the repository. Checked 2026-10-30.

**Three rules come first.**

1. **No release without Rahman's go.** Merging to `main` never deploys; `./infra/azure/deploy.sh`
   does, and only Rahman asks for it. Say which commits a release would carry before running it.
2. **Production is read-only for agents** unless the task says otherwise: the scripts below read,
   they never write. No `az containerapp update`, no DNS, no Plesk, no change in a Google or
   Microsoft account without Rahman's explicit go for that change.
3. **Personal data stays where it is.** Reports carry counts, never names, addresses or message
   text. The public site shows aggregates only (CLAUDE.md, hard rule 1).

## What runs where

| Piece | Where | Notes |
| --- | --- | --- |
| The app (site + workspace) | Container App `ca-casa-website`, group `rg-casa-website-prod` | Environment `cae-casa-prod` lives in `rg-casa-platform-prod`; its full resource id is needed for `hostname bind` (docs/GO_LIVE.md) |
| Images | ACR `acrcasaprodf8d745`, image `casa-website`, revisions pinned to the digest | Built by `deploy.sh` with `az acr build` |
| Database | `psql-casa-website-f8d745`, Postgres 17, B1ms, Belgium Central, private network | A laptop cannot reach it; see „Reading the database" |
| Image cache | Azure Files `stcasawebsitef8d745/next-image-cache` at `/app/.next/cache/images` | Survives releases |
| Logs | Log Analytics workspace `cd81b967-7d74-49b0-8748-85cb79210580` | Tables `ContainerAppConsoleLogs_CL`, `ContainerAppSystemLogs_CL` |
| SchoolMan bridge | Job `caj-casa-website-schoolman` | Runs when the copy changed, hourly as a fallback; docs/schoolman/MIGRATION.md |
| DNS | Lands Concepts Plesk zone (`ns3`/`ns4.lands-concepts.com`), changed only with Rahman's go; Plesk applies an edit only after „Update" | Apex A `20.79.72.159`, `www` CNAME the app, `admin` and `neu` bound too |
| Mail | Old server `195.34.167.82` (`mail.casa-bremen.de`), MX through SpamExperts; Microsoft 365 for the mailboxes | Form mail goes out through Microsoft Graph as admin@; docs/GROUP_APPOINTMENTS_AND_TEST_MAIL.md |
| Old website | TYPO3 on `195.34.167.82`, Plesk `https://f120.lands-concepts.com:8443` (subscription `casa-bremen.de`, document root `t3-web/htdocs`) | Serves only mail now. The temporary redirect to neu was removed on 2026-10-30, and so was the `relaunch` DNS record. The Plesk sites `relaunch` and `berlin` and the old TYPO3 files remain. Chrome „Browser 1" has a Plesk session; the Plesk account and the zone's SOA contact are still in the name of a colleague who has left |

Hostnames: `casa-bremen.de` (the site), `www` (308 to the apex), `admin.casa-bremen.de` (the
workspace; `/admin` is 404 on the public host), `neu.casa-bremen.de` (kept: the day-one test's
printed QR posters open `neu.casa-bremen.de/test`).

## Which release is live

```bash
az containerapp revision list -n ca-casa-website -g rg-casa-website-prod --query "[?properties.trafficWeight>\`0\`].{name:name,created:properties.createdTime}" -o table
```

On 2026-10-30 that was `ca-casa-website--0000113` (07:57 UTC, `main` at `a73a2cc4`, PR #214).
`main` has moved on since (dependency bumps); the next release carries them. Revision numbers in
docs go stale: always ask Azure.

## Releasing (only on Rahman's go)

```bash
git fetch casa && git log --oneline <live commit>..casa/main   # what the release carries
./infra/azure/deploy.sh                                        # builds in ACR, runs migrations, pins the revision
./scripts/ops/health.sh && ./scripts/ops/health-azure.sh        # afterwards
```

`deploy.sh` runs `db-job.sh migrate` first, so every migration on `main` is applied. A migration
that changes a table the SchoolMan bridge writes needs the job paused around the release
(docs/schoolman/MIGRATION.md §5). Environment variables survive releases; `deploy.sh` does not touch
them. Rollback: send traffic back to the previous revision with
`az containerapp revision activate` and `az containerapp ingress traffic set`.

## Checking health

| Script | What it checks | Needs |
| --- | --- | --- |
| `./scripts/ops/health.sh` | DNS on five resolvers, responses of the four hostnames, `/api/health`, certificates, mail records | nothing |
| `./scripts/ops/health-azure.sh` | Active revision and replicas, delivery settings, recent errors, the SchoolMan job's last runs, the database's state | `az login` |
| `./scripts/ops/logs.sh [hours]` | Console errors and form deliveries grouped by message; restarts, scaling, failed probes | `az login` |

What „healthy" looked like on 2026-10-30: every resolver answers `20.79.72.159`; the apex 200,
`www` 308, `admin` 307 (to sign-in), `neu` 200; `/api/health` `{"status":"ok"}`; certificates
valid into April 2027; one revision at 100 %; `FORM_DELIVERY_MODE=live`; SchoolMan runs
„Succeeded" every few minutes. A single `ProbeFailed` warning during a scale-out is normal.

Known blip: Azure's managed maintenance restarted the database for about two minutes on
2026-10-29 at 23:07 CET; the site served its fallback content meanwhile. Moving the maintenance
window to a quieter hour is a board item.

## Reading the database

The database is private, so queries run inside the app:

```bash
./scripts/ops/run-in-app.sh scripts/ops/queries/site-activity.js '2026-10-29 16:39'
```

`run-in-app.sh` gzips a local Node script and runs it in the container with the app's own
`DATABASE_URL` (one connection). Write new read-only queries next to `site-activity.js` and keep
them short (the gzipped script must stay under about 1,800 characters). **Counts and aggregates
only.** For anything that writes, use the database job (`./infra/azure/db-job.sh`) and only with
Rahman's go.

## Statistics and campaigns

`/admin/statistics` counts page loads on the server (`site_page_views`, docs/SEO_AND_GEO.md
§Statistics); there is no cookie, no script in the browser and no Google Analytics. A visit's
campaign is `utm_source · utm_campaign` from the landing URL, so every link CASA places carries a
tag. Tags in use:

| Where | Link |
| --- | --- |
| Google Business Profile, website field | `/?utm_source=google&utm_medium=organic&utm_campaign=gbp` |
| Business Profile, booking button | `/anmeldung/anmeldeformular?utm_source=google&utm_campaign=gbp-buchung` |
| Business Profile, products | the course page `?utm_source=google&utm_campaign=gbp-produkte` |
| Business Profile, posts | the page `?utm_source=google&utm_medium=organic&utm_campaign=gbp-post` |
| Social posts for the new site | `/?utm_source=ig|facebook|linkedin|google|qr&utm_campaign=neue-website` |
| Google Ads (planned) | an account-level final URL suffix, docs/GOOGLE_ADS.md |

Referral spam (unknown `.com.ua` hosts and the like) shows up among the sources; ignore it.
The registration wizard keeps no draft, so a half-filled form leaves no trace; PR #214's
aggregate step counts would change that and are switched off until a privacy review
(`REGISTRATION_METRICS`, docs/SEO_AND_GEO.md).

## Accounts outside the repository

Agents use these through Claude in Chrome (the user's „Browser 1", signed in as
r.shafiee@casa-bremen.de). Never sign in, enter a password or accept terms on Rahman's behalf
without his explicit request for that step.

| Account | What | Doc |
| --- | --- | --- |
| Google Business Profile „CASA - Internationale Sprachschule" | Listing, photos, products, posts, booking link, reviews | docs/GOOGLE_BUSINESS_PROFILE.md |
| Google Ads 343-341-7137 (Ad Grants) | Free search ads, approved 2026-10-30 | docs/GOOGLE_ADS.md |
| Google for Nonprofits | CASA gGmbH approved June 2026 (Goodstack) | docs/GOOGLE_AD_GRANTS_COMPLIANCE.md |
| Google Search Console | Domain property, verified by DNS TXT | docs/SEO_AND_GEO.md |
| Microsoft 365 / Entra | Mailboxes, form sender, „Sign in with Microsoft" | CLAUDE.md, open items |
| GitHub `CASA-School/casa-website` | Remote `casa`; auto-delete of merged branches is on | below |
| Azure subscription | Everything in „What runs where" | docs/AZURE_DEPLOYMENT_PLAN.md |

## Git and pull requests

- The remote is `casa`, not `origin`. Branch from `casa/main`; push with `git push -u casa <branch>`.
- Merge with `gh pr merge <n> --repo CASA-School/casa-website --rebase`. Never `--delete-branch`
  (GitHub deletes merged branches by itself since 2026-10-30, and the flag fails when a worktree
  has the branch checked out).
- CI (`quality.yml`) runs lint, typecheck, test, build and knip; it does not run e2e and never
  deploys. `main` has no branch protection yet (a board item).
- Several worktrees share this machine. Use `E2E_PORT` for Playwright, never `git switch` in a
  worktree another agent is using, and never a bare `git stash`.

## Generated files that are not in git

`output/` is gitignored and lives in the checkout that made it. The ones that matter, all in
`~/Downloads/CASA-site/output/`:

| Folder | What |
| --- | --- |
| `ad-grants/CASA-Ad-Grants-Plan.pdf` | The Ad Grants plan (13 pages); its content is in docs/GOOGLE_ADS.md |
| `social-launch/` (+ `.zip`) | Instagram/LinkedIn/Facebook posts for the new site, DE and EN, with captions and tagged links in `texte.md` |
| `gbp-photos/`, `gbp-products/`, `gbp-reviews/` | Business Profile photos, product images, the review poster and QR code, the first post |
| `team-leitfaden/CASA-Website-Leitfaden-Team.pdf` | The team guide to the new website (16 pages, German) |
| `golive/` | The go-live button page and Codex's records |
