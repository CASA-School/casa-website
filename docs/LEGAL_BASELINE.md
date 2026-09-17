# Published legal wording baseline — 17 September 2026

User instruction: copy the current CASA legal wording first; discuss changes with the legal team later. These changes are local only. Do not push, merge, or deploy without a new instruction.

## Sources

| Document | German | English |
| --- | --- | --- |
| Privacy | https://casa-bremen.de/datenschutz | https://casa-bremen.de/en/privacy-policy |
| Terms and conditions | https://casa-bremen.de/anmeldung/geschaeftsbedingungen | https://casa-bremen.de/en/terms-and-conditions |
| Imprint | https://casa-bremen.de/impressum | https://casa-bremen.de/en/imprint |

Fetched directly on 2026-09-17. `src/lib/content/published-legal.json` contains the six complete document bodies, titles, source URLs, UTC retrieval timestamps, and SHA-256 hashes of the original responses. Original HTML, normalized text, and the import script are archived outside the deployed project at `/Users/rahmanshafiee/Archive/CASA/legal-baseline-2026-09-17/`.

Only the source `main` element is imported, excluding navigation and shared footer. Wording, numbering, dates, links and privacy-generator attribution are retained in each original language. Whitespace and heading levels are normalized for presentation. Relative links are made absolute to their original source, without changing their destination. Formatting HTML is allowlisted at import; scripts, styles, event handlers and arbitrary attributes are excluded. The template renders only this checked-in snapshot, never remote HTML at runtime.

This replaces the abbreviated English-only privacy draft and the independently adapted terms/imprint. The local added dispute-resolution clause is removed because it is absent from the published imprint. Existing dated wording (including the 2022 copyright and 2023 terms date) is intentionally retained; the retrieval date is not represented as a legal revision date.

## Later legal-team discussion

This is a faithful baseline, not legal approval of the new website. Before launch, ask the legal team to compare the published wording with the actual registration, contact, application/upload, placement-test and appointment flows, and the planned Azure/Microsoft processing. Check the original language differences and old registration links against the final launch routes. Any revised wording should be a separate reviewed change, not mixed into this import.

## Verification

Import asserts full source-main text equality after whitespace normalization for all six documents. Rendered local H1 + body text also matches each archived source after whitespace normalization; all links match. All six routes checked at 390px and 1440px with no horizontal overflow. Mobile imprint screenshot visually reviewed.

Passed: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test` (399 tests / 41 files), and `E2E_PORT=3000 npm run test:e2e -- --workers=2` (40 passed; 3 existing planner DB tests skipped because the test process has no DATABASE_URL). Preview server was restarted after it stopped responding; final checks ran against the recovered server. No email, cloud, merge or deployment actions.
