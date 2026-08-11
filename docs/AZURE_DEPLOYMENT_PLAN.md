# Azure Deployment Plan

Date: 2026-08-12
Status: plan — nothing provisioned yet.

CASA is consolidating onto Azure so the website, the student app, and the future dashboard sit in
one tenant and can be integrated. The student app already runs there, so this plan mirrors its
topology rather than inventing a second pattern.

## What the student app already has

Read `~/Tasks/10-active/work/casa-student-app/infra/azure/README.md` before provisioning.

| Resource group | Contains |
| --- | --- |
| `rg-casa-platform-prod` | **Shared**: container registry, Container Apps environment, network, Log Analytics, managed identity |
| `rg-casa-student-prod` | Student app containers and its isolated PostgreSQL server |

- Regions: `germanywestcentral` for compute, `belgiumcentral` for PostgreSQL (nearest EU region
  the sponsorship permits).
- Container Apps pull images using a managed identity.
- Deploys run from GitHub Actions via **workload identity federation** — no stored credentials.
- Application Insights covers reliability; product data stays in PostgreSQL.

## Proposed shape for the website

Add one resource group, reuse the shared platform group:

| Resource | Choice | Why |
| --- | --- | --- |
| Resource group | `rg-casa-website-prod` | Mirrors the student-app split; keeps blast radius separate |
| Registry | **reuse** `rg-casa-platform-prod` ACR | One registry, one identity, already wired |
| Container Apps env | **reuse** the shared environment | Shared network and Log Analytics; avoids a second env's baseline cost |
| Compute | Container App, Next.js standalone | Same runtime story as the app |
| Database | Azure Database for PostgreSQL Flexible Server | Replaces Neon |
| Secrets | Container App secrets | Where the app already keeps its mailbox password |
| Domain | `casa-bremen.de` → CNAME + Azure TXT verification | Same mechanism the app uses for its subdomain |

### Scale-to-zero is worth it here

The student app has real session traffic. A marketing site does not. Set the website Container
App `minReplicas: 0` so it costs nothing while idle. Accept a cold start on the first request;
for a brochure site that is a reasonable trade, and it materially changes the credit burn.

## Code work required

### 1. Database driver — the real work

`@neondatabase/serverless` talks to Neon's endpoint and does not work against Azure Postgres.
The port is **two files**, not one:

- `src/lib/db/server.ts` — swap `neon()` for a `pg.Pool`. Everything in
  `src/lib/content/repository.ts` already goes through `queryRows`/`queryFirst`, which use only
  `db.query(sql, params)`, so it is satisfied by a thin wrapper.
- `src/app/api/careers/apply/route.ts` — **this one needs rewriting.** It uses Neon-specific API
  directly: the tagged-template form and `db.transaction([...])` to write the application and the
  CV file together. There is no `pg` equivalent; it becomes an explicit
  `BEGIN` / `INSERT` / `INSERT` / `COMMIT` on a pooled client.

That route is the only write path on the public site, so it needs a real test before cutover —
not just a build.

`scripts/db/migrate.mjs` and `scripts/db/apply-sql-directory.mjs` also import the Neon driver and
need the same swap.

### 2. Containerisation

- `next.config` needs `output: 'standalone'`.
- Dockerfile on `node:22-alpine`, multi-stage, non-root.
- `sharp` must be in the image — on Vercel, `next/image` optimisation is provided by the
  platform. In a container it runs in-process, and without `sharp` it silently degrades.
- Health endpoint for the Container App probe.

### 3. Pipeline

Mirror `deploy-production.yml` from the student app: OIDC login, `az acr build`, `az containerapp
update`. Reuse `configure_github_oidc.sh`. CI (`quality.yml`) stays as is.

### 4. Leaving Vercel

`bfbedb7` integrated the Vercel Toolbar unconditionally. Remove it, or gate it, before the Azure
build — it should not ship to production on a non-Vercel host.

## Data protection — decide before provisioning

**Career applications store uploaded CVs in Postgres** (`career_application_files`). That is
personal data under GDPR, in a table that also holds names, emails, and free-text.

Two things follow:

1. **DECIDED 2026-08-12 — the website gets its own PostgreSQL Flexible Server.** Not a shared
   server, not a second database on the student app's server. Learner data and applicant data
   stay on separate infrastructure with separate credentials. If the two systems ever need to
   exchange data they do it over an API between services, never by sharing a database. That
   integration is explicitly **out of scope for now** — do not build toward it yet.
2. **Reconsider storing CV bytes in Postgres.** Azure Blob Storage with private access and a
   retention policy is the better home: it keeps backups small, makes deletion-on-request
   tractable, and avoids bloating every database dump with binary. This is a schema change, so
   decide before migrating data rather than after.

A retention rule for applications also needs stating — how long CASA keeps unsuccessful
applicants' CVs is a policy question, not a technical one.

## Migration order

1. Provision `rg-casa-website-prod` and the PostgreSQL Flexible Server. Nothing else changes yet.
2. Port the driver (two files above) behind `DATABASE_URL`, and prove the careers upload path
   against Azure Postgres.
3. Move the schema: `npm run db:migrate` against the new server, then `npm run db:seed`.
   Migrations are now tracked and transactional, so this is safe to repeat — see below.
4. Copy live data out of Neon (`pg_dump`) into Azure. Verify row counts per table.
5. Containerise and deploy to a staging Container App on an `azurecontainerapps.io` hostname.
6. Full QA on staging: all public routes, both locales, contact/registration/careers submissions.
7. DNS cutover. **The domain currently resolves to `195.34.167.82`, a Nginx/TYPO3 host at Lands
   Concepts** — see `~/Tasks/10-active/work/casa-website-project/README.md`. That is the live
   public site today, so cutover is a real go-live, not an internal switch. Take a full Plesk
   backup and confirm the rollback path first.
8. Decommission Neon only after a verified backup and a period of parallel running.

## Migrations are now tracked

`npm run db:migrate` used to re-execute every `.sql` file on every run — no version table, no
transaction, no lock. That was survivable only while every migration was defensively written.
It stopped being survivable with `0002`, which contains `UPDATE` statements that would re-apply
data corrections over later staff edits on every run.

The runner is now `scripts/db/migrate.mjs`, modelled on the Alembic discipline the student app
uses:

- a `schema_migrations` table records version, checksum, and applied time;
- each migration runs **exactly once**, inside its own transaction, rolling back on failure;
- editing an already-applied migration is detected by checksum and refused;
- a Postgres advisory lock prevents two runners racing.

```bash
npm run db:migrate:status   # what is applied, what is pending
npm run db:migrate          # apply pending only
npm run db:baseline         # record 0001 as applied WITHOUT running it
```

**On the existing Neon database**, which already has `0001` applied from before tracking existed:

```bash
npm run db:baseline
npm run db:migrate:status
npm run db:migrate
```

On a fresh Azure server, skip the baseline and run `db:migrate` from empty.

Seeds keep the old apply-every-time behaviour on purpose — they are written with
`WHERE NOT EXISTS` / `ON CONFLICT` and are meant to be re-runnable.

## Open questions

- Budget ceiling for the website specifically. (Server topology is settled: its own Flexible
  Server — see the decision above.)
- Does the future dashboard also land in `rg-casa-platform-prod`? If so, the shared Container
  Apps environment should be sized for three workloads, not two.
- Staging: a permanent staging Container App, or ephemeral per-PR environments?
- Who owns rollback on go-live day. There is still no canonical production deployment doc.
