# Casa Agent Rules

Project-specific operating rules for coding agents in this repository.

## 1) Change Strategy
- Keep diffs minimal and targeted.
- Prefer one file at a time for edits unless a multi-file change is required for correctness.
- Verify local context before broad edits; do not assume patterns.
- Do not introduce new abstractions when existing patterns already solve the use case.
- If a fact is not verifiable in repo, mark it as `TODO` or `ASSUMPTION`.

## 2) Pattern Adherence
- Follow existing App Router structure and domain grouping (`src/app`, `src/components/<domain>`, `src/lib/<domain>`).
- Reuse guard and API helpers instead of custom access patterns:
  - `requirePageRoles`
  - `requireApiRoles` / `requirePortalApiContext`
  - `apiSuccess` / `apiError`
- Preserve mock-mode parity when changing auth/data flows.

## 3) Next.js SSR/Client Rules
- Default to Server Components.
- Add `'use client'` only when hooks, browser APIs, or client interactivity are required.
- Never call server-only helpers (`cookies`, server clients, redirects) inside client components.
- Guard browser-only APIs (`window`, `document`, `localStorage`) with client-safe checks.
- Keep middleware/proxy assumptions aligned with `src/proxy.ts` route protection.

## 4) UI Consistency Rules
- Use existing tokens/variables from `src/app/globals.css` and `src/config/brand/tokens.ts`.
- Use existing UI primitives from `src/components/ui` before creating new base components.
- Keep icon usage aligned with `lucide-react` and `src/config/icon-map.ts`.
- Preserve established spacing/radius/typography conventions (`Container`, radius tokens, heading styles).
- Respect reduced-motion behavior and existing focus-visible patterns.

## 5) Data and API Rules
- Keep API response envelope shape: `{ data, error }`.
- Validate request payloads with `zod` in route handlers.
- Preserve audit logging for critical write operations.
- Respect RLS-oriented assumptions and role scopes when adding queries/mutations.

## 6) Verification Gates (Required)
Run after non-trivial changes:
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e` when affected areas include routed UX or workflow behavior

If any gate is skipped, state exactly why.

## 7) Reporting Format (Required)
When delivering work, report in this order:
1. `evidence` (what in repo proved the issue)
2. `root cause` (why behavior was wrong)
3. `fix` (what changed)
4. `files` (exact paths)
5. `verification` (commands run and outcomes)
