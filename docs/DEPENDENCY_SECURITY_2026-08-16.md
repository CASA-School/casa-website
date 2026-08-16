# Dependency security triage — 2026-08-16

**Status: RESOLVED.** All production-scope advisories are cleared, a CI gate now prevents
regression, and Dependabot is configured. `npm audit` reports **0 vulnerabilities in every
scope**. Verification results are at the bottom.

## Outcome

| Before | After |
| --- | --- |
| 8 production-scope vulnerabilities (6 high) | **0** |
| 21 all-scope vulnerabilities (1 critical) | **0** |
| No security gate in CI | `npm audit --omit=dev --audit-level=high` runs before lint |
| No `.github/dependabot.yml` | Present, with grouped npm + github-actions updates |

## The number everyone will quote is wrong

`git push` prints a banner claiming **114 vulnerabilities (1 critical, 42 high, 59 moderate,
12 low)**. That figure was never reproducible from the API and should not be used. The
authoritative source is:

```
gh api "repos/CASA-School/casa-website/dependabot/alerts?per_page=100" --paginate
```

At triage time that returned **28 alerts: 27 `auto_dismissed`, 1 `open`** — while
`npm audit --omit=dev` independently reported 8 production-scope issues. GitHub classified all
28 as `development` scope, which is why the Security tab looked quiet and the backlog went
unexamined. **npm was the more accurate of the two.** Do not trust the quiet GitHub UI alone.

## What was changed

### 1. Removed the vestigial `images.unsplash.com` remote pattern

`next.config.ts` allowed `/_next/image?url=https://images.unsplash.com/…`, letting anyone make
the server fetch and cache arbitrary remote content — the disk-growth vector in the `next/image`
advisory.

It was dead configuration: `grep -rn "unsplash" src/ public/` returns nothing, and all 34 photo
entries in `src/config/public-page-config.ts` are local `/media/casa/…` paths. Left over from the
placeholder-image era. Deleting it closed the surface independently of any version bump.

### 2. Dependency bumps

| Package | From | To | Notes |
| --- | --- | --- | --- |
| `next` | 16.1.6 | **16.3.1** | Resolves `next`, `postcss`, `sharp`, `nanoid` together |
| `eslint-config-next` | 16.1.6 | **16.3.1** | Pinned exactly; must always move with `next` |
| `next-intl` | 4.8.2 | **4.13.6** | Open redirect + prototype pollution |
| `ws` | 8.20.0 | **8.21.3** | See reachability note below |

A subsequent `npm audit fix` (semver-compatible only — **never** `--force`) cleared the remaining
transitives, including a critical `vitest` UI-server advisory and high `vite` / `picomatch` /
`brace-expansion` issues. Tree went from 976 to 813 packages.

### 3. Added `allowedDevOrigins: ['127.0.0.1']` — required by the Next bump

**Next 16.3 blocks cross-origin requests to dev-server resources by default.** Playwright drives
the dev server over `127.0.0.1:3001`, which Next treats as a different origin from `localhost`,
so it blocked its own JS chunks. Every interactive e2e test failed while the seven static-render
tests still passed — a failure mode that looks like a UI regression but is not.

This was confirmed by bisection, not assumed: reinstalling the 16.1.6 lockfile gave 10/10 passing
and zero blocked-origin warnings; re-applying the bump reproduced the 3 failures.

This is dev-server only and has no effect on a production build. It also matters for humans, not
just CI: without it, `npm run dev` opened via `127.0.0.1` is broken for developers too.

### 4. CI security gate

`.github/workflows/quality.yml` gained a `Security audit (production dependencies)` step before
lint:

```yaml
run: npm audit --omit=dev --audit-level=high
```

**Deliberately production-scope only.** An all-scopes audit is dominated by build-tooling
advisories that are not reachable from the deployed site — gating on that noise is precisely what
produced the "114" figure and got the whole signal ignored.

Worth recording: this workflow was failing at `npm ci` in ~15–25s for six consecutive commits
(2026-08-11 → 2026-08-14), so lint, typecheck, test, build and knip did not run on any of them.
Fixed 2026-08-16 in `0ff82d4`.

### 5. `.github/dependabot.yml`

Weekly npm updates and monthly github-actions updates. `next` and `eslint-config-next` are grouped
so they can never be bumped independently — a PR moving only one would fail lint. React majors are
ignored because React is pinned to what the Next release line expects.

## Reachability findings (verified by hand, kept for future triage)

### `ws` — real exposure is effectively nil, but it was bumped anyway

`ws` is a *direct* production dependency, which looked wrong for a marketing site. It is **not**
used by the deployed app. `src/lib/db/server.ts` uses only the HTTP `neon()` function;
`@neondatabase/serverless@1.0.2` does not list `ws` as a peer or optional dependency.

The only importers are `scripts/db/migrate.mjs` and `scripts/db/apply-sql-directory.mjs`, which
set `neonConfig.webSocketConstructor = ws` for `new Client(...)`. Both advisories principally
affect a ws **server** receiving attacker-controlled frames; these are outbound clients
connecting to Neon.

> **Open item, deliberately not changed:** `ws` and `@types/ws` are arguably `devDependencies`,
> since only ops scripts use them. Moving them would drop them from production-scope audits
> honestly rather than by patching. Not done here because `npm run db:migrate` may be run from a
> production install, and that call is the maintainer's to make.

### The request-smuggling advisory does not apply

No rewrites, no redirects, no middleware. `next.config.ts` contains only `typedRoutes`, `images`
and now `allowedDevOrigins`; there is no `middleware.ts` or `src/middleware.ts` anywhere.

### `next-intl` prototype pollution does not apply

`experimental.messages.precompile` is not enabled — `grep -rn "precompile"` over `src/` and the
root config returns nothing. next-intl is used in exactly two places (`src/app/layout.tsx` and
`src/i18n/request.ts`), and no next-intl navigation API is used, which also lowers the
open-redirect exposure. Bumped regardless, since it was free.

## Verification

All gates run after the final `next.config.ts` change:

| Gate | Result |
| --- | --- |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run test` | pass — 74 tests, 11 files |
| `npm run build` | pass — no warnings |
| `npm run knip` | pass |
| `npm run test:e2e` | pass — **10/10**, 0 blocked-origin warnings |
| `npm audit --omit=dev --audit-level=high` | pass — 0 vulnerabilities |
| `npx npm@10 ci` | pass — clean install, 812 packages |

The `npm@10 ci` run matters: CI uses Node 20 / npm 10 while local development runs npm 11, which
is more lenient. Lockfile drift between the two already broke CI once.

## Notes for the next person

- **Do not run `npm audit fix --force`.** It attempts semver-major bumps across the whole tree on
  a live site. Plain `npm audit fix` was sufficient here.
- Running `next dev` (including via the e2e suite) appends a `nextjs-agent-rules` block to
  `AGENTS.md`. It regenerates on every dev-server start and was left uncommitted here — adopting
  it should be a deliberate decision, not a side effect of running tests.
- A `vitest.config.ts` deprecation warning now appears during `npm run test`: ESM syntax in a
  file loaded as CommonJS. Harmless today; fix by renaming to `.mts` or setting
  `"type": "module"` before Vite makes `configLoader: 'native'` the default.
