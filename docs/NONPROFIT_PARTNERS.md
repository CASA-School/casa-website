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
