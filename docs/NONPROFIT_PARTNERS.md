# Non-profit partnerships — source record, 17 September 2026

The user confirmed CASA works with HERE AHEAD and :prime and asked for linked project logos and European TANDEM schools. Current official sources checked on 2026-09-17:

- https://www.aheadbremen.de/ explicitly says CASA plans and delivers the Academy's language courses; :prime is one of its programmes, not a separate institution.
- https://www.primebremen.de/ is the programme's own website.
- https://www.bildungsberatung-gfh.de/wde/beratung-und-foerderung/foerderung-nach-gfh.php describes advice and funding eligibility.
- https://www.obs-ev.de/akademische-qualifizierung/garantiefonds-hochschule-2022/wie-kann-ich-mich-anmelden explains that GF-H advisers check eligibility and forward applications to Otto Benecke Stiftung e.V. for processing. The two organisations are not presented as interchangeable. No automatic entitlement to funding is claimed.
- https://tandem-schools.com/en/ lists the network. The four displayed schools are a selection of members in Germany and Spain, not an exhaustive list or a claim of individually confirmed bilateral agreements. The network also includes schools outside Europe.

School membership and original logos verified on these network profiles:
- https://tandem-schools.com/en/sprachkurse/deutsch-lernen-in-deutschland/deutschkurse-in-hamburg
- https://tandem-schools.com/en/sprachkurse/deutsch-lernen-in-deutschland/deutschkurse-in-muenchen
- https://tandem-schools.com/en/sprachkurse/spanisch-lernen-in-spanien/spanischkurse-in-madrid
- https://tandem-schools.com/en/sprachkurse/spanisch-lernen-in-spanien/spanischkurse-in-granada

All four school links return HTTP 200. Logo files are hosted locally, unchanged; the white GF-H logo is displayed on a dark background for legibility. No synthetic/redrawn logos. Existing TANDEM association logo reused.

## Asset sources
- here-ahead.svg: https://www.aheadbremen.de/includes/images/logo_here_ahead_black.svg
- prime.svg: https://www.aheadbremen.de/includes/images/schriftzug_prime_black.svg
- gfh.svg: https://www.bildungsberatung-gfh.de/wde-wGlobal/wGlobal/layout/images/logo-bildungsberatung.svg
- hamburg.png: https://tandem-schools.com/fileadmin/_processed_/7/d/csm_logo-tandem-hamburg_62d29fd11c.png.pagespeed.ce.hILce-kCLB.png
- munich.png: https://tandem-schools.com/fileadmin/_processed_/4/b/csm_Logo_tandem_muenchen_c8edfce307.png.pagespeed.ce.XkR5h9AEza.png
- madrid.png: https://tandem-schools.com/fileadmin/_processed_/2/4/csm_logo_tandem_madrid_7d711cab04.png.pagespeed.ce.kNYWBsh7S7.png
- granada.png: https://tandem-schools.com/fileadmin/_processed_/c/2/csm_logo-escuela-montalban_389a799730.png.pagespeed.ce.X1nRTPFjiL.png
## Implementation and verification

`src/components/sections/nonprofit-partnerships.tsx` replaces the non-profit page's generic project cards with bilingual project explanations, linked logos and a separate network section. Community/language-exchange information remains. Desktop, tablet and phone layouts checked; no overflow. All seven new logo assets decode in the browser. Build/lint/typecheck/unit/e2e checked; evidence archived at `~/Archive/CASA/nonprofit-partners-2026-09-17/`. This refinement is local only on `codex/refine-pathway-cards`; no push, merge or deployment.

### Layout refinement after user review

Replaced the three tall project cards with separated editorial rows: aligned logo plates, readable descriptions and a dedicated desktop link column; stacked presentation on phones. Network tiles use neutral surfaces and consistent logo/name areas. Removed the remaining warm impact-panel fill and heavy legal-panel shadow for a calmer page. Checked DE/EN and 390/768/1440px; no overflow. Full build/lint/typecheck/unit/e2e checks pass (399 unit, 40 e2e, 3 existing database skips).

### Current composition — mission remains visible

Supersedes the editorial-row layout above. The user found the repeated page bands too long, then found the first consolidated version too compressed. The final layout has a spacious mission introduction beside three project tabs, a horizontal TANDEM directory, and a fully visible funding/legal section. CASA's purpose, beneficiaries, non-distribution of profits, use of course fees and existing legal/registration details remain readable without opening any controls, in DE and EN. Only the partnership descriptions use tabs; their original logo links and source-based wording remain. The existing numbered hero photo slot is unchanged and still awaits an approved photograph.

The new `nonprofit-project-tabs.tsx` uses the existing Radix dependency, keyboard navigation and reduced-motion-aware fades. All panels share the largest natural height; inactive panels are inert, hidden from assistive technology and explicitly transparent so the site's reveal effect cannot expose their text. The smoke test covers this interaction and visibility of core nonprofit information in both languages.

Verification: build, full lint, typecheck and 399 unit tests pass; 41 e2e tests pass, with 3 existing planner tests skipped because the test process has no database connection. Browser checks cover DE/EN at 320, 390, 768 and 1440px, all project tabs, stable panel heights and no horizontal overflow. Evidence: `/Users/rahmanshafiee/Archive/CASA/nonprofit-recomposition-2026-09-17/`. Local only on `codex/refine-pathway-cards`; not pushed, merged or deployed.

Google's [website policy](https://support.google.com/nonprofits/answer/1657899?hl=en), checked on 2026-09-17, asks for a prominent mission, substantial activity information and clear financial information. Preserving these details supports website clarity; this work does not establish Google for Nonprofits or Ad Grants eligibility, nor independently verify CASA's underlying legal/tax records.

### Completion check — 21 September 2026

The previous turn ended with the implementation saved but not committed; the local preview had subsequently stopped. Rechecked the saved version, restarted the preview on port 3000 and completed the local handoff. Fresh `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` and `E2E_PORT=3000 npm run test:e2e -- --workers=2` pass (399 unit, 41 e2e, 3 existing planner skips because the test process does not receive `DATABASE_URL`). The first fresh e2e run had one unrelated sign-in failure because Docker/local PostgreSQL was stopped; starting the existing Docker runtime restored the existing `casa-postgres` container, and the full rerun passed without code changes. No database recreation or migration. Desktop and responsive DE/EN checks reconfirmed visible nonprofit information and no overflow. The branch remains local; no push, merge or deployment.
