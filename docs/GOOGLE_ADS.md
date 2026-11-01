# Google Ads: the Ad Grants account

CASA's free Google search ads: what the grant is, its rules, how sign-ups are measured, and the
campaigns. Checked 2026-10-30; made the brief for any agent on 2026-10-31. The same plan as a
13-page PDF for Rahman: `~/Downloads/CASA-site/output/ad-grants/CASA-Ad-Grants-Plan.pdf` (not in
git). Eligibility and the website requirements are in docs/GOOGLE_AD_GRANTS_COMPLIANCE.md.

## State

- **Approved 2026-10-30.** Google Ads account **343-341-7137**, „CASA - Internationale
  Sprachschule gemeinnützige GmbH", currency USD. r.shafiee@ accepted the invitation as
  administrator, accepted the payments profile 9486-6175-4118 (administrator and primary contact)
  and the Google Ireland advertising terms the same day. Billing says „Wir stellen das nicht in
  Rechnung".
- **Live since 2026-10-31:** „Deutsch am Abend – Bremen" (id 24423184939, §First campaign) and
  „Deutsch intensiv – Bremen" (id 24412445946, §Second campaign), 50 USD a day each. Call reporting is off (Rahman, 2026-10-31), so Google
  counts no conversions until A1; no tracking on the site. Google created one inactive website
  conversion action („Lead-Formulare senden") during the build; it has no tag and does nothing.
- The account picker also lists a second, empty „Google Ads-Konto" 715-735-9700 („wird
  eingerichtet"), not CASA's grant account. Never build in it.
- **Decisions pending with Rahman** (below). Nothing in the account changes without his go.
- Ad Grants never asks for card details. If Google Ads asks for one, it is the wrong account:
  check the number at the top right.

## Working on the account (Claude, Codex, Gemini or a person)

This file is the whole brief. An agent that cannot read the repository gets it attached or pasted,
with this prompt:

> You are helping CASA Bremen („CASA - Internationale Sprachschule gemeinnützige GmbH", a
> non-profit language school) with its Google Ad Grants account 343-341-7137. The attached
> GOOGLE_ADS.md is your brief: read all of it before you act. Do only the task Rahman gives you,
> inside the limits in „Working on the account". Before you change anything, compare the live
> account with „State" and tell Rahman where they differ. When you finish, give Rahman a dated list
> of what you changed, for the „Account log", and anything in this file that turned out to be wrong.

Agents with the repository read CLAUDE.md, `docs/PARALLEL_AGENT_WORK_BOARD.md` (units A1–A5) and
`docs/OPERATIONS.md` §Accounts first.

**Limits**

- **The agent prepares, Rahman approves.** Campaigns, ad groups, keywords, ads and assets are built
  **paused**. Only Rahman, or an agent he tells to for that step, enables a campaign, publishes a
  text or changes a running budget.
- **Never:** accept terms or invitations; enter or change payment details; link or unlink accounts
  (Analytics, Search Console, Merchant Center, YouTube…); add or remove users or change access;
  change the account's name, currency or time zone; sign in, sign out or enter a password for
  Rahman; answer the program survey for CASA.
- **Google's suggestions are not approvals.** Auto-apply recommendations stay off. AI Max for
  Search, final URL expansion, automatically created assets and broad match stay off until Rahman
  says otherwise: they write texts and pick landing pages nobody approved, and loose matching spends
  the click rate the grant depends on. The optimisation score is not a goal.
- **Texts:** German says „du"; British English; no prices or dates that go stale; nothing from
  §Visa wording; every claim must already be on casa-bremen.de. Approved figures: 30,000+
  learners, 150+ countries, ages 7–80+, 45,000+ course bookings, 40+ staff and teachers, in Bremen
  since 1983.
- **The website is not part of the account work.** Landing pages, the consent box and tracking are
  code in the repository (units A1, A3). Never a Google tag, a tag manager or a script added to the
  site from outside it; the privacy policy promises none (§Measuring sign-ups).
- **Where:** ads.google.com, customer 343-341-7137 (check the number at the top right before every
  change), administrator r.shafiee@casa-bremen.de. On Rahman's Mac it is open in Chrome „Browser 1".
- **Afterwards:** a dated line per change in „Account log" (what, who, paused or live), and „State"
  corrected. An agent without the repository hands those lines to Rahman.

## The grant

- Up to **10,000 USD a month**, about **329 USD a day** for all campaigns together. Unused money
  does not roll over; there is no minimum. Google calls it „a limit, not a guarantee of spend".
- **Google Search only.** Search partners, Display and YouTube are off. Performance Max is allowed
  on Search and Maps inventory (since 2024/2025); Smart campaigns too.
- Grant ads run in a separate auction **below paid ads** and only above a quality threshold.
- Manual bids stop at 2 USD a click; Maximize conversions (required anyway) may bid above it.

## The rules (support.google.com/grants/answer/117827)

| Rule | In practice | If missed |
| --- | --- | --- |
| Conversion-based Smart bidding | Every campaign on Maximize conversions (or Target CPA etc.). Maximize clicks only to start | Strategy changed by Google or account paused |
| ≥ 1 conversion a month | Page views and time on site do not count | Account paused |
| 5 % click rate, account level, monthly | Checked from the account's 90th day, so from about the end of January 2027 | Paused after 2 months in a row |
| Keywords | No single words (exceptions: own brand, acronyms, a short list), nothing overly generic, no Quality Score 1–2 | Keyword paused silently |
| Structure | ≥ 2 ad groups per campaign; ≥ 2 sitelinks to different pages, not the homepage; specific geo-targeting | Account paused |
| Program survey | About once a year, to the login addresses; must be answered | Account paused |
| Website | Mission clear; commercial activity limited and „how proceeds support programs" disclosed (the Gemeinnützigkeit page does this) | Grant withdrawn |
| Eligibility | Google for Nonprofits excludes „a school, academic institution, or university" (philanthropic arms are eligible). CASA gGmbH was approved, but can be reviewed again. Fallback: CASA-Förderverein e.V., which would need its own domain | Suspension |

Reinstatement after fixing a problem: support.google.com/grants/contact/Request_for_reactivation_cases_2.

## Measuring sign-ups (the decision that comes first)

The German authorities (DSK, Orientierungshilfe Digitale Dienste 1.2) and the EDPB (Guidelines
2/2023, paras 49–51) read a tracking identifier in a link, such as Google's `gclid`, as storage on
and access to the device, so § 25 TDDDG needs **consent**; measuring ads is not „strictly
necessary", and legitimate interest fails because Google also uses the data for itself. No court
has ruled on it. The site's privacy policy promises no cookies and nothing stored in the browser
(§ 5), so the recommended design, **way A**, is:

1. Auto-tagging puts `gclid` on the landing URL. The page keeps it **in memory only** (no cookie,
   no storage), across client-side navigation.
2. Every lead form (course and exam registration, contact, placement and group appointments, the
   interest list) shows an **unticked** box, not required to submit:
   „Ich bin einverstanden, dass CASA die Google-Klick-ID dieser Anfrage an Google übermittelt."
   (90 characters; the English page needs its own wording.)
3. Only when ticked does the gclid go with the submission and get stored on the record (a
   nullable column per lead table, or one `ad_clicks` table keyed to the record). Unticked: not
   stored, not logged.
4. A signed HTTPS endpoint (secret in a Container App secret) serves a CSV in Google's offline
   conversion format: Google Click ID, Conversion Name, Conversion Time with time zone, and
   `Ad User Data = Granted`. **Google's Data Manager** fetches it on a daily schedule; it needs no
   developer token. (Uploads through the Google Ads API are blocked since 2026-06-15.) Clicks
   older than 90 days are not importable; delete the gclid after upload and after 90 days at the
   latest.
5. **Calls** from a Google forwarding number on the ads count from 30 seconds (Ad Grants accepts
   them) as a backstop for quiet months.

Rejected: Google's tag with a cookie banner (lawful, but ends privacy § 5); the tag without a
banner in „advanced consent mode" (pings before consent; high risk in Germany); enhanced
conversions for leads (hashed email; same consent need, no advantage).

**The privacy policy must add:** the consent and its basis (§ 25 (1) TDDDG, Art. 6 (1) (a) GDPR);
what is sent (click ID, conversion kind and time); the recipient (Google Ireland; Google LLC as an
independent controller; USA under the EU-US Data Privacy Framework, Art. 45 GDPR); retention (up
to 90 days); withdrawal; call forwarding through Google numbers; and that the site still sets no
cookies. A data protection specialist checks it before release (CASA has no data protection
officer named; docs/PRIVACY_POLICY.md, open questions).

Conversion actions to create in Google Ads (import, „One" per lead): course registration, exam
registration, enquiry, appointment, interest list; plus calls ≥ 30 s. All primary.

## Search volumes (Keyword Planner in the account, Oct 2025 – Sep 2026, ranges until ads run)

| Germany | a month | top bid USD |
| --- | --- | --- |
| bildungsurlaub bremen | 1k–10k | 0.08–1.08 |
| deutschkurs bremen · sprachschule bremen · bildungszeit bremen · sprachcafe bremen | 100–1k each | 0.11–5.71 |
| deutsch lernen bremen · deutschkurs b1/b2/c1 bremen · german course bremen · telc c1 hochschule bremen | 10–100 each | 0.48–3.19 |
| under 10: abendkurs deutsch bremen, intensivkurs deutsch bremen, telc b2 bremen, learn german bremen | | |
| all Germany: einstufungstest deutsch, telc b2 prüfung, telc c1 prüfung, telc c1 hochschule, deutschkurs, deutsch lernen | 1k–10k each | 0.04–5.28 |
| all Germany: intensivkurs deutsch, deutsch für pflegekräfte, bildungsurlaub englisch/sprachkurs | 100–1k each | 0.32–4.01 |

| Worldwide | a month |
| --- | --- |
| learn german in germany (= german language course in germany, study german in germany, german classes in germany; Google groups them) | 1k–10k |
| almanya dil okulu (Turkish) | 1k–10k |
| language course visa germany · sprachvisum deutschland · curso de alemán en alemania · curso de alemão na alemanha · corso di tedesco in germania · telc b2 exam | 100–1k each |
| intensive german course germany · learn german in bremen · almanya'da almanca kursu · dil vizesi almanya · cours d'allemand en allemagne · курсы немецкого в германии · học tiếng đức tại đức | 10–100 each |
| too broad: learn german, german course | 10k–100k |

Bremen is small: campaigns there will use a small part of the grant. Germany-wide searches reach
us only from the Bremen area once geo-targeting is set.

## Campaigns in Bremen

Bremen and about 30 km (Bildungszeit: the state of Bremen, where the law applies; exams: 50 km).
Since September 2026 Search has no language setting: Google matches the search's language, so
English searchers get the English ad groups.

| Campaign | Ad groups | Keywords, for example | Lands on |
| --- | --- | --- | --- |
| Deutschkurse Bremen | Intensive · Evening · Placement test · English speakers | deutschkurs bremen, sprachschule bremen, deutsch lernen bremen, deutschkurs b2 bremen, abendkurs deutsch bremen, einstufungstest deutsch, german course bremen | /sprachkurse/deutsch-intensiv, /sprachkurse/deutsch-am-abend, /anmeldung/einstufungstest, /en/courses/intensive-german |
| telc-Prüfungen | B2 · C1 Hochschule | telc b2 prüfung, telc b2 bremen, telc c1 hochschule, telc c1 hochschule bremen | /pruefungszentrum/telc-deutsch-b2, …/telc-deutsch-c1-hochschule |
| Bildungszeit | German · English | bildungszeit bremen, bildungsurlaub bremen, bildungsurlaub englisch bremen | /sprachkurse/bildungszeit-deutsch |
| Pflege und Medizin | Nursing · Medicine | deutsch für pflegekräfte, deutschkurs pflege bremen, deutsch für mediziner, fachsprache medizin kurs | /sprachkurse/deutsch-fuer-mediziner |
| Gemeinsam Deutsch sprechen (mission) | Language café · Tandem | sprachcafe bremen, deutsch sprechen üben bremen, sprachtandem bremen | /ratgeber/sprachtandem, /ueber-uns/gemeinnuetzigkeit |

Negative keywords: integrationskurs, berufssprachkurs, bildungsgutschein, jobcenter (CASA offers
none of these, FAQ); online, app, kostenlos lernen, duolingo, pdf, übungen; job, gehalt, lehrer
werden, ausbildung; goethe.

Sitelinks: Kurstermine, Einstufungstest, Anmeldung, Gemeinnützige Arbeit (EN: Course dates,
Visa and FAQ, Accommodation, Our non-profit work). Callouts: Gemeinnützige Schule, Seit 1983,
Über 150 Herkunftsländer, Mitten in Bremen (EN: Non-profit school, Since 1983, From 150+
countries). 1983 is the school's founding year, not the start of its non-profit status: never
join the two („gemeinnützig seit 1983", „non-profit since 1983").

Draft texts (checked against 30/90/25 characters; du in German; no prices or dates that go stale;
Rahman approves before anything is published):

- Intensive (DE) headlines: Deutschkurs in Bremen · Gemeinnützige Sprachschule · Intensivkurs von A1
  bis C1 · Seit 1983 in Bremen · In drei Schritten anmelden · Vormittags und nachmittags ·
  Kostenloser Einstufungstest. Descriptions: „Lerne Deutsch bei CASA, der gemeinnützigen
  Sprachschule mitten in Bremen." · „Intensivkurse mit 20 Unterrichtseinheiten pro Woche, ein
  Niveau in 8 Wochen." · „Lernende aus über 150 Ländern. Finde deinen Kurs und melde dich online an."
- Evening (DE): Abendkurs Deutsch in Bremen · Deutsch lernen nach der Arbeit · Zweimal pro Woche
  abends. „Deutsch am Abend bei CASA, der gemeinnützigen Sprachschule in Bremen."
- telc (DE): telc-Prüfung in Bremen · telc Deutsch B2 bei CASA · telc C1 Hochschule · Mit
  Vorbereitungskurs. „Prüfungszentrum der gemeinnützigen Sprachschule CASA. Termine und Anmeldung online."
- Bildungszeit (DE): Bildungszeit in Bremen · Deutsch oder Englisch · Nach Bremischem Gesetz.
  „Nutze deine Bildungszeit für einen Sprachkurs. Wir beraten dich zu Kurs und Unterlagen."
- International (EN): Learn German in Bremen · Non-profit language school · Intensive German, A1
  to C1 · 20 lessons a week · Shared flat or host family. „Study German at CASA, a non-profit school
  in Bremen. 20 lessons a week, A1 to C1." · „Courses, accommodation and the registration letter for
  your visa application."

Bidding: Maximize clicks for the first weeks, Maximize conversions once conversions arrive. Daily
budgets per campaign that together stay under 329 USD. An account-level final URL suffix
`utm_source=google&utm_medium=cpc&utm_campaign={campaignid}` (or a readable name per campaign) so
ad visits appear in Statistik.

### Build details

- **Type and networks:** Search campaigns; Google Search only, Search partners and Display off.
- **Locations:** as in the table, with the location option „Presence: people in or regularly in
  your included locations", not „interest", so a search for „deutschkurs bremen" made in Delhi
  does not see the Bremen ads.
- **Match types (recommendation, part of decision 4):** phrase and exact to start; broad only once
  conversions arrive and the click rate is safely above 5 %. No single-word keywords except
  „CASA". The negatives above as one shared list at account level.
- **Ads:** one responsive search ad per ad group to start, with the drafted lines plus more in the
  same voice to reach 8–15 headlines and 4 descriptions; final URL from the table below.
- **Statistik and the suffix:** `/admin/statistics` labels a visit whose link carries `gclid`,
  `gbraid` or `wbraid` as „Google Ads", otherwise `utm_source · utm_campaign`
  (`campaignOf` in `src/lib/site-views.ts`). Since the click ID wins, the suffix does not yet split
  ad visits by campaign; preferring `utm_campaign` when both are present fixes it (with A1, or a
  small PR of its own).

Final URLs (all answered 200 on 2026-10-31):

| Ad group | German | English |
| --- | --- | --- |
| Intensive | https://casa-bremen.de/sprachkurse/deutsch-intensiv | https://casa-bremen.de/en/courses/intensive-german |
| Evening | https://casa-bremen.de/sprachkurse/deutsch-am-abend | https://casa-bremen.de/en/courses/evening-course |
| Placement test | https://casa-bremen.de/anmeldung/einstufungstest | https://casa-bremen.de/en/placement-test |
| telc B2 | https://casa-bremen.de/pruefungszentrum/telc-deutsch-b2 | https://casa-bremen.de/en/exams/b2 |
| telc C1 Hochschule | https://casa-bremen.de/pruefungszentrum/telc-deutsch-c1-hochschule | https://casa-bremen.de/en/exams/c1 |
| Bildungszeit | https://casa-bremen.de/sprachkurse/bildungszeit-deutsch | https://casa-bremen.de/en/courses/bildungszeit |
| Nursing · Medicine | https://casa-bremen.de/sprachkurse/deutsch-fuer-mediziner | https://casa-bremen.de/en/courses/german-for-medical |
| Language café · Tandem | https://casa-bremen.de/ratgeber/sprachtandem | https://casa-bremen.de/en/resources/language-tandem |
| Mission | https://casa-bremen.de/ueber-uns/gemeinnuetzigkeit | https://casa-bremen.de/en/about/nonprofit |

Sitelinks: Kurstermine → `/sprachkurse` (ASSUMPTION: the course overview; no page holds the dates
alone), Einstufungstest → `/anmeldung/einstufungstest`, Anmeldung → `/anmeldung/anmeldeformular`,
Gemeinnützige Arbeit → `/ueber-uns/gemeinnuetzigkeit`. English: Course dates → `/en/courses`, Visa
and FAQ → `/en/faq`, Accommodation → `/en/accommodation`, Our non-profit work →
`/en/about/nonprofit`. A German path never gets an English ad, and the other way round.

## First campaign: Deutsch am Abend (decided 2026-10-31)

Rahman, 2026-10-31: the evening course numbers are falling, so the first campaign is the evening
course alone, in Bremen, for people who work during the day and have their evenings free. It
replaces the Evening ad group of „Deutschkurse Bremen"; when that campaign follows, a keyword lives
in one campaign only. Texts checked against Google's limits on 2026-10-31. **Built paused on
2026-10-31** exactly as below, with the differences listed under „As built".

**The course (casa-bremen.de/sprachkurse/deutsch-am-abend, 2026-10-31):** twice a week, 18:30–20:00,
Monday + Wednesday or Tuesday + Thursday; 4 lessons a week; A1 to C1, half a level per trimester
of about 3½ months; small international groups; from 378 € a trimester plus the book. The next
trimester starts **4 January 2027**, the only start for beginners (A1.1); with some German, people
join a running course when places are free. So until Christmas the campaign's job is filling
January. Over Christmas the office works shorter hours, not closed (Rahman, 2026-10-31).

**Settings**

| Setting | Value |
| --- | --- |
| Name | Deutsch am Abend – Bremen |
| Type, networks | Search; Google Search only |
| Locations | 25 km around Am Dobben 14 (Bremen, Delmenhorst, Achim, Lilienthal, Stuhr, Weyhe, Oyten); „Presence" only. Bremerhaven is too far for two evenings a week |
| Bidding | Maximize clicks until conversions arrive, then Maximize conversions |
| Budget | 50 USD a day (Google spends what the searches allow; the evening searches will not reach it) |
| Ad schedule | All day, every day: people look during lunch and after work |
| Final URL suffix | `utm_source=google&utm_medium=cpc&utm_campaign=abendkurs` |

Because the ads reach only people in the Bremen area, keywords without „bremen" (such as
„deutschkurs abends") still reach only Bremen searchers. That is where most of the reach is:
„abendkurs deutsch bremen" itself has fewer than 10 searches a month. Expect tens of clicks a
month, not hundreds (ASSUMPTION until it runs; Keyword Planner gives ranges only).

**Ad groups and keywords** (phrase match „…", exact match […])

| Ad group | Keywords | Final URL |
| --- | --- | --- |
| Abends und neben dem Beruf | „abendkurs deutsch", [abendkurs deutsch bremen], „deutschkurs abends", „deutschkurs am abend", „deutsch lernen abends", „deutschkurs nach der arbeit", „deutschkurs nach feierabend", „deutschkurs berufsbegleitend", „deutschkurs neben dem beruf", „deutsch lernen neben dem job", „deutschkurs teilzeit" | /sprachkurse/deutsch-am-abend |
| Deutschkurs Bremen | „deutschkurs bremen", [deutschkurs bremen], „deutsch lernen bremen", „deutschkurs a1 bremen", „deutschkurs a2 bremen", „deutschkurs b1 bremen", „deutschkurs b2 bremen", „deutschkurs c1 bremen", „sprachschule bremen deutsch" | /sprachkurse/deutsch-am-abend |
| German evening classes (EN) | „german evening classes", „german evening course", „evening german course", „german course after work", „part time german course", „german course bremen", „german classes bremen", „learn german bremen", „german lessons bremen" | /en/courses/evening-course |

Two German groups with the same ads on purpose: they show how many people look for an evening
course and how many look for any course and still choose the evening.

**Negatives** (one shared list for the campaign): integrationskurs, berufssprachkurs,
bildungsgutschein, jobcenter, vhs, volkshochschule, goethe, intensiv, intensivkurs, kinder,
schüler, kostenlos, gratis, online, app, duolingo, pdf, übungen, arbeitsblatt, telc, dtz,
einbürgerungstest, prüfung, stellenangebote, gehalt, lehrer werden, englisch, spanisch,
französisch; free, online, app, jobs, teacher, translator. Not „job": it would block
„deutsch lernen neben dem job".

**Ads** (one responsive search ad per group; path `casa-bremen.de/abendkurs/deutsch`, English
`/evening-classes/german`)

German headlines (≤ 30): Abendkurs Deutsch in Bremen · Deutschkurs am Abend · Deutsch lernen nach
der Arbeit · Deutsch nach Feierabend · Neben dem Beruf Deutsch lernen · Zweimal pro Woche abends ·
Abends von 18:30 bis 20:00 · Mo + Mi oder Di + Do · Alle Niveaus von A1 bis C1 · Kleine
internationale Gruppen · Kostenloser Einstufungstest · Gemeinnützige Sprachschule · Seit 1983 in
Bremen · Deutschkurs in Bremen · Jetzt online anmelden

German descriptions (≤ 90):
- Lerne Deutsch am Abend bei CASA, der gemeinnützigen Sprachschule mitten in Bremen.
- Zweimal pro Woche, 18:30–20:00 Uhr, montags und mittwochs oder dienstags und donnerstags.
- Mit Vorkenntnissen steigst du in einen laufenden Kurs ein, wenn noch Plätze frei sind.
- Kleine internationale Gruppen von A1 bis C1. Mach zuerst den kostenlosen Einstufungstest.

English headlines: German evening classes Bremen · Learn German after work · German course in
Bremen · Two evenings a week · Evenings, 18:30 to 20:00 · Mon + Wed or Tue + Thu · All levels from
A1 to C1 · Small international groups · Free placement test · Non-profit language school · In
Bremen since 1983 · Learners from 150+ countries · Register online

English descriptions:
- Learn German in the evening at CASA, a non-profit language school in the heart of Bremen.
- Twice a week, 18:30–20:00, on Mondays and Wednesdays or on Tuesdays and Thursdays.
- If you already speak some German, join a running course whenever places are free.
- Small international groups from A1 to C1. Take the free placement test first.

**Assets** (German ones on the German groups, English on the English group)

| Sitelink | Lines | URL |
| --- | --- | --- |
| Einstufungstest | Kostenlos online · Oder vor Ort mit Termin | /anmeldung/einstufungstest |
| Zur Anmeldung | In drei Schritten anmelden · Ein Trimester wählen | /anmeldung/anmeldeformular |
| Gemeinnützige Arbeit | Keine Gewinnausschüttung · Einnahmen fließen in die Bildung | /ueber-uns/gemeinnuetzigkeit |
| Beratung anfragen | Niveau, Termine, Gebühren · Per Formular oder Telefon | /kontakt |
| Placement test | Free and online · Or in person by appointment | /en/placement-test |
| Register | Three steps to your course · Choose a trimester | /en/registration/course |
| Our non-profit work | No profits paid out · Income stays in education | /en/about/nonprofit |
| Ask us | Level, dates, fees · By form or phone | /en/contact |

Callouts: Gemeinnützige Schule · Seit 1983 · Kleine Gruppen · Einstufungstest kostenlos ·
Kostenfreies Sprachcafé · Mitten in Bremen; English: Non-profit school · Since 1983 · Small groups ·
Free placement test · Free language café. Seasonal, with the asset's end date set to 3 January
2027: „Neuer Kurs ab 4. Januar" / „New course from 4 January".

Call asset: +49 421 460 414 30, shown only in office hours (Mon–Thu 08:30–18:30, Fri 08:30–12:30),
also over Christmas. Its call conversion keeps Google's default length: it is there for the grant's
one conversion a month, not to count every call (Rahman, 2026-10-31).

**Measuring it.** The people this campaign is for register in the evening, when the office is
closed, so calls alone will undercount it: the forms are what count, which means unit A1 (the
consent box and the Data Manager list). Two ways to start:
- **Calls first (recommended, because January is close):** build now, switch on with the call
  conversion once decision 3 is yes and the privacy policy has its paragraph on call forwarding;
  A1 follows in parallel and adds the forms.
- **Wait for A1:** both measures from day one, but the campaign starts later and has less time
  before 4 January.

Without A1, a registration from the campaign still shows in the workspace and in Statistik („Google
Ads" as the visit's campaign), just not in Google Ads.

**How we know it worked:** evening registrations for the 4 January 2027 start compared with the
January 2026 and August 2026 starts (workspace); ad visits and their landing pages in Statistik;
conversions and the click rate in Google Ads. Look at the search terms report weekly for the first
month and add negatives.

**As built (2026-10-31)**

- Campaign id 24423184939, paused, start date 31 Oct 2026, no end date, 50 USD a day, Maximize
  clicks with no CPC cap. Google's estimate at that budget: about 125 clicks a week at 2.80 USD.
- The campaign wizard demands a goal: „Lead-Formulare senden" (form submissions) is set; it is only
  a label until A1 delivers conversions. EU political ads: answered „no".
- AI Max, text customisation, final URL expansion, automatically created assets, broad match and
  dynamic search ads: all off, checked on the campaign's own settings page (the wizard's summary
  page showed some of them wrongly).
- Languages German and English. Ad groups: „Abends und neben dem Beruf" (11 keywords), „Deutschkurs
  Bremen" (9; same ad as the first group), „German evening classes (EN)" (9). 27 phrase, 2 exact.
- 33 negatives on the campaign (broad negatives), not yet a shared list.
- Assets at ad group level: the 4 German sitelinks and 6 callouts on both German groups, the 4
  English sitelinks and 5 callouts on the English group, the seasonal callout in each language with
  end date 3 Jan 2027. The call asset (0421 460 414 30) is on the campaign, Mon–Thu 08:30–18:30
  and Fri 08:30–12:30. Call reporting was switched off afterwards (Rahman, 2026-10-31), so the ad
  shows CASA's own number and no call is counted. „Small groups" is marked „eingeschränkt" for a
  religion policy, which looks like a false flag.
- Google's tag setup page after publishing was skipped: no tag on the site.

**Before it goes live:** Rahman switches the campaign on. With call reporting off, the grant's one
conversion a month has to come from A1 (the form list); without it Google can pause the account
after warnings. Each step goes into „Account log".

**How we judge it (Rahman, 2026-10-31):** evening registrations for January 2027 against the
evening registrations of 2026. Google's conversion counts are for the grant rules, not the verdict.

## Second campaign: Deutsch intensiv (built paused 2026-10-31)

Rahman, 2026-10-31: one more campaign, for the intensive courses, on their own page. Built paused
the same day as below; Rahman published it in the wizard (start date 1 Dec), Claude paused it at
once and set the start date to 31 Oct.

**The course (casa-bremen.de/sprachkurse/deutsch-intensiv, 2026-10-31):** 20 lessons of 45 minutes
a week; a complete level in 8 weeks, A1 to C1 in a year; mornings Mon–Fri 09:00–12:30 or
afternoons Mon–Thu 13:00–17:30; international groups of 10 to 16; starts through the year; free
placement test. So no „Kleine Gruppen" callout here.

**Settings:** id 24412445946, „Deutsch intensiv – Bremen", Search only, 25 km around Am Dobben 14
with „Presence", German and English, Maximize clicks, 50 USD a day (Google's estimate: about 112
clicks a week at 3.13 USD), suffix `utm_source=google&utm_medium=cpc&utm_campaign=intensivkurs`,
AI Max, text customisation, URL expansion, automatically created assets and broad match off (checked
on the settings page).

**Ad groups** (phrase „…", exact […])

| Ad group | Keywords | Final URL |
| --- | --- | --- |
| Intensivkurs Deutsch | „intensivkurs deutsch", [intensivkurs deutsch bremen], „deutsch intensivkurs", „deutsch intensivkurs bremen", „deutschkurs intensiv", „deutsch intensiv lernen", „intensiver deutschkurs", „deutschkurs vollzeit", „deutschkurs vormittags", „deutschkurs täglich", „deutsch schnell lernen" | /sprachkurse/deutsch-intensiv |
| Intensive German (EN) | „intensive german course", „german intensive course", „intensive german course bremen", „german intensive course bremen", „intensive german classes", „full time german course", „learn german fast", „german course mornings", „daily german classes" | /en/courses/intensive-german |

General searches („deutschkurs bremen", „german course bremen") stay in the evening campaign; a
keyword lives in one campaign only.

**Negatives (41, on the campaign):** the evening campaign's list without „intensiv"/„intensivkurs",
plus abends, abend, abendkurs, feierabend, berufsbegleitend, teilzeit, wochenende, evening, part
time, weekend, so the two campaigns do not compete.

**Ads** (path `/intensivkurs/deutsch`, English `/intensive/german`)

German headlines: Intensivkurs Deutsch in Bremen · Deutsch intensiv lernen · 20 Einheiten pro Woche ·
Ein Niveau in 8 Wochen · In einem Jahr von A1 bis C1 · Vormittags oder nachmittags · Vormittags 9:00
bis 12:30 · Nachmittags 13:00 bis 17:30 · Internationale Gruppen · Kostenloser Einstufungstest ·
Gemeinnützige Sprachschule · Seit 1983 in Bremen · Deutschkurs in Bremen · Für Studium und Beruf ·
Jetzt online anmelden

German descriptions:
- Lerne Deutsch intensiv bei CASA, der gemeinnützigen Sprachschule mitten in Bremen.
- 20 Unterrichtseinheiten pro Woche: ein komplettes Niveau in 8 Wochen, von A1 bis C1.
- Vormittags Mo–Fr 9:00–12:30 Uhr oder nachmittags Mo–Do 13:00–17:30 Uhr.
- Lernende aus über 150 Ländern. Mach zuerst den kostenlosen Einstufungstest.

English headlines: Intensive German in Bremen · Learn German intensively · 20 lessons a week · One
level in 8 weeks · From A1 to C1 in a year · Mornings or afternoons · International groups · Free
placement test · Non-profit language school · In Bremen since 1983 · Learners from 150+ countries ·
For study and work · Register online

English descriptions:
- Learn German intensively at CASA, a non-profit language school in the heart of Bremen.
- 20 lessons a week: a complete level in 8 weeks, from A1 to C1.
- Mornings Mon–Fri 09:00–12:30 or afternoons Mon–Thu 13:00–17:30.
- Learners from over 150 countries. Take the free placement test first.

**Assets:** German group: sitelinks Einstufungstest, Online anmelden (Kurs und Starttermin wählen ·
Wir bestätigen deinen Platz → /anmeldung/anmeldeformular), Gemeinnützige Arbeit, Beratung anfragen;
callouts Gemeinnützige Schule, Seit 1983, Ein Niveau in 8 Wochen, Einstufungstest kostenlos,
Kostenfreies Sprachcafé, Mitten in Bremen. English group: Placement test, Register online (Choose
your course and start · We confirm your place → /en/registration/course), Our non-profit work, Ask
us; callouts Non-profit school, Since 1983, One level in 8 weeks, Free placement test, Free language
café. The evening campaign's call asset (office hours) is reused on the campaign.

**As with the evening campaign:** Google pre-filled the new English ad group with its own AI keywords
(broad) and AI ad text, including „Dein Browser ist zu alt …" from the page; all of it was replaced.
**How we judge it:** intensive registrations from Bremen in the months it runs against the same
months of 2026 (workspace).

## Learners abroad

Three groups search for a course in Germany:

1. **Short stays without a visa:** EU citizens, and visitors from visa-free countries (USA, Brazil,
   Mexico, Colombia, Ukraine…) for up to 90 days. Spanish, Portuguese and Italian searches are
   100–1k a month each.
2. **Language course visa (§ 16f AufenthG):** daily intensive course, at least 18 lessons a week
   (CASA: 20; the FAQ says 20 a week for at least three months), up to 12 months, no extension;
   about 1,091 € a month in a blocked account (missions differ; check the mission), health
   insurance, the course paid in advance; up to 12 weeks at the mission. Only **3,240** first
   permits in Germany in 2025, **25 in Bremen** (BAMF). CASA sends the registration letter once
   the first course is paid, allows one free postponement up to 21 days before the start, and
   refunds minus 100 € on a refusal shown at least two weeks before the start (FAQ, AGB § 7).
3. **On the way to study or work:** students, nurses and doctors, the Opportunity Card; often
   come for the last levels or an exam. Largest groups of international students: India (59,000),
   China, Turkey, Iran, Syria (DAAD).

**Where ads reach** (StatCounter Sept 2026): Google ≥ 88 % in India, Nigeria, Egypt, Morocco,
Pakistan, Vietnam, Indonesia, Colombia, Mexico, Brazil, Ukraine, Syria (ads possible since Aug
2025); USA 85 %; Turkey 73 % (Yandex 25 %); South Korea 48 % (Naver 43 %). **No ads:** Iran,
Cuba, North Korea, Crimea and the occupied „DNR"/„LNR" (sanctions), Russia (paused since 2022),
China (Google ≈ 2 %).

**Plan:** Phase A (month 2), one English campaign in India, Pakistan, Nigeria, Egypt, Indonesia,
Vietnam and the USA, ad groups „German in Germany", „Intensive and visa", „Bremen", „Exams",
landing on a new English page „Learn German in Bremen" (course with dates and prices, who needs a
visa and what missions ask, with links to official pages, the registration letter, postponement and
refund rules, accommodation, placement test, steps from abroad, CASA as a non-profit). Phase B
(month 3+), Turkish (Turkey), Spanish (Spain, Mexico, Colombia), Portuguese (Brazil, Portugal),
Italian (Italy), each needing ads **and pages** in that language: Turkish, Spanish and Italian are
prepared machine translations (docs/TRANSLATIONS.md), not public; Portuguese is not prepared.

**Visa wording:** Google's „Government documents and official services" policy (tightened
2026-10-05) allows visa ads only from authorised providers. Never „visa service", „get your visa",
„guaranteed"; write „the registration letter for your visa application".

## Decisions pending (Rahman)

1. Measurement: way A (consent box + Data Manager list) with calls as backstop.
2. Who checks the consent wording and the privacy paragraph.
3. Call forwarding on the ads (a Google number that rings at CASA).
4. Ad texts and keywords: first the evening campaign (§First campaign), then the rest.
5. The English page „Learn German in Bremen" and the first countries.
6. Opening Turkish and Spanish on the site (after Phase A).

## Monthly check (from the first month with ads)

Account click rate ≥ 5 %; at least one conversion; Quality Score 1–2 keywords paused; search terms
report (new negatives, new keywords); the survey answered; Statistik and the workspace show the
leads; course pages still match the ads. Google publishes no average spend; agencies' figures are
not reliable.

## Account log

Newest last. One line per change in the account: date, who, what, paused or live.

- 2026-06: Google for Nonprofits approved CASA gGmbH (Goodstack). Ad Grants activation refused as
  too commercial (the old TYPO3 site).
- 2026-10-29: activation requested again from the new casa-bremen.de (Rahman).
- 2026-10-30: approved. Rahman, with Claude at his request: invitation accepted (r.shafiee@,
  administrator), payments profile 9486-6175-4118 and Google Ireland terms accepted. No campaigns,
  conversion actions or settings changed.
- 2026-10-31: this file made the brief for any agent (Claude). The live account was not re-checked.
- 2026-10-31: account settings checked, none changed (auto-tagging on, auto-apply off, call
  reporting on). Campaign „Deutsch am Abend – Bremen" (24423184939) built by Claude at Rahman's
  request; Rahman confirmed his identity and published it with start date 1 Dec 2026; Claude paused
  it at once, added ad groups 2 and 3, 33 negatives, 12 sitelinks, 20 callouts and the call asset,
  then set the start date to 31 Oct 2026. **Paused.**
- 2026-10-31: call reporting switched off at account level (Claude, at Rahman's request). Campaign
  „Deutsch intensiv – Bremen" (24412445946) built by Claude; Rahman published it with start date
  1 Dec 2026; Claude paused it at once, added the English ad group, 41 negatives, 8 sitelinks, 11
  callouts and the existing call asset, then set the start date to 31 Oct 2026. **Paused.**
- 2026-10-31: both campaigns switched on by Claude at Rahman's request. **Live**, status „Aktiv
  (eingeschränkt) · Nicht genug relevante Keywords" (Google wants more, looser keywords; kept tight
  on purpose for the click rate) and „Gebotsstrategie lernt"; ads in Google's review.
- 2026-11-01: checked, nothing changed. All five ads approved („Aktiv"); 42 of 49 keywords active,
  7 „Nicht aktiv · Geringes Suchvolumen" (Google switches them on by itself once people search
  them); 0 impressions on the first day. „Nicht genug relevante Keywords" stays: it is Google's
  advice to add looser keywords, not an error. Without conversions the campaigns bid on Maximize
  clicks under the grant's 2 USD cap, while Google's own estimate was 2.80–3.13 USD a click, so
  impressions stay thin until A1 lets them move to Maximize conversions.

## Sources

Google: grants/answer/117827 (compliance), nonprofits/answer/1332166 (budgets), 4410314 (keywords),
1657899 (website), 3215869 (eligibility), 9841491 (conversions), 9841727 (campaigns, Performance
Max), google-ads/answer/7684791 (responsive search ads), 7012522, 7014069, 15713840 (click
imports, Data Manager), 13802165 (consent), 10000067 (consent mode), 1722043 and 1722078
(location and language), 6163740 (countries), adspolicy/answer/6368711 and 17260489 (government
documents). DSK OH Digitale Dienste 1.2 (Nov 2024); EDPB Guidelines 2/2023 v2.0 (Oct 2024);
§ 16f AufenthG; missions in India and Jakarta (July 2026); BAMF Monitoring Bildungs- und
Erwerbsmigration 2025; DAAD Wissenschaft weltoffen 2025; StatCounter Sept 2026.
