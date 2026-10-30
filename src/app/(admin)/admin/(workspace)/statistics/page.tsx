import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { ListEmpty } from '@/components/admin/list';
import { ButtonLink, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { requireModule } from '@/lib/admin/guard';
import { wsLocale, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  campaigns,
  displayedLanguages,
  registrationMetrics,
  registrationDeliveryReview,
  languages,
  leads,
  registrants,
  siteTotals,
  sources,
  STAT_RANGES,
  topPages,
  viewsByDay,
  visitorCountries,
  type AgeGroup,
  type LeadKind,
  type StatRange,
} from '@/lib/admin/site-stats';
import { cn } from '@/lib/utils';

/**
 * The website's statistics (2026-10-29): visits, the pages they start on, where readers come from,
 * their browsers' languages and campaigns, counted on the server from page loads without cookies or
 * scripts (migrations 0106, 0108, docs/SEO_AND_GEO.md §Statistics); what came in through the website,
 * and the ages and nationalities of those who registered, counted from the workspace's records. What
 * people searched for, rankings and real readers' load times (Core Web Vitals) are Google's and
 * Bing's to tell: the two buttons open Search Console and Bing Webmaster Tools.
 */
export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const [, { range: requested }] = await Promise.all([requireModule('website'), searchParams]);
  const { t, lang } = await getI18n();
  const range: StatRange = STAT_RANGES.find((days) => String(days) === requested) ?? 30;

  const [totals, days, pages, origins, spoken, tagged, received, registered, places, displayed, metrics, delivery] = await Promise.all([
    siteTotals(range),
    viewsByDay(range),
    topPages(range),
    sources(range),
    languages(range),
    campaigns(range),
    leads(range),
    registrants(range),
    visitorCountries(range),
    displayedLanguages(range),
    registrationMetrics(range),
    registrationDeliveryReview(),
  ]);
  const number = (value: number) => new Intl.NumberFormat(wsLocale(lang)).format(value);
  const fromSearch = origins.filter((o) => o.kind === 'search').reduce((total, o) => total + o.visits, 0);
  const fromAi = origins.filter((o) => o.kind === 'ai').reduce((total, o) => total + o.visits, 0);
  const languageName = new Intl.DisplayNames([wsLocale(lang)], { type: 'language' });
  const countryName = new Intl.DisplayNames([wsLocale(lang)], { type: 'region' });
  const peakAge = Math.max(1, ...registered.ages.map((age) => age.count));

  return (
    <>
      <PageHeader
        title={t('Statistik', 'Statistics')}
        actions={
          <>
            <ButtonLink href="https://search.google.com/search-console?resource_id=sc-domain%3Acasa-bremen.de" variant="secondary" plain>
              Google Search Console {Icon.external}
            </ButtonLink>
            <ButtonLink href="https://www.bing.com/webmasters/home?siteUrl=https%3A%2F%2Fcasa-bremen.de%2F" variant="secondary" plain>
              Bing Webmaster Tools {Icon.external}
            </ButtonLink>
          </>
        }
      />

      <nav aria-label={t('Zeitraum', 'Period')} className="mb-4 flex gap-1.5">
        {STAT_RANGES.map((days) => (
          <Link
            key={days}
            href={days === 30 ? '/admin/statistics' : `/admin/statistics?range=${days}`}
            aria-current={range === days ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1 text-[0.8rem] font-semibold ring-1 ring-inset',
              range === days ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[#2b3546] ring-ws-line hover:bg-[var(--ws-row-hover)]'
            )}
          >
            {t(`${days} Tage`, `${days} days`)}
          </Link>
        ))}
      </nav>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Figure label={t('Geschätzte Besuche', 'Estimated visits')} value={number(totals.visits)} />
        <Figure label={t('Kursanmeldungen', 'Course registrations')} value={number(received.find((r) => r.kind === 'course')?.count ?? 0)} />
        <Figure label={t('Prüfungsanmeldungen', 'Exam registrations')} value={number(received.find((r) => r.kind === 'exam')?.count ?? 0)} />
        <Figure label={t('Vom Handy', 'On a phone')} value={`${Math.round(totals.mobileShare * 100)} %`} />
      </div>
      <p className="mb-4 text-sm text-[var(--casa-text-subtle)]">{t('Besuche sind geschätzte Seitenaufrufe beim Einstieg, keine einzelnen Personen. Interne Navigation wird nicht vollständig erfasst.', 'Visits are estimated landing-page loads, not individual people. Navigation within the site is not fully counted.')}</p>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {(['course', 'exam'] as const).map((form) => {
          const count = (event: string, step?: string) => metrics.filter((m) => m.form === form && m.event === event && (!step || m.step === step)).reduce((n, m) => n + m.count, 0);
          const submitted = received.find((r) => r.kind === form)?.count ?? 0;
          return <Card key={form} title={form === 'course' ? t('Kursanmeldung: Schritte', 'Course registration: steps') : t('Prüfungsanmeldung: Schritte', 'Exam registration: steps')} icon={Icon.overview} tint="blue">
            <p className="mb-3 text-sm text-[var(--casa-text-subtle)]">{t('Anonyme Ereignisse, keine verknüpften Personen: wiederholte Besuche und fehlende Ereignisse sind möglich. Keine Conversion-Rate.', 'Anonymous event counts, not linked people: repeat visits and missed events are possible. These are not conversion rates.')}</p>
            <dl className="grid gap-2 text-sm">
              {[
                [t('Formular angezeigt', 'Form shown'), count('shown')],
                [t('Formular begonnen', 'Form started'), count('started')],
                [t('Auswahl abgeschlossen', 'Choice completed'), count('choice_completed')],
                [t('Details abgeschlossen', 'Details completed'), count('details_completed')],
                [t('Anmeldungen gespeichert', 'Registrations saved'), submitted],
                [t('Prüffehler: Auswahl', 'Validation errors: choice'), count('validation_error', 'choice')],
                [t('Prüffehler: Details', 'Validation errors: details'), count('validation_error', 'details')],
                [t('Fehler beim Senden', 'Submission errors'), count('submit_error')],
              ].map(([label, value]) => <div key={String(label)} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold tabular-nums">{Number(value) === 0 && process.env.REGISTRATION_METRICS !== 'enabled' && label !== t('Anmeldungen gespeichert', 'Registrations saved') ? '–' : number(Number(value))}</dd></div>)}
            </dl>
            {count('validation_error') >= 10 && <div className="mt-4 border-t border-ws-line pt-3 text-sm">
              <p className="mb-2 font-semibold">{t('Häufige Fehlerkategorien', 'Common error categories')}</p>
              {([
                ['level', t('Niveau', 'Level')], ['date', t('Termin', 'Date')], ['choice', t('Auswahl', 'Choice')],
                ['contact', t('Kontaktangaben', 'Contact details')], ['personal', t('Persönliche Angaben', 'Personal details')],
                ['terms', t('Bedingungen', 'Terms')], ['other', t('Andere Angaben', 'Other details')],
              ] as const).map(([category, label]) => {
                const value = metrics.filter((m) => m.form === form && m.event === 'validation_error' && m.category === category).reduce((n, m) => n + m.count, 0);
                return value >= 10 ? <p key={category}>{label}: <strong>{number(value)}</strong></p> : null;
              })}
              <p className="mt-1 text-[var(--casa-text-subtle)]">{t('Nur Kategorien mit mindestens 10 Fehlern; jeder Versuch kann mehrfach zählen.', 'Only categories with at least 10 errors; repeated attempts can be counted.')}</p>
            </div>}
            {count('submit_error') >= 10 && <div className="mt-3 text-sm">{(['network', 'server'] as const).map((category) => {
              const value = metrics.filter((m) => m.form === form && m.event === 'submit_error' && m.category === category).reduce((n, m) => n + m.count, 0);
              return value >= 10 ? <p key={category}>{category === 'network' ? t('Netzwerkfehler', 'Network errors') : t('Server- oder sonstige Fehler', 'Server or other errors')}: <strong>{number(value)}</strong></p> : null;
            })}</div>}
            {count('shown') >= 10 && <div className="mt-4 border-t border-ws-line pt-3 text-sm">
              <p className="mb-2 font-semibold">{t('Begonnene Formulare nach Sprache und Gerät', 'Forms started by language and device')}</p>
              <p className="mb-2 text-[var(--casa-text-subtle)]">{t('Kleine Gruppen unter 10 Ereignissen werden nicht angezeigt.', 'Small groups with fewer than 10 events are hidden.')}</p>
              {(['de', 'en'] as const).flatMap((locale) => (['mobile', 'tablet', 'desktop'] as const).map((device) => {
                const started = metrics.filter((m) => m.form === form && m.locale === locale && m.device === device && m.event === 'started').reduce((n, m) => n + m.count, 0);
                if (started < 10) return null;
                const deviceLabel = device === 'mobile' ? t('Handy', 'Phone') : device === 'tablet' ? 'Tablet' : t('Computer', 'Computer');
                const completed = metrics.filter((m) => m.form === form && m.locale === locale && m.device === device && m.event === 'details_completed').reduce((n, m) => n + m.count, 0);
                const errors = metrics.filter((m) => m.form === form && m.locale === locale && m.device === device && m.event === 'validation_error').reduce((n, m) => n + m.count, 0);
                const safeCount = (n: number) => n < 10 ? '<10' : number(n);
                return <p key={`${locale}-${device}`}>{locale === 'de' ? t('Deutsch', 'German') : t('Englisch', 'English')} · {deviceLabel}: <strong>{number(started)}</strong> {t('begonnen', 'started')} · {safeCount(completed)} {t('Details abgeschlossen', 'details completed')} · {safeCount(errors)} {t('Prüffehler', 'validation errors')}</p>;
              }))}
            </div>}
            {process.env.REGISTRATION_METRICS !== 'enabled' && <p className="mt-3 text-sm text-[var(--casa-text-subtle)]">{t('Schrittmessung ist nicht aktiviert; gespeicherte Anmeldungen werden trotzdem angezeigt.', 'Step measurement is not enabled; saved registrations are still shown.')}</p>}
          </Card>;
        })}
      </div>
      <Card title={t('E-Mail-Zustellung prüfen', 'Email delivery needs review')} icon={Icon.enquiries} tint="blue" className="mb-4">
        <p className="text-sm">{t('Offene Prüfhinweise insgesamt (unabhängig vom Zeitraum):', 'Open review flags in total (not limited to the selected period):')} {t('Bestätigung an Anmeldende', 'Applicant acknowledgement')}: <strong>{number(delivery.registration_receipt_unconfirmed ?? 0)}</strong> · {t('Benachrichtigung an CASA', 'CASA notification')}: <strong>{number(delivery.registration_staff_notice_unconfirmed ?? 0)}</strong></p>
        <p className="mt-1 text-sm text-[var(--casa-text-subtle)]">{t('Ein Hinweis bedeutet unbestätigt, nicht zwingend fehlgeschlagen. Annahme durch den Anbieter bestätigt nicht den Posteingang.', 'A flag means unconfirmed, not necessarily failed. Provider acceptance does not guarantee inbox delivery.')}</p>
      </Card>

      <Card title={t('Besuche pro Tag', 'Visits per day')} icon={Icon.overview} tint="blue" className="mb-4">
        <DayBars days={days} lang={lang} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card title={t('Einstiegsseiten', 'Landing pages')} icon={Icon.website} tint="ink" bleed>
          {pages.length === 0 ? (
            <ListEmpty title={t('Noch keine Besuche', 'No visits yet')} />
          ) : (
            <Table
              head={[
                t('Seite', 'Page'),
                { label: t('Besuche', 'Visits'), align: 'right' },
                { label: t('Geöffnet', 'Opened'), align: 'right', className: 'hidden sm:table-cell' },
              ]}
            >
              {pages.map((page) => (
                <TableRow key={page.path}>
                  <Cell className="max-w-0">
                    <a
                      href={`https://casa-bremen.de${page.path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-[var(--casa-ink)] hover:underline"
                    >
                      {page.path}
                    </a>
                  </Cell>
                  <Cell align="right" className="tabular-nums">{number(page.entries)}</Cell>
                  <Cell align="right" className="hidden tabular-nums sm:table-cell">{number(page.views)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        <div className="grid gap-4">
        <Card
          title={t('Herkunft', 'Where readers come from')}
          description={t(`${number(fromSearch)} über Suchmaschinen · ${number(fromAi)} über KI-Assistenten`, `${number(fromSearch)} from search engines · ${number(fromAi)} from AI assistants`)}
          icon={Icon.globe}
          tint="green"
          bleed
        >
          {origins.length === 0 ? (
            <ListEmpty title={t('Noch keine Besuche', 'No visits yet')} />
          ) : (
            <Table head={[t('Quelle', 'Source'), { label: t('Besuche', 'Visits'), align: 'right' }]}>
              {origins.slice(0, 12).map((origin) => (
                <TableRow key={origin.host ?? 'direct'}>
                  <Cell className="max-w-0">
                    <span className="block truncate">{origin.host ?? t('Direkt oder Lesezeichen', 'Direct or bookmark')}</span>
                    {origin.kind === 'search' || origin.kind === 'ai' ? (
                      <span className="text-xs text-[var(--casa-muted)]">
                        {origin.kind === 'search' ? t('Suchmaschine', 'Search engine') : t('KI-Assistent', 'AI assistant')}
                      </span>
                    ) : null}
                  </Cell>
                  <Cell align="right" className="tabular-nums">{number(origin.visits)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        {tagged.length > 0 ? (
          <Card title={t('Kampagnen', 'Campaigns')} icon={Icon.flag} tint="sun" bleed>
            <Table head={[t('Kampagne', 'Campaign'), { label: t('Besuche', 'Visits'), align: 'right' }]}>
              {tagged.map((row) => (
                <TableRow key={row.campaign}>
                  <Cell className="max-w-0">
                    <span className="block truncate">{row.campaign}</span>
                  </Cell>
                  <Cell align="right" className="tabular-nums">{number(row.visits)}</Cell>
                </TableRow>
              ))}
            </Table>
          </Card>
        ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card title={t('Über die Website eingegangen', 'Received through the website')} icon={Icon.enquiries} tint="blue" bleed>
          {received.length === 0 ? (
            <ListEmpty title={t('Noch nichts eingegangen', 'Nothing received yet')} />
          ) : (
            <Table head={[t('Art', 'Kind'), { label: t('Anzahl', 'Number'), align: 'right' }]}>
              {received.map((row) => (
                <TableRow key={row.kind}>
                  <Cell>{LEAD_LABELS[row.kind][lang]}</Cell>
                  <Cell align="right" className="tabular-nums">{number(row.count)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        <div className="grid gap-4">
        <Card
          title={t('Länder der Besucher', 'Visitors’ countries')}
          icon={Icon.globe}
          tint="sun"
          bleed
          footer={
            <p className="text-xs text-[var(--casa-muted)]">
              <a href="https://db-ip.com" target="_blank" rel="noreferrer" className="hover:underline">
                {t('IP-Geolokalisierung von DB-IP', 'IP geolocation by DB-IP')}
              </a>
            </p>
          }
        >
          {places.length === 0 ? (
            <ListEmpty title={t('Noch keine Besuche', 'No visits yet')} />
          ) : (
            <Table head={[t('Land', 'Country'), { label: t('Besuche', 'Visits'), align: 'right' }]}>
              {places.map((row) => (
                <TableRow key={row.country}>
                  <Cell>{countryName.of(row.country) ?? row.country}</Cell>
                  <Cell align="right" className="tabular-nums">{number(row.visits)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        <Card title={t('Sprachen der Besucher', 'Visitors’ languages')} icon={Icon.book} tint="ink" bleed>
          {spoken.length === 0 ? (
            <ListEmpty title={t('Noch keine Besuche', 'No visits yet')} />
          ) : (
            <Table head={[t('Sprache des Browsers', 'Browser language'), { label: t('Besuche', 'Visits'), align: 'right' }]}>
              {spoken.map((row) => (
                <TableRow key={row.language}>
                  <Cell>{languageName.of(row.language) ?? row.language}</Cell>
                  <Cell align="right" className="tabular-nums">{number(row.visits)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
        </div>
      </div>

      <Card title={t('Angezeigte Website-Sprache', 'Displayed website language')} icon={Icon.book} tint="ink" className="mt-4">
        <p className="mb-2 text-sm text-[var(--casa-text-subtle)]">{t('Sprache der geschätzten Einstiegsaufrufe; unterscheidet sich von der Browsersprache und erfasst nicht jede interne Navigation.', 'Language of estimated landing-page loads; distinct from browser language and does not include every in-site navigation.')}</p>
        {displayed.length ? <ul className="space-y-1 text-sm">{displayed.map((row) => <li key={row.locale}>{languageName.of(row.locale) ?? row.locale}: <strong>{number(row.count)}</strong></li>)}</ul> : <p className="text-sm">{t('Noch keine Aufrufe', 'No page loads yet')}</p>}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card title={t('Alter bei der Anmeldung', 'Age when registering')} icon={Icon.person} tint="green">
          {registered.ages.every((age) => age.count === 0) ? (
            <p className="text-sm text-[var(--casa-text-subtle)]">{t('Noch keine Anmeldungen', 'No registrations yet')}</p>
          ) : (
            <ul className="grid gap-2.5">
              {registered.ages.map((age) => (
                <li key={age.group} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                  <span className="text-[var(--casa-text-subtle)]">{AGE_LABELS[age.group][lang]}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-ws-line">
                    {age.count ? (
                      <span
                        className="block h-full rounded-full bg-[var(--casa-accent-surface)]"
                        style={{ width: `${Math.max((age.count / peakAge) * 100, 3)}%` }}
                      />
                    ) : null}
                  </span>
                  <span className="text-right font-semibold text-[var(--casa-ink)] tabular-nums">{number(age.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('Nationalitäten der Angemeldeten', 'Nationalities of those registering')} icon={Icon.globe} tint="red" bleed>
          {registered.nationalities.length === 0 ? (
            <ListEmpty title={t('Noch keine Anmeldungen', 'No registrations yet')} />
          ) : (
            <Table head={[t('Nationalität', 'Nationality'), { label: t('Anmeldungen', 'Registrations'), align: 'right' }]}>
              {registered.nationalities.map((row) => (
                <TableRow key={row.code ?? row.raw ?? ''}>
                  <Cell>{row.code ? (countryName.of(row.code) ?? row.code) : row.raw}</Cell>
                  <Cell align="right" className="tabular-nums">{number(row.count)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

const LEAD_LABELS: Record<LeadKind, { de: string; en: string }> = {
  course: { de: 'Kursanmeldungen', en: 'Course registrations' },
  exam: { de: 'Prüfungsanmeldungen', en: 'Exam registrations' },
  'enquiry:general': { de: 'Anfragen über das Kontaktformular', en: 'Enquiries through the contact form' },
  'enquiry:group': { de: 'Gruppenanfragen', en: 'Group enquiries' },
  'enquiry:company': { de: 'Firmenanfragen', en: 'Company enquiries' },
  'enquiry:tandem': { de: 'Sprachtandem', en: 'Language tandem' },
  'enquiry:interest': { de: 'Interesse an Pflege und Medizin', en: 'Interest in nursing and medicine' },
  'appointment:placement': { de: 'Einstufungstermine', en: 'Placement appointments' },
  'appointment:group_consultation': { de: 'Beratungstermine für Gruppen', en: 'Group consultations' },
  'appointment:consultation': { de: 'Beratungstermine', en: 'Consultations' },
  'appointment:other': { de: 'Andere Termine', en: 'Other appointments' },
  application: { de: 'Bewerbungen', en: 'Job applications' },
};

const AGE_LABELS: Record<AgeGroup, { de: string; en: string }> = {
  under18: { de: 'unter 18', en: 'under 18' },
  '18-24': { de: '18–24', en: '18–24' },
  '25-34': { de: '25–34', en: '25–34' },
  '35-44': { de: '35–44', en: '35–44' },
  '45-54': { de: '45–54', en: '45–54' },
  '55+': { de: '55 und älter', en: '55 and over' },
};

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-ws-card-line bg-white px-5 py-4 shadow-ws-card">
      <p className="text-xs font-medium text-[var(--casa-text-subtle)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-[var(--casa-ink)] tabular-nums">{value}</p>
    </div>
  );
}

function DayBars({ days, lang }: { days: readonly { day: Date; count: number }[]; lang: WsLang }) {
  const peak = Math.max(4, ...days.map((d) => d.count));
  const format = new Intl.DateTimeFormat(wsLocale(lang), { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {days.map((entry) => (
          <div
            key={new Date(entry.day).toISOString()}
            title={`${format.format(new Date(entry.day))}: ${entry.count}`}
            className="flex-1 rounded-t-[3px] bg-[var(--casa-accent-surface)]"
            style={{ height: `${entry.count ? Math.max((entry.count / peak) * 100, 3) : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--casa-muted)]">
        <span>{days[0] ? format.format(new Date(days[0].day)) : ''}</span>
        <span>{days.at(-1) ? format.format(new Date(days.at(-1)!.day)) : ''}</span>
      </div>
    </div>
  );
}
