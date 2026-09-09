# CASA Dev Setup

Covers both products in this repository: the public website and the staff
workspace at `/admin`. For the workspace's own architecture and security model,
read [ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md).

## Prerequisites

- **Node.js 20 or newer.** CI pins 20; the Docker image builds on 22; local
  development has run on 22 and 25. (This document previously claimed 25+ /
  npm 11+ — a floor nothing in the repository actually requires.)
- **Docker**, for the local Postgres. Only needed for the workspace and for
  database-backed public content — the public site runs from fixtures without it.

## Install

```bash
npm install
cp .env.example .env.local
```

## Choose a mode

### Public site only, no database

Leave `DATABASE_URL` unset. Then:

- public content uses in-repo fixtures
- careers pages use the in-memory fallback dataset
- career application submission is disabled, because CV uploads need storage
- enquiries and registrations still fan out to any configured webhook, and
  report `stored: false`
- **`/admin` shows a "not connected" notice and does not run**

### With a database

```bash
npm run db:up        # Postgres 17 in Docker, port 5433
npm run db:migrate   # schema, 0001 … 0008
npm run db:seed      # baseline public data: course types, cohorts, exams
```

Then set in `.env.local`:

```
DATABASE_URL=postgres://casa:casa_local_dev@127.0.0.1:5433/casa
```

Port 5433, not 5432, deliberately: 5432 is usually already taken by a
system-wide Postgres or another project's container, and a silent connection to
the wrong database is worse than a refused one.

This enables database-backed public content reads, career application
submission with CV storage, and the workspace queues.

## Your first workspace account

There is no bootstrap route and no default password.

```bash
ADMIN_EMAIL=you@casa-bremen.de ADMIN_NAME="Your Name" npm run admin:seed
```

With no `ADMIN_PASSWORD` it generates one and prints it once. Sign in at
`http://localhost:3000/admin`.

To fill the queues with plausible records for a design review or a demo:

```bash
node scripts/admin/seed-demo.mjs            # add them
node scripts/admin/seed-demo.mjs --clear    # remove exactly those again
```

## Start over

```bash
npm run db:reset     # drops the volume, migrates, seeds, recreates the owner
```

## Run

```bash
npm run dev
```

Public site at `http://localhost:3000`, workspace at
`http://localhost:3000/admin`.

The workspace is served on `admin.casa-bremen.de` in deployment. Locally it is
reachable under `/admin` on the same host, because there is no `admin.localhost`
by default and requiring one would mean editing `/etc/hosts` to open the
dashboard. In a production build that path 404s unless
`CASA_ALLOW_ADMIN_ON_PUBLIC_HOST=true`.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run knip
E2E_PORT=3017 npm run test:e2e
```

Pass `E2E_PORT`. Playwright's `reuseExistingServer` is on and several checkouts
of this repository run on one machine, so a dev server left on 3001 by another
worktree gets reused silently and the suite tests somebody else's code.

Next also refuses to start a second `next dev` for the same directory, so stop
your own dev server before running e2e.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `DATABASE_URL is required` from a `db:*` script | Not exported into the shell. The scripts read the environment, not `.env.local` — prefix the command or `export` it |
| `/admin` shows "not connected" | `DATABASE_URL` unset, or the container is not running (`npm run db:up`) |
| A dev-only `ReferenceError` that contradicts a clean `npm run build` | Stale `.next`. Delete it |
| `Can't resolve 'util/types'` in a build | A client component imports something that reaches `src/lib/admin/db.ts`, usually through a barrel. Import the leaf module instead |
| e2e failures for a feature you can see working | Playwright reused another worktree's server on 3001. Use `E2E_PORT` |
| The Placement queue suddenly holds dozens of attempts | `e2e/placement-test.spec.ts` drives the real test against the real database, so every run leaves attempts behind. Clear them with `delete from placement_attempts where token not like 'demo-seed-%'` — the demo seed prefixes its own tokens so they survive |
