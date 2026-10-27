import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { InboundChart } from '@/components/admin/inbound-chart';
import { ListEmpty, RecordName, Status } from '@/components/admin/list';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { activityColleagues, activityHref, describeActivity, recentActivity, type ActivityEntry } from '@/lib/admin/activity';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, pick, relativeDays, wsLocale, type Bilingual, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { getInboundByDay, getOverviewCounts, getRecentInbound } from '@/lib/admin/overview';
import { normaliseStatus, queueLabel, STATUS_LABELS, STATUS_TONES, type QueueEntity } from '@/lib/admin/queues';
import { activityIcon, Mark, StatePill } from '@/components/admin/record-parts';
import { cn } from '@/lib/utils';

/**
 * The full activity trail, as one feed.
 *
 * This screen exists to answer one question that FileMaker could not: *who
 * changed this, and when?* Not for surveillance — for the far more common case
 * of two people working the same queue and needing to know whether a lead has
 * already been answered.
 *
 * Grouped by day, because "what happened on Tuesday" is how people actually
 * ask. A flat list of 200 timestamps is technically the same information and
 * useless for that question. A section per day, as the inboxes read, and each
 * line in the record pages' timeline style (2026-10-15): the change's own mark,
 * who did what, a change of state as its two states in their colours, the time
 * at the right, the line a link to its record (docs/ADMIN_WORKSPACE.md §Lists).
 *
 * It also carries the two backward-looking panels that used to sit on the home
 * screen — what arrived most recently, and the fortnight's volume. Today is for
 * the day in front of you; this screen is the record of what has already
 * happened, and those two belong with the trail rather than above it.
 *
 * Activity is open to every colleague; job applications are not. Applicants'
 * names, and every link into an application, appear here only for someone who
 * holds the Applications module. The volume chart and counts stay whole: a
 * number is not a person.
 */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  const [user, { by }] = await Promise.all([requireModule('activity'), searchParams]);
  const { t, lang } = await getI18n();
  const includeApplications = canAccess(user, 'applications');
  // One colleague's changes, or everyone's: „who did what" is the question this screen answers.
  const colleague = by && /^[0-9a-f-]{36}$/i.test(by) ? by : null;

  const [entries, recent, inbound, counts, colleagues] = await Promise.all([
    recentActivity(200, { includeApplications, staffUserId: colleague }),
    getRecentInbound(8, { includeApplications }),
    getInboundByDay(14),
    getOverviewCounts(),
    activityColleagues(),
  ]);

  const weekDelta = counts.inboundThisWeek - counts.inboundPreviousWeek;

  const byDay = new Map<string, typeof entries>();

  for (const entry of entries) {
    const key = new Date(entry.createdAt).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }

  return (
    <>
      <PageHeader
        title={t('Aktivität', 'Activity')}
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title={t('Gerade eingegangen', 'Just arrived')} icon={Icon.enquiries} tint="ink" bleed>
          {recent.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--casa-text-subtle)]">{t('Noch ist nichts eingegangen.', 'Nothing has come in yet.')}</p>
          ) : (
            <Table
              head={[
                t('Von', 'From'),
                { label: t('Status', 'Status'), className: 'hidden w-[8.5rem] md:table-cell' },
                { label: t('Eingegangen', 'Received'), className: 'w-[7.5rem]' },
              ]}
            >
              {recent.map((item) => {
                const status = normaliseStatus(item.status);
                return (
                  <TableRow key={`${item.kind}-${item.id}`} interactive>
                    <Cell href={item.href} className="max-w-0">
                      <RecordName
                        name={item.name || t('Kein Name angegeben', 'No name given')}
                        about={[INBOUND_LABELS[item.kind] ? pick(lang, INBOUND_LABELS[item.kind]) : null, item.summary]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    </Cell>
                    <Cell className="hidden md:table-cell">
                      <Status tone={STATUS_TONES[status]}>{pick(lang, STATUS_LABELS[status])}</Status>
                    </Cell>
                    <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                      {capitalise(relativeDays(item.at, lang))}
                    </Cell>
                  </TableRow>
                );
              })}
            </Table>
          )}
        </Card>

        <Card
          title={t('Eingang, letzte zwei Wochen', 'Inbound, last fortnight')}
          icon={Icon.overview}
          tint="blue"
          footer={
            <p className="text-xs text-[var(--casa-text-subtle)]">
              <span className="font-semibold text-[var(--casa-ink)]">
                {t(`${counts.inboundThisWeek} diese Woche`, `${counts.inboundThisWeek} this week`)}
              </span>
              {' · '}
              {weekDelta === 0
                ? t('so viel wie in der Woche davor', 'level with the week before')
                : t(
                    `${Math.abs(weekDelta)} ${weekDelta > 0 ? 'mehr' : 'weniger'} als in der Woche davor`,
                    `${Math.abs(weekDelta)} ${weekDelta > 0 ? 'more' : 'fewer'} than the week before`
                  )}
            </p>
          }
        >
          <InboundChart days={inbound} lang={lang} />
        </Card>
      </div>

      {colleagues.length > 1 ? (
        <nav aria-label={t('Von wem', 'By whom')} className="mb-5 flex flex-wrap gap-1.5">
          {[{ id: null, name: t('Alle', 'Everyone') }, ...colleagues].map((c) => (
            <Link
              key={c.id ?? 'all'}
              href={c.id ? `/admin/activity?by=${c.id}` : '/admin/activity'}
              aria-current={colleague === c.id ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1 text-[0.8rem] font-semibold ring-1 ring-inset',
                colleague === c.id ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[#2b3546] ring-ws-line hover:bg-[var(--ws-row-hover)]'
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
          <ListEmpty title={t('Noch wurde nichts bearbeitet', 'Nothing has been worked yet')} />
        </div>
      ) : (
        <div className="space-y-7">
          {[...byDay.entries()].map(([day, dayEntries]) => (
            <section key={day} aria-label={dayLabel(new Date(day), lang)}>
              <header className="sticky top-0 z-10 -mx-1 mb-2.5 flex items-baseline gap-2.5 bg-ws-canvas/90 px-1 py-1.5 backdrop-blur-sm lg:top-14">
                <h2 className="text-[0.95rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">{dayLabel(new Date(day), lang)}</h2>
                <span className="ml-auto text-xs font-semibold text-[var(--casa-muted)] tabular-nums">
                  {dayEntries.length === 1 ? t('1 Änderung', '1 change') : t(`${dayEntries.length} Änderungen`, `${dayEntries.length} changes`)}
                </span>
              </header>
              <ul className="divide-y divide-ws-line-soft overflow-hidden rounded-3xl border border-ws-card-line bg-white shadow-ws-card">
                {runsOf(dayEntries, lang).map(({ entry, count, earliest }) => {
                  const href = activityHref(entry);
                  const time = clock(entry.createdAt, lang);
                  const from = clock(earliest, lang);
                  const who = entry.staffName ?? t('Jemand', 'Someone');
                  const detail = entry.detail ?? {};
                  const statusChange = entry.action === 'status_changed' && typeof detail.to === 'string';
                  const subject = isQueue(entry.entity) ? queueLabel(entry.entity, lang) : null;

                  const line = (
                    <span className="flex items-start gap-3 px-5 py-3">
                      <Mark className="bg-white text-[var(--casa-muted)] ring-[#d3dbe6]">{activityIcon(entry)}</Mark>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block text-[0.86rem] leading-snug text-[#3c4657]">
                          <span className="font-semibold text-[var(--casa-ink)]">{who}</span>{' '}
                          {statusChange && subject
                            ? t(`hat den Status geändert · ${subject}`, `changed the status · ${subject}`)
                            : describeActivity(entry, lang)}
                          {count > 1 ? (
                            <span className="ml-2 text-xs whitespace-nowrap text-[var(--casa-muted)]">
                              {t(`${count}-mal${from !== time ? `, ab ${from}` : ''}`, `${count} times${from !== time ? `, from ${from}` : ''}`)}
                            </span>
                          ) : null}
                        </span>
                        {statusChange && subject ? (
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {typeof detail.from === 'string' ? (
                              <>
                                <StatePill status={normaliseStatus(detail.from)} lang={lang} />
                                <span aria-hidden="true" className="text-[var(--casa-muted)] [&_svg]:size-3">
                                  {Icon.chevronRight}
                                </span>
                              </>
                            ) : null}
                            <StatePill status={normaliseStatus(String(detail.to))} lang={lang} />
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 pt-0.5 text-xs text-[var(--casa-muted)] tabular-nums">{time}</span>
                    </span>
                  );

                  return (
                    <li key={entry.id}>
                      {href ? (
                        <Link href={href} className="block transition-colors outline-none hover:bg-[var(--ws-row-hover)] focus-visible:bg-[var(--ws-row-hover)]">
                          {line}
                        </Link>
                      ) : (
                        line
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

const QUEUES = new Set<string>(['enquiry', 'registration', 'course_registration', 'exam_registration', 'career_application']);
const isQueue = (entity: string): entity is QueueEntity => QUEUES.has(entity);

/**
 * The same thing done again and again in a row — a week saved four times in
 * Kursplanung — is one line with how often, not four: the newest, counted.
 */
function runsOf(entries: readonly ActivityEntry[], lang: WsLang) {
  const runs: { entry: ActivityEntry; count: number; earliest: Date | string }[] = [];
  const same = (a: ActivityEntry, b: ActivityEntry) =>
    a.staffName === b.staffName &&
    a.entity === b.entity &&
    a.entityId === b.entityId &&
    describeActivity(a, lang) === describeActivity(b, lang);
  for (const entry of entries) {
    const last = runs[runs.length - 1];
    if (last && same(last.entry, entry)) {
      last.count += 1;
      last.earliest = entry.createdAt;
    } else runs.push({ entry, count: 1, earliest: entry.createdAt });
  }
  return runs;
}

const clock = (at: Date | string, lang: WsLang) =>
  new Date(at).toLocaleTimeString(wsLocale(lang), { hour: '2-digit', minute: '2-digit' });

/** "Today", "Yesterday", "Tue 6 Oct" ("Heute", "Gestern", "Di., 6. Okt."); the year only when it is not this one. */
function dayLabel(day: Date, lang: WsLang): string {
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(day).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return lang === 'de' ? 'Heute' : 'Today';
  if (days === 1) return lang === 'de' ? 'Gestern' : 'Yesterday';
  return day.toLocaleDateString(wsLocale(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: day.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

const INBOUND_LABELS: Record<string, Bilingual> = {
  enquiry: { de: 'Anfrage', en: 'Enquiry' },
  course: { de: 'Kursanmeldung', en: 'Course registration' },
  exam: { de: 'Prüfungsanmeldung', en: 'Exam registration' },
  application: { de: 'Bewerbung', en: 'Job application' },
};
