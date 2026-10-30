# Google Ad Grants Website Compliance

Last updated: 2026-06-29. **Status 2026-10-30: approved.** The Ads account, the program's rules,
measurement and the campaigns are in `docs/GOOGLE_ADS.md`; this file stays the record of
eligibility and of what the website must show to keep the grant.

## Purpose

CASA's Google Ad Grants review feedback said the live site looked too commercial and did not make the public-benefit purpose clear enough. The development site should make CASA's nonprofit identity visible before reviewers reach course prices, accommodation, or registration flows.

Official reference: <https://support.google.com/nonprofits/answer/1657899?hl=en-gb>

Reference points to keep in view:

- Google Ad Grants requires a high-quality website connected to the nonprofit mission.
- Commercial activity must not be the website's primary purpose.
- Forms, links, mobile layout, and HTTPS handling should be checked before resubmission.

## Who can apply (checked 2026-10-29)

Google for Nonprofits excludes „a school, academic institution, or university (philanthropic arms
of educational organizations are eligible)" (support.google.com/nonprofits/answer/3215869). CASA
gGmbH was nevertheless **approved** in Google for Nonprofits in June 2026 (request through
Goodstack with the Freistellungsbescheid, recorded in
`~/Tasks/10-active/work/casa-website-project/notes/progress-log.md`); only the Ad Grants
activation was refused, for the website. The CASA-Förderverein e.V. remains a second route if
eligibility is ever questioned; Ad Grants requires that „your nonprofit must own the domain(s)
your ads point to" (answer/1657899).

The website policy (answer/1657899) asks for: a mission stated prominently; the programmes,
services and impact described; physical address and a registration number or tax ID and/or an
annual report; commercial activity limited, with how proceeds support the programmes disclosed;
HTTPS, working links and buttons, fast and mobile-ready pages; no excessive third-party ads; any
donation link going to a secure page dedicated to donations.

**Decision (Rahman, 2026-10-29): reapply as CASA gGmbH from casa-bremen.de.** The earlier
rejection was recorded as „too commercial", a website verdict, which Google gives after an
organisation has been accepted into Google for Nonprofits; the old site was the problem. Before
reapplying: deploy the changes below, add the tax number and Freistellungsbescheid to the
non-profit page (done), and keep the homepage's first screen saying „gemeinnützig".

## Implemented In This Project

- **2026-10-29, homepage first screen:** the eyebrow says „Gemeinnützige Sprachschule in Bremen ·
  seit 1983" (was „Deutsch lernen in Bremen"), the lead „Als gemeinnützige Sprachschule …", a
  second hero link „Unsere gemeinnützige Arbeit" beside „Kurs finden", and the proof band's
  „Unabhängige Sprachschule" became „Gemeinnützige Sprachschule". The organisation's structured
  data adds the `NGO` type to `EducationalOrganization` and `LocalBusiness`.

- **2026-10-29, `/ueber-uns/gemeinnuetzigkeit` (`#angebote`):** what the non-profit work is,
  from the Förderverein's own description — free course places for people in hardship, the
  cafeteria and Sprachcafé/Stammtisch as a place to meet, advice beyond the lesson (learning
  coaching, housing, work and study), the free tandem as a TANDEM International member; what is
  planned (an almost free telc B1 preparation course for people without funding, a scholarship
  programme); and the Förderverein itself, with a contact link (no donation link until there is
  a dedicated donation page). The Förderverein text's „bis zu 80 Nationen" is not used; the page
  keeps the approved „über 150 Länder". The legal block shows the Freistellungsbescheid word for
  word (Finanzamt Bremen, 16.10.2025, for 2021–2023, Steuernummer 60/147/04599, the three
  purposes of § 52 AO, entitled to issue Zuwendungsbestätigungen); the structured data carries the
  tax number as `taxID`.

- Added public mission route: `/ueber-uns/gemeinnuetzigkeit`
- Folded integration-project proof points into the mission route under `#integrationsprojekte`.
  **Changed 2026-10-05:** the partners have their own page, `/ueber-uns/kooperationspartner`
  (`/partners`), under Unsere Schule. The mission route now leads with the gGmbH (what
  happens to course fees, the legal facts), then the mission text with a short partner card
  linking there. The `#integrationsprojekte` anchor stays on the mission section.
