# Google Ads: the Ad Grants account

CASA's free Google search ads: what the grant is, its rules, how sign-ups are measured, and the
campaigns. Checked 2026-10-30. The same plan as a 13-page PDF for Rahman:
`~/Downloads/CASA-site/output/ad-grants/CASA-Ad-Grants-Plan.pdf` (not in git). Eligibility and the
website requirements are in docs/GOOGLE_AD_GRANTS_COMPLIANCE.md.

## State

- **Approved 2026-10-30.** Google Ads account **343-341-7137**, „CASA - Internationale
  Sprachschule gemeinnützige GmbH", currency USD. r.shafiee@ accepted the invitation as
  administrator, accepted the payments profile 9486-6175-4118 (administrator and primary contact)
  and the Google Ireland advertising terms the same day. Billing says „Wir stellen das nicht in
  Rechnung".
- **Nothing runs yet:** no campaign, no conversion action, no tracking.
- **Decisions pending with Rahman** (below). Nothing in the account changes without his go.
- Ad Grants never asks for card details. If Google Ads asks for one, it is the wrong account:
  check the number at the top right.

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
Visa and FAQ, Accommodation, Our non-profit work). Callouts: Gemeinnützig seit 1983, Über 150
Herkunftsländer, Mitten in Bremen (EN: Non-profit since 1983, From 150+ countries).

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
4. Ad texts and keywords above.
5. The English page „Learn German in Bremen" and the first countries.
6. Opening Turkish and Spanish on the site (after Phase A).

## Monthly check (from the first month with ads)

Account click rate ≥ 5 %; at least one conversion; Quality Score 1–2 keywords paused; search terms
report (new negatives, new keywords); the survey answered; Statistik and the workspace show the
leads; course pages still match the ads. Google publishes no average spend; agencies' figures are
not reliable.

## Sources

Google: grants/answer/117827 (compliance), nonprofits/answer/1332166 (budgets), 4410314 (keywords),
1657899 (website), 3215869 (eligibility), 9841491 (conversions), 9841727 (campaigns, Performance
Max), google-ads/answer/7684791 (responsive search ads), 7012522, 7014069, 15713840 (click
imports, Data Manager), 13802165 (consent), 10000067 (consent mode), 1722043 and 1722078
(location and language), 6163740 (countries), adspolicy/answer/6368711 and 17260489 (government
documents). DSK OH Digitale Dienste 1.2 (Nov 2024); EDPB Guidelines 2/2023 v2.0 (Oct 2024);
§ 16f AufenthG; missions in India and Jakarta (July 2026); BAMF Monitoring Bildungs- und
Erwerbsmigration 2025; DAAD Wissenschaft weltoffen 2025; StatCounter Sept 2026.
