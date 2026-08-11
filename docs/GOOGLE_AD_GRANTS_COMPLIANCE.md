# Google Ad Grants Website Compliance

Last updated: 2026-06-29

## Purpose

CASA's Google Ad Grants review feedback said the live site looked too commercial and did not make the public-benefit purpose clear enough. The development site should make CASA's nonprofit identity visible before reviewers reach course prices, accommodation, or registration flows.

Official reference: <https://support.google.com/nonprofits/answer/1657899?hl=en-gb>

Reference points to keep in view:

- Google Ad Grants requires a high-quality website connected to the nonprofit mission.
- Commercial activity must not be the website's primary purpose.
- Forms, links, mobile layout, and HTTPS handling should be checked before resubmission.

## Implemented In This Project

- Added public mission route: `/ueber-uns/gemeinnuetzigkeit`
- Folded integration-project proof points into the mission route under `#integrationsprojekte`.
- Added a homepage nonprofit callout before the main course-selection flow.
- Added "Gemeinnützigkeit" under the main "Our School" navigation without exceeding three items in a dropdown column.
- Added a concise nonprofit mention and link in the footer.
- Updated the footer legal line to show CASA as `CASA - Internationale Sprachschule gemeinnützige GmbH` without overloading the footer layout.
- Updated site structured data with CASA's nonprofit legal name.
- Updated CLARA/search knowledge so queries for nonprofit status, `gGmbH`, `Gemeinnützigkeit`, `Here Ahead`, `Garantiefonds Hochschule`, and integration projects route to the mission page.

## Production Verification Checklist

- [ ] Confirm the exact current wording of the latest `Freistellungsbescheid` before making more detailed tax-exemption claims.
- [ ] Confirm that `Staatlich anerkannter Träger der freien Jugendhilfe` and `Amtsgericht Bremen HRB 32761 HB` are still the exact public wording CASA wants in the footer.
- [ ] Confirm Here Ahead, Garantiefonds Hochschule, and Tandem descriptions with CASA staff before production launch.
- [ ] Verify production HTTP to HTTPS 301 redirect for every public route.
- [ ] Verify no display ads, affiliate links, or third-party commercial ad placements are present.
- [ ] Crawl public links after deployment, including the mission page, nav dropdowns, footer, registration forms, and contact routes.
- [ ] Run mobile QA for the homepage, nonprofit page, footer, and nav dropdown.

## Content Principle

Course prices and registration paths can stay on the site, but they should sit inside a visibly nonprofit narrative: fees sustain public-benefit education, integration support, fair teacher compensation, and the learning environment.