- Added a homepage nonprofit callout before the main course-selection flow.
  **Rebuilt 2026-08-20.** It had ended up the flattest band on the page — no
  surface of its own, a hairline standing in for a boundary, and three claims
  stretched across the full 85rem grid while the statement above them was clamped
  to 46rem. It now sits on `--casa-canvas` (a real 11-unit step from the white
  above) with the three commitments in one raised, divided panel clamped to the
  statement's measure. The band moved below the course formats on 2026-08-16 and
  is still linked to `/ueber-uns/gemeinnuetzigkeit`; the requirement is that the
  narrative be visible, not that it sit in a particular position.
- Added "Gemeinnützigkeit" under the main "Our School" navigation without exceeding three items in a dropdown column.
- Added a concise nonprofit mention and link in the footer.
- Updated the footer legal line to show CASA as `CASA - Internationale Sprachschule gemeinnützige GmbH` without overloading the footer layout.
- Updated site structured data with CASA's nonprofit legal name.
- Updated CLARA/search knowledge so queries for nonprofit status, `gGmbH`, `Gemeinnützigkeit`, `Here Ahead`, `Garantiefonds Hochschule`, and integration projects route to the mission page.
  Since 2026-10-05 partner queries (`Here Ahead`, `Garantiefonds Hochschule`, Visionskultur,
  Hood Training, TANDEM, "Kooperationspartner") route to `/partners`; nonprofit queries still
  route to the mission page.

## Production Verification Checklist

- [ ] Confirm the exact current wording of the latest `Freistellungsbescheid` before making more detailed tax-exemption claims.
- [ ] Confirm that `Staatlich anerkannter Träger der freien Jugendhilfe` and `Amtsgericht Bremen HRB 32761 HB` are still the exact public wording CASA wants in the footer.
- [ ] Confirm Here Ahead, Garantiefonds Hochschule, and Tandem descriptions with CASA staff before production launch.
- [~] Verify production HTTP to HTTPS 301 redirect for every public route.
      **On the preview, 2026-10-26:** `http://neu.casa-bremen.de/…` answers 301 to the same
      path and query on https (the Container App's ingress refuses plain http). Check once more
      on `casa-bremen.de` and `www` after the domain moves.
- [x] Verify no display ads, affiliate links, or third-party commercial ad placements are present.
      **2026-10-26:** no page loads a third-party script or iframe; the 35 outbound links go to
      partners, telc/TestDaF/Klett, public bodies (Auswärtiges Amt, uni-assist, Studierendenwerke),
      Google Maps and CASA's own Facebook and Instagram.
- [x] Crawl public links after deployment, including the mission page, nav dropdowns, footer, registration forms, and contact routes.
      **2026-10-26**, against a production build of the go-live branch: all 72 sitemap pages
      answer 200, every internal link on them (113) answers 200 or redirects once to a 200, all
      35 outbound links open (studierendenwerke.de refuses scripts with 403 but opens in a
      browser). axe (WCAG 2.1 A/AA) found two faults, both fixed: a gold label on the news page
      at 2.76:1, and the job cards' `<dl>` markup on the careers page.
- [x] Run mobile QA for the homepage, nonprofit page, footer, and nav dropdown.
      **Footer and phone menu done 2026-10-26** at 375 and 320, German and English: no overflow,
      the menu and each of its five panels clean under axe, the footer's legal links wrap
      clear of the CLARA button. The header's screen-reader labels („Menü öffnen",
      „Zur CASA-Startseite", „Hauptnavigation") now follow the page's language.
      **Homepage nonprofit band and `/ueber-uns/gemeinnuetzigkeit` done 2026-08-20**,
      measured at 375 / 414 / 768 / 1024 / 1280 / 1440: no document overflow at any
      width, no element overflowing its parent, and the two worst measures fixed —
      the mission page's three principles were 167px wide at 1024 (now 288px) and
      the legal table's label column collapsed to 133px (now floored at 9rem).
      The secondary-CTA link primitive also went from a 21px hit area to 45px.

## Content Principle

Course prices and registration paths can stay on the site, but they should sit inside a visibly nonprofit narrative: fees sustain public-benefit education, integration support, fair teacher compensation, and the learning environment.
